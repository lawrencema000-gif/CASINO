-- ============================================
-- FORTUNA CASINO Migration V3: Production Hardening
-- Date: 2026-03-16
-- ============================================
-- Adds: login_bonuses table, collect_bonus RPC, wallet RPCs,
--       idempotent settle_game, responsible gambling columns,
--       admin_adjust_balance RPC, balance constraints, bet limits
-- ============================================

BEGIN;

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CREATE login_bonuses TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.login_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  streak INTEGER NOT NULL DEFAULT 0,
  last_collected TIMESTAMPTZ,
  total_collected BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.login_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login bonus"
  ON public.login_bonuses FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Service role full access login_bonuses"
  ON public.login_bonuses FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_login_bonuses_player_id
  ON public.login_bonuses(player_id);

-- ============================================
-- 2. collect_bonus RPC (atomic daily bonus)
-- ============================================
CREATE OR REPLACE FUNCTION public.collect_bonus(p_player_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_bonus RECORD;
  v_new_streak INTEGER;
  v_amount BIGINT;
  v_new_balance BIGINT;
BEGIN
  -- Lock the row if it exists
  SELECT * INTO v_bonus
  FROM public.login_bonuses
  WHERE player_id = p_player_id
  FOR UPDATE;

  IF v_bonus IS NULL THEN
    -- First time claiming
    v_new_streak := 1;
    v_amount := 100;
    INSERT INTO public.login_bonuses (player_id, streak, last_collected, total_collected)
    VALUES (p_player_id, 1, now(), 100);
  ELSE
    -- Check if already collected today
    IF v_bonus.last_collected IS NOT NULL
       AND v_bonus.last_collected::date = CURRENT_DATE THEN
      RAISE EXCEPTION 'Bonus already collected today';
    END IF;

    -- Check if streak continues (collected yesterday) or resets
    IF v_bonus.last_collected IS NOT NULL
       AND v_bonus.last_collected::date = (CURRENT_DATE - INTERVAL '1 day')::date THEN
      v_new_streak := LEAST(v_bonus.streak + 1, 30);  -- cap at 30
    ELSE
      v_new_streak := 1;  -- reset streak
    END IF;

    v_amount := LEAST(v_new_streak * 100, 5000);  -- 100 per streak day, max 5000

    UPDATE public.login_bonuses
    SET streak = v_new_streak,
        last_collected = now(),
        total_collected = total_collected + v_amount
    WHERE player_id = p_player_id;
  END IF;

  -- Credit the player
  UPDATE public.profiles
  SET balance = balance + v_amount,
      updated_at = now()
  WHERE id = p_player_id
  RETURNING balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO public.transactions (player_id, type, amount, balance_after, description)
  VALUES (p_player_id, 'bonus', v_amount, v_new_balance,
          'Daily login bonus - Day ' || v_new_streak || ' streak');

  RETURN jsonb_build_object(
    'amount', v_amount,
    'new_streak', v_new_streak,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. wallet_deposit RPC (atomic deposit)
-- ============================================
CREATE OR REPLACE FUNCTION public.wallet_deposit(
  p_player_id UUID,
  p_amount BIGINT
) RETURNS BIGINT AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  IF p_amount <= 0 OR p_amount > 50000 THEN
    RAISE EXCEPTION 'Invalid deposit amount (1-50000)';
  END IF;

  UPDATE public.profiles
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = p_player_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.transactions (player_id, type, amount, balance_after, description)
  VALUES (p_player_id, 'deposit', p_amount, v_new_balance,
          'Deposit - ' || p_amount || ' credits');

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. wallet_withdraw RPC (atomic withdrawal)
-- ============================================
CREATE OR REPLACE FUNCTION public.wallet_withdraw(
  p_player_id UUID,
  p_amount BIGINT
) RETURNS BIGINT AS $$
DECLARE
  v_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid withdrawal amount';
  END IF;

  SELECT balance INTO v_balance
  FROM public.profiles
  WHERE id = p_player_id
  FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.profiles
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE id = p_player_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.transactions (player_id, type, amount, balance_after, description)
  VALUES (p_player_id, 'withdrawal', -p_amount, v_new_balance,
          'Withdrawal - ' || p_amount || ' credits');

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Idempotent settle_game RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.settle_game(
  p_game_id UUID,
  p_player_id UUID,
  p_result JSONB,
  p_payout BIGINT,
  p_multiplier NUMERIC DEFAULT 1
) RETURNS BIGINT AS $$
DECLARE
  v_new_balance BIGINT;
  v_already_settled BOOLEAN;
BEGIN
  -- Handle null game_id (poker side-bets, etc.)
  IF p_game_id IS NOT NULL THEN
    -- Check if already settled (idempotency guard)
    SELECT settled INTO v_already_settled
    FROM public.games
    WHERE id = p_game_id AND player_id = p_player_id
    FOR UPDATE;

    IF v_already_settled IS TRUE THEN
      -- Already settled: return current balance without double-paying
      SELECT balance INTO v_new_balance
      FROM public.profiles
      WHERE id = p_player_id;
      RETURN v_new_balance;
    END IF;

    UPDATE public.games
    SET result = p_result,
        payout = p_payout,
        multiplier = p_multiplier,
        settled = true
    WHERE id = p_game_id AND player_id = p_player_id;
  END IF;

  IF p_payout > 0 THEN
    UPDATE public.profiles
    SET balance = balance + p_payout,
        total_won = total_won + p_payout,
        exp = exp + (p_payout / 100),
        updated_at = now()
    WHERE id = p_player_id
    RETURNING balance INTO v_new_balance;

    INSERT INTO public.transactions (player_id, type, amount, balance_after, game_id, description)
    VALUES (p_player_id, 'win', p_payout, v_new_balance, p_game_id, 'Game payout');
  ELSE
    SELECT balance INTO v_new_balance
    FROM public.profiles
    WHERE id = p_player_id;
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Responsible gambling columns on profiles
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_deposit_limit BIGINT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_loss_limit BIGINT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS session_time_limit INTEGER DEFAULT NULL;  -- minutes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS self_excluded_until TIMESTAMPTZ DEFAULT NULL;

-- ============================================
-- 7. admin_adjust_balance RPC (atomic with audit)
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_admin_id UUID,
  p_target_id UUID,
  p_amount BIGINT,
  p_reason TEXT DEFAULT 'Admin adjustment'
) RETURNS JSONB AS $$
DECLARE
  v_old_balance BIGINT;
  v_new_balance BIGINT;
  v_tx_type TEXT;
BEGIN
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Amount cannot be zero';
  END IF;

  SELECT balance INTO v_old_balance
  FROM public.profiles
  WHERE id = p_target_id
  FOR UPDATE;

  IF v_old_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_new_balance := GREATEST(0, v_old_balance + p_amount);
  v_tx_type := CASE WHEN p_amount > 0 THEN 'admin_credit' ELSE 'admin_debit' END;

  UPDATE public.profiles
  SET balance = v_new_balance,
      updated_at = now()
  WHERE id = p_target_id;

  INSERT INTO public.transactions (player_id, type, amount, balance_after, description)
  VALUES (p_target_id, v_tx_type, ABS(p_amount), v_new_balance,
          p_reason || ' (by admin ' || LEFT(p_admin_id::text, 8) || ')');

  RETURN jsonb_build_object(
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'adjustment', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Balance non-negative CHECK constraint
-- ============================================
-- Use DO block to avoid error if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_balance_non_negative'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_balance_non_negative CHECK (balance >= 0);
  END IF;
END;
$$;

-- ============================================
-- 9. Updated process_bet with min/max bet limits
-- ============================================
CREATE OR REPLACE FUNCTION public.process_bet(
  p_player_id UUID,
  p_game_type TEXT,
  p_bet_amount BIGINT,
  p_server_seed_hash TEXT,
  p_client_seed TEXT,
  p_nonce INTEGER
) RETURNS UUID AS $$
DECLARE
  v_game_id UUID;
  v_current_balance BIGINT;
BEGIN
  -- Enforce bet limits
  IF p_bet_amount < 1 THEN
    RAISE EXCEPTION 'Minimum bet is 1';
  END IF;
  IF p_bet_amount > 1000000 THEN
    RAISE EXCEPTION 'Maximum bet is 1,000,000';
  END IF;

  SELECT balance INTO v_current_balance
  FROM public.profiles
  WHERE id = p_player_id
  FOR UPDATE;

  IF v_current_balance < p_bet_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.profiles
  SET balance = balance - p_bet_amount,
      total_wagered = total_wagered + p_bet_amount,
      games_played = games_played + 1,
      updated_at = now()
  WHERE id = p_player_id;

  INSERT INTO public.games (player_id, game_type, bet_amount, server_seed_hash, client_seed, nonce)
  VALUES (p_player_id, p_game_type, p_bet_amount, p_server_seed_hash, p_client_seed, p_nonce)
  RETURNING id INTO v_game_id;

  INSERT INTO public.transactions (player_id, type, amount, balance_after, game_id, description)
  VALUES (
    p_player_id,
    'bet',
    -p_bet_amount,
    v_current_balance - p_bet_amount,
    v_game_id,
    p_game_type || ' bet'
  );

  RETURN v_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
