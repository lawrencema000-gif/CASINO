-- ============================================
-- FORTUNA CASINO Migration V6: Fraud & Trust System
-- Date: 2026-03-17
-- ============================================

BEGIN;

-- ============================================
-- 1. DEVICE FINGERPRINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT UNIQUE NOT NULL,
  user_agent TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  platform TEXT,
  canvas_hash TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_fp_hash ON public.device_fingerprints(fingerprint_hash);

-- ============================================
-- 2. USER-DEVICE LINK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_device_links (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fingerprint_id UUID NOT NULL REFERENCES public.device_fingerprints(id) ON DELETE CASCADE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, fingerprint_id)
);

CREATE INDEX IF NOT EXISTS idx_udl_user ON public.user_device_links(user_id);
CREATE INDEX IF NOT EXISTS idx_udl_fingerprint ON public.user_device_links(fingerprint_id);

-- RLS
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_device_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access device_fingerprints"
  ON public.device_fingerprints FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access user_device_links"
  ON public.user_device_links FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 3. FRAUD FLAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN (
    'multi_account', 'bonus_abuse', 'stolen_card', 'bot_play',
    'rapid_betting', 'suspicious_login', 'chargeback',
    'balance_anomaly', 'promo_abuse', 'collusion', 'other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  evidence JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'investigating', 'confirmed', 'false_positive', 'resolved')),
  reviewed_by UUID REFERENCES public.profiles(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  auto_action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access fraud_flags"
  ON public.fraud_flags FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_fraud_flags_user ON public.fraud_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON public.fraud_flags(status);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_severity ON public.fraud_flags(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_created ON public.fraud_flags(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_type ON public.fraud_flags(flag_type);

-- ============================================
-- 4. RISK SCORES (cached per user)
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'normal'
  CHECK (risk_level IN ('normal', 'elevated', 'high', 'critical'));

-- ============================================
-- 5. MULTI-ACCOUNT DETECTION VIEW
-- ============================================
-- Returns device fingerprints shared by multiple users
CREATE OR REPLACE VIEW public.multi_account_devices AS
SELECT
  fp.id AS fingerprint_id,
  fp.fingerprint_hash,
  fp.platform,
  fp.user_agent,
  COUNT(DISTINCT udl.user_id) AS account_count,
  ARRAY_AGG(DISTINCT udl.user_id) AS user_ids,
  MAX(udl.last_seen_at) AS last_seen
FROM public.device_fingerprints fp
JOIN public.user_device_links udl ON udl.fingerprint_id = fp.id
GROUP BY fp.id, fp.fingerprint_hash, fp.platform, fp.user_agent
HAVING COUNT(DISTINCT udl.user_id) > 1;

-- ============================================
-- 6. REGISTER DEVICE RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.register_device(
  p_user_id UUID,
  p_fingerprint_hash TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_screen_resolution TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL,
  p_language TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_canvas_hash TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_fp_id UUID;
  v_shared_count INTEGER;
  v_shared_users UUID[];
BEGIN
  -- Upsert device fingerprint
  INSERT INTO public.device_fingerprints (
    fingerprint_hash, user_agent, screen_resolution,
    timezone, language, platform, canvas_hash
  ) VALUES (
    p_fingerprint_hash, p_user_agent, p_screen_resolution,
    p_timezone, p_language, p_platform, p_canvas_hash
  )
  ON CONFLICT (fingerprint_hash) DO UPDATE
    SET last_seen_at = now(),
        user_agent = COALESCE(EXCLUDED.user_agent, device_fingerprints.user_agent)
  RETURNING id INTO v_fp_id;

  -- Upsert user-device link
  INSERT INTO public.user_device_links (user_id, fingerprint_id)
  VALUES (p_user_id, v_fp_id)
  ON CONFLICT (user_id, fingerprint_id) DO UPDATE
    SET last_seen_at = now();

  -- Check for multi-account usage
  SELECT COUNT(DISTINCT user_id), ARRAY_AGG(DISTINCT user_id)
  INTO v_shared_count, v_shared_users
  FROM public.user_device_links
  WHERE fingerprint_id = v_fp_id;

  -- Auto-flag if 2+ accounts share this device
  IF v_shared_count >= 2 THEN
    -- Only create flag if one doesn't already exist for this combo
    INSERT INTO public.fraud_flags (user_id, flag_type, severity, evidence, auto_action_taken)
    SELECT
      p_user_id,
      'multi_account',
      CASE
        WHEN v_shared_count >= 4 THEN 'critical'
        WHEN v_shared_count >= 3 THEN 'high'
        ELSE 'medium'
      END,
      jsonb_build_object(
        'fingerprint_hash', p_fingerprint_hash,
        'shared_with_users', v_shared_users,
        'account_count', v_shared_count,
        'detected_at', now()
      ),
      CASE WHEN v_shared_count >= 4 THEN 'auto_suspended' ELSE NULL END
    WHERE NOT EXISTS (
      SELECT 1 FROM public.fraud_flags
      WHERE user_id = p_user_id
        AND flag_type = 'multi_account'
        AND status IN ('pending', 'investigating')
    );

    -- Auto-suspend if 4+ accounts on same device
    IF v_shared_count >= 4 THEN
      UPDATE public.profiles
      SET status = 'suspended'
      WHERE id = p_user_id AND status = 'verified';
    END IF;

    -- Update risk score
    UPDATE public.profiles
    SET risk_score = LEAST(100, risk_score + (v_shared_count * 10)),
        risk_level = CASE
          WHEN LEAST(100, risk_score + (v_shared_count * 10)) >= 76 THEN 'critical'
          WHEN LEAST(100, risk_score + (v_shared_count * 10)) >= 51 THEN 'high'
          WHEN LEAST(100, risk_score + (v_shared_count * 10)) >= 26 THEN 'elevated'
          ELSE 'normal'
        END
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'fingerprint_id', v_fp_id,
    'shared_accounts', v_shared_count,
    'flagged', v_shared_count >= 2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
