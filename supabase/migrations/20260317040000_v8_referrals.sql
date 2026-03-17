-- ============================================
-- FORTUNA CASINO Migration V8: Referral System
-- Date: 2026-03-17
-- ============================================

BEGIN;

-- ============================================
-- 1. ADD REFERRAL CODE TO PROFILES
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_earnings INTEGER NOT NULL DEFAULT 0;

-- Generate referral codes for existing users
UPDATE public.profiles
SET referral_code = UPPER(SUBSTRING(md5(id::text || 'fortuna') FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- ============================================
-- 2. REFERRALS TABLE (detailed tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  -- Reward tracking
  referrer_reward INTEGER NOT NULL DEFAULT 0,
  referee_reward INTEGER NOT NULL DEFAULT 0,
  referrer_paid BOOLEAN NOT NULL DEFAULT false,
  referee_paid BOOLEAN NOT NULL DEFAULT false,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'rewarded', 'revoked')),
  -- Qualification: referee must wager at least X credits before rewards unlock
  qualification_wager INTEGER NOT NULL DEFAULT 500,
  referee_wagered INTEGER NOT NULL DEFAULT 0,
  qualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referee_id) -- each user can only be referred once
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own referrals as referrer"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users see own referral as referee"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referee_id);

CREATE POLICY "Service role full access referrals"
  ON public.referrals FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 3. APPLY REFERRAL CODE RPC
-- Called during signup when a referral code is provided
-- ============================================
CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_referee_id UUID,
  p_referral_code TEXT
) RETURNS JSONB AS $$
DECLARE
  v_referrer RECORD;
  v_referee_reward INTEGER := 200;  -- referee gets 200 bonus credits on signup
  v_referrer_reward INTEGER := 500; -- referrer gets 500 when referee qualifies
  v_qualification_wager INTEGER := 500; -- referee must wager 500 to qualify
BEGIN
  -- Find referrer by code
  SELECT id, referral_code INTO v_referrer
  FROM public.profiles
  WHERE referral_code = UPPER(p_referral_code);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid referral code');
  END IF;

  -- Can't refer yourself
  IF v_referrer.id = p_referee_id THEN
    RETURN jsonb_build_object('error', 'Cannot use your own referral code');
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = p_referee_id) THEN
    RETURN jsonb_build_object('error', 'Already used a referral code');
  END IF;

  -- Create referral record
  INSERT INTO public.referrals (
    referrer_id, referee_id, referral_code,
    referrer_reward, referee_reward, qualification_wager
  ) VALUES (
    v_referrer.id, p_referee_id, UPPER(p_referral_code),
    v_referrer_reward, v_referee_reward, v_qualification_wager
  );

  -- Update referred_by on referee profile
  UPDATE public.profiles
  SET referred_by = v_referrer.id
  WHERE id = p_referee_id;

  -- Immediately credit referee bonus
  UPDATE public.profiles
  SET balance = balance + v_referee_reward,
      bonus_balance = bonus_balance + v_referee_reward
  WHERE id = p_referee_id;

  -- Write ledger entry for referee
  INSERT INTO public.wallet_ledger (
    user_id, tx_type, bucket, amount, balance_after, bucket_balance_after, ref_type, note
  ) VALUES (
    p_referee_id, 'bonus', 'bonus', v_referee_reward,
    (SELECT balance FROM public.profiles WHERE id = p_referee_id),
    (SELECT bonus_balance FROM public.profiles WHERE id = p_referee_id),
    'referral', 'Referral signup bonus'
  );

  -- Mark referee as paid
  UPDATE public.referrals
  SET referee_paid = true
  WHERE referee_id = p_referee_id;

  RETURN jsonb_build_object(
    'success', true,
    'referee_reward', v_referee_reward,
    'message', 'Referral code applied! You received ' || v_referee_reward || ' bonus credits.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. CHECK REFERRAL QUALIFICATION RPC
-- Called after each game to check if referee has met wager requirement
-- ============================================
CREATE OR REPLACE FUNCTION public.check_referral_qualification(
  p_referee_id UUID,
  p_wager_amount NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_ref RECORD;
BEGIN
  -- Find pending referral for this referee
  SELECT * INTO v_ref
  FROM public.referrals
  WHERE referee_id = p_referee_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  -- Update wagered amount
  UPDATE public.referrals
  SET referee_wagered = referee_wagered + p_wager_amount
  WHERE id = v_ref.id;

  -- Check if qualified
  IF (v_ref.referee_wagered + p_wager_amount) >= v_ref.qualification_wager THEN
    -- Mark as qualified
    UPDATE public.referrals
    SET status = 'qualified', qualified_at = now()
    WHERE id = v_ref.id;

    -- Pay referrer
    UPDATE public.profiles
    SET balance = balance + v_ref.referrer_reward,
        bonus_balance = bonus_balance + v_ref.referrer_reward,
        referral_count = referral_count + 1,
        referral_earnings = referral_earnings + v_ref.referrer_reward
    WHERE id = v_ref.referrer_id;

    -- Write ledger entry for referrer
    INSERT INTO public.wallet_ledger (
      user_id, tx_type, bucket, amount, balance_after, bucket_balance_after, ref_type, note
    ) VALUES (
      v_ref.referrer_id, 'bonus', 'bonus', v_ref.referrer_reward,
      (SELECT balance FROM public.profiles WHERE id = v_ref.referrer_id),
      (SELECT bonus_balance FROM public.profiles WHERE id = v_ref.referrer_id),
      'referral', 'Referral reward — friend qualified'
    );

    -- Mark as rewarded
    UPDATE public.referrals
    SET status = 'rewarded', referrer_paid = true
    WHERE id = v_ref.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. AUTO-GENERATE REFERRAL CODE TRIGGER
-- Ensures every new user gets a referral code
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(md5(NEW.id::text || 'fortuna' || extract(epoch from now())::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

COMMIT;
