-- ============================================
-- FORTUNA CASINO Migration V7: Mission System
-- Date: 2026-03-17
-- ============================================

BEGIN;

-- ============================================
-- 1. MISSION DEFINITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  -- Frequency: daily resets every 24h, weekly every 7d, monthly every 30d, one_time never resets
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'one_time')),
  -- Requirement type
  requirement_type TEXT NOT NULL CHECK (requirement_type IN (
    'wager_total',      -- Wager X credits total
    'wager_game',       -- Wager X credits on a specific game
    'win_count',        -- Win X games
    'win_game',         -- Win X games of a specific type
    'play_count',       -- Play X rounds
    'play_game',        -- Play X rounds of a specific game
    'win_streak',       -- Win X games in a row
    'single_win',       -- Win X credits in a single game
    'login_streak',     -- Log in X days in a row
    'profit_total'      -- Earn X profit (wins - bets)
  )),
  -- Optional: restrict to specific game type
  game_type TEXT DEFAULT NULL,
  -- Target value to reach
  target_value NUMERIC NOT NULL CHECK (target_value > 0),
  -- Reward
  reward_credits INTEGER NOT NULL DEFAULT 0 CHECK (reward_credits >= 0),
  reward_exp INTEGER NOT NULL DEFAULT 0 CHECK (reward_exp >= 0),
  -- Ordering / grouping
  sort_order INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond')),
  -- Active flag
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_active ON public.missions(is_active, frequency);

