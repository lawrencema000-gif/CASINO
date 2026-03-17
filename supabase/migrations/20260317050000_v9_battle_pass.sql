-- ============================================
-- FORTUNA CASINO Migration V9: Battle Pass
-- Date: 2026-03-17
-- ============================================

BEGIN;

-- ============================================
-- 1. BATTLE PASS SEASONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.battle_pass_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  season_number INTEGER NOT NULL UNIQUE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  max_tier INTEGER NOT NULL DEFAULT 50,
  -- XP required per tier (linear or custom)
  xp_per_tier INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. BATTLE PASS TIER REWARDS
-- ============================================
CREATE TABLE IF NOT EXISTS public.battle_pass_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.battle_pass_seasons(id) ON DELETE CASCADE,
  tier INTEGER NOT NULL CHECK (tier >= 1),
  -- Reward details
  reward_type TEXT NOT NULL CHECK (reward_type IN ('credits', 'exp', 'badge', 'title', 'multiplier_boost')),
  reward_value INTEGER NOT NULL DEFAULT 0,
  reward_label TEXT NOT NULL,
  reward_description TEXT,
  -- Premium track (future: paid battle pass)
  is_premium BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (season_id, tier, is_premium, reward_type)
);

CREATE INDEX IF NOT EXISTS idx_bp_rewards_season ON public.battle_pass_rewards(season_id, tier);

