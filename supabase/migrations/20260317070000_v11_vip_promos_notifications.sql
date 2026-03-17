-- ============================================
-- FORTUNA CASINO Migration V11: VIP Tiers, Promo Codes, Notifications
-- Date: 2026-03-17
-- ============================================

BEGIN;

-- ============================================
-- 1. VIP TIERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.vip_tiers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  level INTEGER NOT NULL UNIQUE,
  min_wagered INTEGER NOT NULL DEFAULT 0,
  -- Perks
  daily_bonus_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  cashback_rate NUMERIC NOT NULL DEFAULT 0,
  xp_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  max_bet_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  priority_support BOOLEAN NOT NULL DEFAULT false,
  custom_avatar_frame BOOLEAN NOT NULL DEFAULT false,
  exclusive_games BOOLEAN NOT NULL DEFAULT false,
  description TEXT
);

-- Seed VIP tiers
INSERT INTO public.vip_tiers (name, level, min_wagered, daily_bonus_multiplier, cashback_rate, xp_multiplier, max_bet_multiplier, priority_support, custom_avatar_frame, exclusive_games, description) VALUES
  ('Bronze', 1, 0, 1.0, 0, 1.0, 1.0, false, false, false, 'Starting tier — welcome to Fortuna!'),
  ('Silver', 2, 10000, 1.5, 0.01, 1.25, 1.5, false, false, false, 'Unlocked at 10K total wagered'),
  ('Gold', 3, 50000, 2.0, 0.02, 1.5, 2.0, true, true, false, 'Unlocked at 50K total wagered'),
  ('Platinum', 4, 200000, 3.0, 0.03, 2.0, 3.0, true, true, true, 'Unlocked at 200K total wagered'),
  ('Diamond', 5, 1000000, 5.0, 0.05, 3.0, 5.0, true, true, true, 'The elite — 1M total wagered')
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vip_tiers" ON public.vip_tiers FOR SELECT USING (true);
CREATE POLICY "Service role vip_tiers" ON public.vip_tiers FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 2. VIP TIER CHECK FUNCTION
-- Updates user's VIP tier based on total_wagered
-- ============================================
CREATE OR REPLACE FUNCTION public.check_vip_tier(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_new_tier RECORD;
  v_old_tier TEXT;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'User not found'); END IF;

  v_old_tier := v_profile.vip_tier;

  SELECT * INTO v_new_tier
  FROM public.vip_tiers
  WHERE min_wagered <= v_profile.total_wagered
  ORDER BY level DESC
  LIMIT 1;

  IF v_new_tier.name IS DISTINCT FROM v_old_tier THEN
    UPDATE public.profiles SET vip_tier = LOWER(v_new_tier.name) WHERE id = p_user_id;
    RETURN jsonb_build_object('upgraded', true, 'old_tier', v_old_tier, 'new_tier', v_new_tier.name);
  END IF;

  RETURN jsonb_build_object('upgraded', false, 'current_tier', v_old_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. PROMO CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  -- Reward
  reward_type TEXT NOT NULL CHECK (reward_type IN ('credits', 'exp', 'multiplier_boost')),
  reward_value INTEGER NOT NULL CHECK (reward_value > 0),
  -- Limits
  max_uses INTEGER,          -- NULL = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  per_user_limit INTEGER NOT NULL DEFAULT 1,
  -- Eligibility
  min_level INTEGER NOT NULL DEFAULT 0,
  min_vip_tier TEXT DEFAULT NULL,
  new_users_only BOOLEAN NOT NULL DEFAULT false,
  -- Time
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  promo_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, promo_id)
);

-- RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role promo_codes" ON public.promo_codes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role promo_redemptions" ON public.promo_redemptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users read own redemptions" ON public.promo_redemptions FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 4. REDEEM PROMO CODE RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_user_id UUID,
  p_code TEXT
) RETURNS JSONB AS $$
DECLARE
  v_promo RECORD;
  v_profile RECORD;
  v_user_redemptions INTEGER;
  v_new_balance BIGINT;
BEGIN
  -- Find promo
  SELECT * INTO v_promo FROM public.promo_codes
  WHERE code = UPPER(p_code) AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired promo code');
  END IF;

  -- Check expiry
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'This promo code has expired');
  END IF;

  -- Check start date
  IF v_promo.starts_at > now() THEN
    RETURN jsonb_build_object('error', 'This promo code is not yet active');
  END IF;

  -- Check max uses
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('error', 'This promo code has reached its usage limit');
  END IF;

  -- Get profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  -- Check per-user limit
  SELECT COUNT(*) INTO v_user_redemptions
  FROM public.promo_redemptions
  WHERE user_id = p_user_id AND promo_id = v_promo.id;

  IF v_user_redemptions >= v_promo.per_user_limit THEN
    RETURN jsonb_build_object('error', 'You have already used this promo code');
  END IF;

  -- Check min level
  IF v_profile.level < v_promo.min_level THEN
    RETURN jsonb_build_object('error', 'You need to be level ' || v_promo.min_level || '+ to use this code');
  END IF;

  -- Check new users only
  IF v_promo.new_users_only AND v_profile.total_wagered > 0 THEN
    RETURN jsonb_build_object('error', 'This code is for new players only');
  END IF;

  -- Record redemption
  INSERT INTO public.promo_redemptions (user_id, promo_id) VALUES (p_user_id, v_promo.id);

  -- Increment usage counter
  UPDATE public.promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo.id;

  -- Grant reward
  IF v_promo.reward_type = 'credits' THEN
    UPDATE public.profiles
    SET balance = balance + v_promo.reward_value,
        bonus_balance = bonus_balance + v_promo.reward_value
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;

    INSERT INTO public.wallet_ledger (
      user_id, tx_type, bucket, amount, balance_after, bucket_balance_after, ref_type, ref_id, note
    ) VALUES (
      p_user_id, 'bonus', 'bonus', v_promo.reward_value, v_new_balance,
      (SELECT bonus_balance FROM public.profiles WHERE id = p_user_id),
      'promo', v_promo.id, 'Promo code: ' || v_promo.code
    );
  ELSIF v_promo.reward_type = 'exp' THEN
    UPDATE public.profiles SET exp = exp + v_promo.reward_value WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reward_type', v_promo.reward_type,
    'reward_value', v_promo.reward_value,
    'description', v_promo.description,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'system', 'reward', 'promotion', 'support', 'security',
    'vip_upgrade', 'mission_complete', 'referral', 'battle_pass'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role notifications"
  ON public.notifications FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 6. SEED INITIAL PROMO CODES
-- ============================================
INSERT INTO public.promo_codes (code, description, reward_type, reward_value, max_uses, new_users_only) VALUES
  ('WELCOME500', 'Welcome bonus — 500 free credits', 'credits', 500, NULL, true),
  ('FORTUNA100', 'Fortuna launch promo — 100 credits', 'credits', 100, 1000, false),
  ('VIPBOOST', 'VIP boost — 1000 credits for Gold+ players', 'credits', 1000, 500, false);

-- Set VIPBOOST to require Gold tier
UPDATE public.promo_codes SET min_vip_tier = 'gold' WHERE code = 'VIPBOOST';

COMMIT;