-- ============================================
-- 2. USER MISSION PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  progress NUMERIC NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  -- Period tracking for recurring missions
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('day', now()),
  period_end TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One active mission instance per user per mission per period
  UNIQUE (user_id, mission_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_user_missions_user ON public.user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_active ON public.user_missions(user_id, completed, claimed);

-- RLS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

-- Anyone can read active missions
CREATE POLICY "Anyone can read active missions"
  ON public.missions FOR SELECT
  USING (is_active = true);

-- Service role full access
CREATE POLICY "Service role full access missions"
  ON public.missions FOR ALL
  USING (auth.role() = 'service_role');

-- Users see own progress
CREATE POLICY "Users read own mission progress"
  ON public.user_missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access user_missions"
  ON public.user_missions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 3. INITIALIZE USER MISSIONS RPC
-- Called when user loads missions page or on login
-- Creates mission instances for current period if they don't exist
-- ============================================
CREATE OR REPLACE FUNCTION public.init_user_missions(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_mission RECORD;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  FOR v_mission IN
    SELECT * FROM public.missions WHERE is_active = true
  LOOP
    -- Calculate period boundaries
    CASE v_mission.frequency
      WHEN 'daily' THEN
        v_period_start := date_trunc('day', v_now);
        v_period_end := v_period_start + INTERVAL '1 day';
      WHEN 'weekly' THEN
        v_period_start := date_trunc('week', v_now);
        v_period_end := v_period_start + INTERVAL '7 days';
      WHEN 'monthly' THEN
        v_period_start := date_trunc('month', v_now);
        v_period_end := v_period_start + INTERVAL '1 month';
      WHEN 'one_time' THEN
        v_period_start := '2020-01-01'::TIMESTAMPTZ;
        v_period_end := '2099-12-31'::TIMESTAMPTZ;
    END CASE;

    -- Create if not exists
    INSERT INTO public.user_missions (user_id, mission_id, period_start, period_end)
    VALUES (p_user_id, v_mission.id, v_period_start, v_period_end)
    ON CONFLICT (user_id, mission_id, period_start) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. UPDATE MISSION PROGRESS RPC
-- Called after each game settle to advance relevant missions
-- ============================================
CREATE OR REPLACE FUNCTION public.update_mission_progress(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_payout NUMERIC,
  p_won BOOLEAN
) RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_um RECORD;
  v_new_progress NUMERIC;
BEGIN
  -- Loop through all active, uncompleted missions for this user in current period
  FOR v_um IN
    SELECT um.id, um.progress, m.requirement_type, m.game_type AS req_game,
           m.target_value, um.completed
    FROM public.user_missions um
    JOIN public.missions m ON m.id = um.mission_id
    WHERE um.user_id = p_user_id
      AND um.completed = false
      AND um.period_start <= v_now
      AND um.period_end > v_now
      AND m.is_active = true
  LOOP
    -- Skip if mission requires specific game and this isn't it
    IF v_um.req_game IS NOT NULL AND v_um.req_game != p_game_type THEN
      CONTINUE;
    END IF;

    v_new_progress := v_um.progress;

    CASE v_um.requirement_type
      WHEN 'wager_total' THEN
        v_new_progress := v_um.progress + p_bet_amount;
      WHEN 'wager_game' THEN
        v_new_progress := v_um.progress + p_bet_amount;
      WHEN 'win_count' THEN
        IF p_won THEN v_new_progress := v_um.progress + 1; END IF;
      WHEN 'win_game' THEN
        IF p_won THEN v_new_progress := v_um.progress + 1; END IF;
      WHEN 'play_count' THEN
        v_new_progress := v_um.progress + 1;
      WHEN 'play_game' THEN
        v_new_progress := v_um.progress + 1;
      WHEN 'single_win' THEN
        IF p_payout > v_um.progress THEN v_new_progress := p_payout; END IF;
      WHEN 'profit_total' THEN
        v_new_progress := v_um.progress + (p_payout - p_bet_amount);
      ELSE
        CONTINUE;
    END CASE;

    -- Update progress
    IF v_new_progress != v_um.progress THEN
      UPDATE public.user_missions
      SET progress = v_new_progress,
          completed = (v_new_progress >= v_um.target_value),
          completed_at = CASE WHEN v_new_progress >= v_um.target_value THEN v_now ELSE NULL END
      WHERE id = v_um.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. CLAIM MISSION REWARD RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_mission_reward(
  p_user_id UUID,
  p_user_mission_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_um RECORD;
  v_mission RECORD;
  v_new_balance BIGINT;
BEGIN
  -- Get the user mission
  SELECT * INTO v_um FROM public.user_missions
  WHERE id = p_user_mission_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Mission not found');
  END IF;

  IF NOT v_um.completed THEN
    RETURN jsonb_build_object('error', 'Mission not completed');
  END IF;

  IF v_um.claimed THEN
    RETURN jsonb_build_object('error', 'Already claimed');
  END IF;

  -- Get mission details
  SELECT * INTO v_mission FROM public.missions WHERE id = v_um.mission_id;

  -- Mark as claimed
  UPDATE public.user_missions
  SET claimed = true, claimed_at = now()
  WHERE id = p_user_mission_id;

  -- Credit reward
  IF v_mission.reward_credits > 0 THEN
    UPDATE public.profiles
    SET balance = balance + v_mission.reward_credits,
        bonus_balance = bonus_balance + v_mission.reward_credits
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;

    -- Write ledger entry
    INSERT INTO public.wallet_ledger (
      user_id, tx_type, bucket, amount, balance_after, bucket_balance_after, ref_type, ref_id, note
    ) VALUES (
      p_user_id, 'bonus', 'bonus', v_mission.reward_credits, v_new_balance,
      (SELECT bonus_balance FROM public.profiles WHERE id = p_user_id),
      'mission', v_um.mission_id, 'Mission reward: ' || v_mission.title
    );
  END IF;

  -- Add EXP
  IF v_mission.reward_exp > 0 THEN
    UPDATE public.profiles
    SET exp = exp + v_mission.reward_exp
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reward_credits', v_mission.reward_credits,
    'reward_exp', v_mission.reward_exp,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. SEED DEFAULT MISSIONS
-- ============================================

-- Daily missions
INSERT INTO public.missions (slug, title, description, icon, frequency, requirement_type, game_type, target_value, reward_credits, reward_exp, sort_order, tier) VALUES
  ('daily-wager-500', 'Daily Grind', 'Wager 500 credits today', 'coins', 'daily', 'wager_total', NULL, 500, 50, 10, 1, 'bronze'),
  ('daily-play-10', 'Active Player', 'Play 10 rounds of any game', 'gamepad-2', 'daily', 'play_count', NULL, 10, 25, 5, 2, 'bronze'),
  ('daily-win-3', 'Winner Winner', 'Win 3 games today', 'trophy', 'daily', 'win_count', NULL, 3, 75, 15, 3, 'bronze'),
  ('daily-slots-5', 'Slot Spinner', 'Play 5 rounds of Slots', 'cherry', 'daily', 'play_game', 'slots', 5, 30, 5, 4, 'bronze'),
  ('daily-blackjack-3', 'Card Shark', 'Play 3 hands of Blackjack', 'spade', 'daily', 'play_game', 'blackjack', 3, 30, 5, 5, 'bronze');

-- Weekly missions
INSERT INTO public.missions (slug, title, description, icon, frequency, requirement_type, game_type, target_value, reward_credits, reward_exp, sort_order, tier) VALUES
  ('weekly-wager-5000', 'High Roller Week', 'Wager 5,000 credits this week', 'trending-up', 'weekly', 'wager_total', NULL, 5000, 500, 100, 10, 'silver'),
  ('weekly-win-20', 'Winning Streak', 'Win 20 games this week', 'flame', 'weekly', 'win_count', NULL, 20, 300, 50, 11, 'silver'),
  ('weekly-play-50', 'Dedicated Player', 'Play 50 rounds this week', 'target', 'weekly', 'play_count', NULL, 50, 200, 40, 12, 'silver'),
  ('weekly-plinko-10', 'Plinko Pro', 'Play 10 rounds of Plinko', 'circle-dot', 'weekly', 'play_game', 'plinko', 10, 150, 25, 13, 'silver'),
  ('weekly-big-win', 'Big Score', 'Win 1,000+ credits in a single game', 'zap', 'weekly', 'single_win', NULL, 1000, 400, 75, 14, 'silver');

-- Monthly missions
INSERT INTO public.missions (slug, title, description, icon, frequency, requirement_type, game_type, target_value, reward_credits, reward_exp, sort_order, tier) VALUES
  ('monthly-wager-25000', 'Monthly Legend', 'Wager 25,000 credits this month', 'crown', 'monthly', 'wager_total', NULL, 25000, 2500, 500, 20, 'gold'),
  ('monthly-win-100', 'Century Club', 'Win 100 games this month', 'award', 'monthly', 'win_count', NULL, 100, 1500, 300, 21, 'gold'),
  ('monthly-play-200', 'Iron Player', 'Play 200 rounds this month', 'shield', 'monthly', 'play_count', NULL, 200, 1000, 200, 22, 'gold'),
  ('monthly-profit', 'In The Green', 'Earn 5,000 credits in profit this month', 'trending-up', 'monthly', 'profit_total', NULL, 5000, 2000, 400, 23, 'gold');

-- One-time achievements
INSERT INTO public.missions (slug, title, description, icon, frequency, requirement_type, game_type, target_value, reward_credits, reward_exp, sort_order, tier) VALUES
  ('first-win', 'First Blood', 'Win your first game', 'star', 'one_time', 'win_count', NULL, 1, 100, 25, 30, 'bronze'),
  ('play-100', 'Century Player', 'Play 100 total rounds', 'medal', 'one_time', 'play_count', NULL, 100, 500, 100, 31, 'silver'),
  ('wager-100k', 'High Stakes', 'Wager 100,000 credits lifetime', 'gem', 'one_time', 'wager_total', NULL, 100000, 5000, 1000, 32, 'diamond'),
  ('jackpot-win', 'Jackpot!', 'Win 10,000+ credits in a single game', 'sparkles', 'one_time', 'single_win', NULL, 10000, 3000, 500, 33, 'diamond');

COMMIT;