-- ============================================
-- 3. USER BATTLE PASS PROGRESS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_battle_pass (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.battle_pass_seasons(id) ON DELETE CASCADE,
  current_tier INTEGER NOT NULL DEFAULT 0,
  current_xp INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_ubp_user ON public.user_battle_pass(user_id);

-- ============================================
-- 4. CLAIMED REWARDS TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_bp_claims (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.battle_pass_rewards(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reward_id)
);

-- RLS
ALTER TABLE public.battle_pass_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_pass_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_battle_pass ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bp_claims ENABLE ROW LEVEL SECURITY;

-- Public read for seasons and rewards
CREATE POLICY "Anyone can read seasons" ON public.battle_pass_seasons FOR SELECT USING (true);
CREATE POLICY "Anyone can read rewards" ON public.battle_pass_rewards FOR SELECT USING (true);

-- Users see own progress
CREATE POLICY "Users read own bp progress" ON public.user_battle_pass FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own bp claims" ON public.user_bp_claims FOR SELECT USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role bp_seasons" ON public.battle_pass_seasons FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bp_rewards" ON public.battle_pass_rewards FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role ubp" ON public.user_battle_pass FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role ubp_claims" ON public.user_bp_claims FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 5. ADD BATTLE PASS XP RPC
-- Called after game settle to grant XP
-- ============================================
CREATE OR REPLACE FUNCTION public.add_battle_pass_xp(
  p_user_id UUID,
  p_xp INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_season RECORD;
  v_ubp RECORD;
  v_new_xp INTEGER;
  v_new_total_xp INTEGER;
  v_new_tier INTEGER;
  v_tier_ups INTEGER := 0;
BEGIN
  -- Get active season
  SELECT * INTO v_season
  FROM public.battle_pass_seasons
  WHERE is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('active_season', false);
  END IF;

  -- Ensure user has a progress row
  INSERT INTO public.user_battle_pass (user_id, season_id)
  VALUES (p_user_id, v_season.id)
  ON CONFLICT (user_id, season_id) DO NOTHING;

  -- Lock and fetch
  SELECT * INTO v_ubp
  FROM public.user_battle_pass
  WHERE user_id = p_user_id AND season_id = v_season.id
  FOR UPDATE;

  -- Calculate new XP and tier
  v_new_total_xp := v_ubp.total_xp + p_xp;
  v_new_tier := LEAST(v_season.max_tier, v_new_total_xp / v_season.xp_per_tier);
  v_new_xp := v_new_total_xp - (v_new_tier * v_season.xp_per_tier);
  v_tier_ups := v_new_tier - v_ubp.current_tier;

  -- Update
  UPDATE public.user_battle_pass
  SET current_xp = v_new_xp,
      total_xp = v_new_total_xp,
      current_tier = v_new_tier,
      updated_at = now()
  WHERE id = v_ubp.id;

  RETURN jsonb_build_object(
    'xp_added', p_xp,
    'current_tier', v_new_tier,
    'current_xp', v_new_xp,
    'xp_per_tier', v_season.xp_per_tier,
    'tier_ups', v_tier_ups,
    'max_tier', v_season.max_tier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CLAIM BATTLE PASS REWARD RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_bp_reward(
  p_user_id UUID,
  p_reward_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_reward RECORD;
  v_ubp RECORD;
  v_season RECORD;
  v_new_balance BIGINT;
BEGIN
  -- Get reward
  SELECT * INTO v_reward FROM public.battle_pass_rewards WHERE id = p_reward_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Reward not found');
  END IF;

  -- Get season
  SELECT * INTO v_season FROM public.battle_pass_seasons WHERE id = v_reward.season_id;

  -- Get user progress
  SELECT * INTO v_ubp FROM public.user_battle_pass
  WHERE user_id = p_user_id AND season_id = v_reward.season_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Not enrolled in this season');
  END IF;

  -- Check tier requirement
  IF v_ubp.current_tier < v_reward.tier THEN
    RETURN jsonb_build_object('error', 'Tier not reached');
  END IF;

  -- Check premium
  IF v_reward.is_premium AND NOT v_ubp.is_premium THEN
    RETURN jsonb_build_object('error', 'Premium reward');
  END IF;

  -- Check already claimed
  IF EXISTS (SELECT 1 FROM public.user_bp_claims WHERE user_id = p_user_id AND reward_id = p_reward_id) THEN
    RETURN jsonb_build_object('error', 'Already claimed');
  END IF;

  -- Mark claimed
  INSERT INTO public.user_bp_claims (user_id, reward_id) VALUES (p_user_id, p_reward_id);

  -- Grant reward
  CASE v_reward.reward_type
    WHEN 'credits' THEN
      UPDATE public.profiles
      SET balance = balance + v_reward.reward_value,
          bonus_balance = bonus_balance + v_reward.reward_value
      WHERE id = p_user_id
      RETURNING balance INTO v_new_balance;

      INSERT INTO public.wallet_ledger (
        user_id, tx_type, bucket, amount, balance_after, bucket_balance_after, ref_type, ref_id, note
      ) VALUES (
        p_user_id, 'bonus', 'bonus', v_reward.reward_value, v_new_balance,
        (SELECT bonus_balance FROM public.profiles WHERE id = p_user_id),
        'battle_pass', v_reward.id, 'Battle Pass Tier ' || v_reward.tier || ' reward'
      );
    WHEN 'exp' THEN
      UPDATE public.profiles SET exp = exp + v_reward.reward_value WHERE id = p_user_id;
    ELSE
      -- badges, titles, boosts stored as metadata (future)
      NULL;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'reward_type', v_reward.reward_type,
    'reward_value', v_reward.reward_value,
    'reward_label', v_reward.reward_label
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. SEED SEASON 1
-- ============================================
INSERT INTO public.battle_pass_seasons (name, description, season_number, starts_at, ends_at, is_active, max_tier, xp_per_tier)
VALUES ('Season 1: Launch', 'The inaugural Fortuna season', 1, '2026-03-17', '2026-06-17', true, 50, 100);

-- Seed tier rewards for Season 1
-- Every 5 tiers gets a bigger reward; every tier gets something small
DO $$
DECLARE
  v_season_id UUID;
  v_tier INTEGER;
BEGIN
  SELECT id INTO v_season_id FROM public.battle_pass_seasons WHERE season_number = 1;

  FOR v_tier IN 1..50 LOOP
    IF v_tier % 10 = 0 THEN
      -- Major milestone tiers (10, 20, 30, 40, 50)
      INSERT INTO public.battle_pass_rewards (season_id, tier, reward_type, reward_value, reward_label, reward_description)
      VALUES (v_season_id, v_tier, 'credits', v_tier * 50, v_tier * 50 || ' Credits', 'Major milestone reward');
    ELSIF v_tier % 5 = 0 THEN
      -- Mid tiers (5, 15, 25, 35, 45)
      INSERT INTO public.battle_pass_rewards (season_id, tier, reward_type, reward_value, reward_label, reward_description)
      VALUES (v_season_id, v_tier, 'credits', v_tier * 20, v_tier * 20 || ' Credits', 'Milestone reward');
    ELSIF v_tier % 2 = 0 THEN
      -- Even tiers: small credits
      INSERT INTO public.battle_pass_rewards (season_id, tier, reward_type, reward_value, reward_label, reward_description)
      VALUES (v_season_id, v_tier, 'credits', 25 + (v_tier * 2), (25 + (v_tier * 2)) || ' Credits', 'Tier reward');
    ELSE
      -- Odd tiers: XP
      INSERT INTO public.battle_pass_rewards (season_id, tier, reward_type, reward_value, reward_label, reward_description)
      VALUES (v_season_id, v_tier, 'exp', 10 + v_tier, (10 + v_tier) || ' XP', 'Tier XP reward');
    END IF;
  END LOOP;
END $$;

COMMIT;
