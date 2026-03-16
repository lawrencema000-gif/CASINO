-- ============================================
-- FORTUNA CASINO Migration V4: Wallet Ledger
-- Date: 2026-03-16
-- ============================================
-- Adds: wallet_ledger table with bucket support,
--       purchased_balance / bonus_balance columns,
--       updates all RPCs to write ledger entries,
--       reconciliation function,
--       backfills existing transactions into ledger
-- ============================================

BEGIN;

-- ============================================
-- 1. CREATE wallet_ledger TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Transaction type
  tx_type TEXT NOT NULL CHECK (tx_type IN (
    'purchase',          -- bought with real money
    'bonus',             -- daily bonus, welcome, level-up
    'promo',             -- promotional credit grant
    'referral',          -- referral reward
    'bet',               -- game wager (debit)
    'win',               -- game payout (credit)
    'refund',            -- admin refund
    'admin_credit',      -- manual admin credit
    'admin_debit',       -- manual admin debit
    'promo_expire',      -- promotional credits expired
    'deposit',           -- free play-money deposit
    'withdrawal',        -- free play-money withdrawal
    'adjustment'         -- reconciliation adjustment
  )),

  -- Bucket tracking
  bucket TEXT NOT NULL DEFAULT 'bonus' CHECK (bucket IN ('purchased', 'bonus', 'promo')),

  -- Amounts (signed: positive = credit, negative = debit)
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,            -- total balance after this tx
  bucket_balance_after BIGINT NOT NULL,     -- this bucket's balance after tx

  -- References
  game_id UUID REFERENCES public.games(id),
  purchase_id UUID,                         -- for future Stripe purchases table
  promo_id UUID,                            -- for future promotions table

  -- Idempotency
  idempotency_key TEXT UNIQUE,

  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_by UUID,                          -- who initiated (user or admin)
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_id ON public.wallet_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created ON public.wallet_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_tx_type ON public.wallet_ledger(tx_type);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_bucket ON public.wallet_ledger(user_id, bucket);

-- RLS
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger entries"
  ON public.wallet_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access wallet_ledger"
  ON public.wallet_ledger FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 2. ADD BUCKET BALANCE COLUMNS TO PROFILES
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS purchased_balance BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_balance BIGINT NOT NULL DEFAULT 0;

-- Add non-negative constraints for bucket balances
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_purchased_balance_non_negative'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_purchased_balance_non_negative CHECK (purchased_balance >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_bonus_balance_non_negative'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_bonus_balance_non_negative CHECK (bonus_balance >= 0);
  END IF;
END;
$$;

-- Initialize: move existing balance into bonus_balance (all existing credits are bonus/free)
UPDATE public.profiles
SET bonus_balance = balance
WHERE bonus_balance = 0 AND balance > 0;

-- ============================================
-- 3. HELPER: write_ledger_entry
-- ============================================
-- Internal helper used by all RPCs to write a ledger row
-- Returns the new total balance after the entry
CREATE OR REPLACE FUNCTION public.write_ledger_entry(
  p_user_id UUID,
  p_tx_type TEXT,
  p_bucket TEXT,
  p_amount BIGINT,
  p_game_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS BIGINT AS $$
DECLARE
  v_total_balance BIGINT;
  v_bucket_balance BIGINT;
BEGIN
  -- Get current balances
  SELECT balance,
         CASE p_bucket
           WHEN 'purchased' THEN purchased_balance
           WHEN 'bonus' THEN bonus_balance
           ELSE 0  -- promo bucket not cached yet, compute from ledger
         END
  INTO v_total_balance, v_bucket_balance
  FROM public.profiles
  WHERE id = p_user_id;

  v_total_balance := v_total_balance + p_amount;
  v_bucket_balance := v_bucket_balance + p_amount;

  -- Insert ledger entry
  INSERT INTO public.wallet_ledger (
    user_id, tx_type, bucket, amount,
    balance_after, bucket_balance_after,
    game_id, description, idempotency_key,
    created_by, metadata
  ) VALUES (
    p_user_id, p_tx_type, p_bucket, p_amount,
    v_total_balance, v_bucket_balance,
    p_game_id, p_description, p_idempotency_key,
    p_created_by, p_metadata
  );

  -- Update cached bucket balance on profiles
  IF p_bucket = 'purchased' THEN
    UPDATE public.profiles
    SET purchased_balance = purchased_balance + p_amount
    WHERE id = p_user_id;
  ELSIF p_bucket = 'bonus' THEN
    UPDATE public.profiles
    SET bonus_balance = bonus_balance + p_amount
    WHERE id = p_user_id;
  END IF;

  RETURN v_total_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. UPDATE process_bet — add ledger entry
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
  v_bonus BIGINT;
  v_purchased BIGINT;
  v_deduct_bonus BIGINT;
  v_deduct_purchased BIGINT;
BEGIN
  -- Enforce bet limits
  IF p_bet_amount < 1 THEN
    RAISE EXCEPTION 'Minimum bet is 1';
  END IF;
  IF p_bet_amount > 1000000 THEN
    RAISE EXCEPTION 'Maximum bet is 1,000,000';
  END IF;

  -- Lock and read balances
  SELECT balance, bonus_balance, purchased_balance
  INTO v_current_balance, v_bonus, v_purchased
  FROM public.profiles
  WHERE id = p_player_id
  FOR UPDATE;

  IF v_current_balance < p_bet_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Spend order: bonus first, then purchased
  v_deduct_bonus := LEAST(p_bet_amount, v_bonus);
  v_deduct_purchased := p_bet_amount - v_deduct_bonus;

  -- Update profiles
  UPDATE public.profiles
  SET balance = balance - p_bet_amount,
      bonus_balance = bonus_balance - v_deduct_bonus,
      purchased_balance = purchased_balance - v_deduct_purchased,
      total_wagered = total_wagered + p_bet_amount,
      games_played = games_played + 1,
      updated_at = now()
  WHERE id = p_player_id;

  -- Create game record
  INSERT INTO public.games (player_id, game_type, bet_amount, server_seed_hash, client_seed, nonce)
  VALUES (p_player_id, p_game_type, p_bet_amount, p_server_seed_hash, p_client_seed, p_nonce)
  RETURNING id INTO v_game_id;

  -- Legacy transaction entry
  INSERT INTO public.transactions (player_id, type, amount, balance_after, game_id, description)
  VALUES (
    p_player_id, 'bet', -p_bet_amount,
    v_current_balance - p_bet_amount,
    v_game_id, p_game_type || ' bet'
  );

  -- Ledger entries (one per bucket spent)
  IF v_deduct_bonus > 0 THEN
    INSERT INTO public.wallet_ledger (
      user_id, tx_type, bucket, amount,
      balance_after, bucket_balance_after,
      game_id, description
    ) VALUES (
      p_player_id, 'bet', 'bonus', -v_deduct_bonus,
      v_current_balance - v_deduct_bonus,
      v_bonus - v_deduct_bonus,
      v_game_id, p_game_type || ' bet (bonus credits)'
    );
  END IF;

  IF v_deduct_purchased > 0 THEN
    INSERT INTO public.wallet_ledger (
      user_id, tx_type, bucket, amount,
      balance_after, bucket_balance_after,
      game_id, description
    ) VALUES (
      p_player_id, 'bet', 'purchased', -v_deduct_purchased,
      v_current_balance - p_bet_amount,
      v_purchased - v_deduct_purchased,
      v_game_id, p_game_type || ' bet (purchased credits)'
    );
  END IF;

  RETURN v_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. UPDATE settle_game — add ledger entry
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
  v_new_bonus BIGINT;
  v_already_settled BOOLEAN;
BEGIN
  -- Idempotency guard
  IF p_game_id IS NOT NULL THEN
    SELECT settled INTO v_already_settled
    FROM public.games
    WHERE id = p_game_id AND player_id = p_player_id
    FOR UPDATE;

    IF v_already_settled IS TRUE THEN
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
    -- Credit winnings to bonus bucket (winnings are not "purchased")
    UPDATE public.profiles
    SET balance = balance + p_payout,
        bonus_balance = bonus_balance + p_payout,
        total_won = total_won + p_payout,
        exp = exp + (p_payout / 100),
        updated_at = now()
    WHERE id = p_player_id
    RETURNING balance, bonus_balance INTO v_new_balance, v_new_bonus;

    -- Legacy transaction
    INSERT INTO public.transactions (player_id, type, amount, balance_after, game_id, description)
    VALUES (p_player_id, 'win', p_payout, v_new_balance, p_game_id, 'Game payout');

    -- Ledger entry
    INSERT INTO public.wallet_ledger (
      user_id, tx_type, bucket, amount,
      balance_after, bucket_balance_after,
      game_id, description,
      idempotency_key
    ) VALUES (
      p_player_id, 'win', 'bonus', p_payout,
      v_new_balance, v_new_bonus,
      p_game_id, 'Game payout',
      'settle:' || COALESCE(p_game_id::text, gen_random_uuid()::text)
    );
  ELSE
    SELECT balance INTO v_new_balance
    FROM public.profiles
    WHERE id = p_player_id;
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. UPDATE collect_bonus — add ledger entry
-- ============================================
CREATE OR REPLACE FUNCTION public.collect_bonus(p_player_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_bonus RECORD;
  v_new_streak INTEGER;
  v_amount BIGINT;
  v_new_balance BIGINT;
  v_new_bonus BIGINT;
BEGIN
  SELECT * INTO v_bonus
  FROM public.login_bonuses
  WHERE player_id = p_player_id
  FOR UPDATE;

  IF v_bonus IS NULL THEN
    v_new_streak := 1;
    v_amount := 100;
    INSERT INTO public.login_bonuses (player_id, streak, last_collected, total_collected)
    VALUES (p_player_id, 1, now(), 100);
  ELSE
    IF v_bonus.last_collected IS NOT NULL
       AND v_bonus.last_collected::date = CURRENT_DATE THEN
      RAISE EXCEPTION 'Bonus already collected today';
    END IF;

    IF v_bonus.last_collected IS NOT NULL
       AND v_bonus.last_collected::date = (CURRENT_DATE - INTERVAL '1 day')::date THEN
      v_new_streak := LEAST(v_bonus.streak + 1, 30);
    ELSE
      v_new_streak := 1;
    END IF;

    v_amount := LEAST(v_new_streak * 100, 5000);

    UPDATE public.login_bonuses
    SET streak = v_new_streak,
        last_collected = now(),
        total_collected = total_collected + v_amount
    WHERE player_id = p_player_id;
  END IF;

  -- Credit to bonus bucket
  UPDATE public.profiles
  SET balance = balance + v_amount,
      bonus_balance = bonus_balance + v_amount,
      updated_at = now()
  WHERE id = p_player_id
  RETURNING balance, bonus_balance INTO v_new_balance, v_new_bonus;

  -- Legacy transaction
  INSERT INTO public.transactions (player_id, type, amount, balance_after, description)
  VALUES (p_player_id, 'bonus', v_amount, v_new_balance,
          'Daily login bonus - Day ' || v_new_streak || ' streak');

  -- Ledger entry
  INSERT INTO public.wallet_ledger (
    user_id, tx_type, bucket, amount,
    balance_after, bucket_balance_after,
    description, idempotency_key
  ) VALUES (
    p_player_id, 'bonus', 'bonus', v_amount,
    v_new_balance, v_new_bonus,
    'Daily login bonus - Day ' || v_new_streak || ' streak',
    'bonus:' || p_player_id || ':' || CURRENT_DATE::text
  );

  RETURN jsonb_build_object(
    'amount', v_amount,
    'new_streak', v_new_streak,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. UPDATE wallet_deposit — add ledger entry
-- ============================================
CREATE OR REPLACE FUNCTION public.wallet_deposit(
  p_player_id UUID,
  p_amount BIGINT
) RETURNS BIGINT AS $$
DECLARE
  v_new_balance BIGINT;
  v_new_bonus BIGINT;
BEGIN
  IF p_amount <= 0 OR p_amount > 50000 THEN
    RAISE EXCEPTION 'Invalid deposit amount (1-50000)';
  END IF;

  -- Free play-money deposits go to bonus bucket
  UPDATE public.profiles
  SET balance = balance + p_amount,
      bonus_balance = bonus_balance + p_amount,
      updated_at = now()
  WHERE id = p_player_id
  RETURNING balance, bonus_balance INTO v_new_balance, v_new_bonus;

  -- Legacy transaction
  INSERT INTO public.transactions (player_id, type, amount, balance_after, description)
  VALUES (p_player_id, 'deposit', p_amount, v_new_balance,
          'Deposit - ' || p_amount || ' credits');

  -- Ledger entry
  INSERT INTO public.wallet_ledger (
    user_id, tx_type, bucket, amount,
    balance_after, bucket_balance_after,
    description
  ) VALUES (
    p_player_id, 'deposit', 'bonus', p_amount,
    v_new_balance, v_new_bonus,
    'Free play-money deposit - ' || p_amount || ' credits'
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. UPDATE wallet_withdraw — add ledger entry
-- ============================================
CREATE OR REPLACE FUNCTION public.wallet_withdraw(
  p_player_id UUID,
  p_amount BIGINT
) RETURNS BIGINT AS $$
DECLARE
  v_balance BIGINT;
  v_bonus BIGINT;
  v_purchased BIGINT;
  v_new_balance BIGINT;
  v_deduct_bonus BIGINT;
  v_deduct_purchased BIGINT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid withdrawal amount';
  END IF;

  SELECT balance, bonus_balance, purchased_balance
  INTO v_balance, v_bonus, v_purchased
  FROM public.profiles
  WHERE id = p_player_id
  FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Withdraw from bonus first, then purchased
  v_deduct_bonus := LEAST(p_amount, v_bonus);
  v_deduct_purchased := p_amount - v_deduct_bonus;

  UPDATE public.profiles
  SET balance = balance - p_amount,
      bonus_balance = bonus_balance - v_deduct_bonus,
      purchased_balance = purchased_balance - v_deduct_purchased,
      updated_at = now()
  WHERE id = p_player_id
  RETURNING balance INTO v_new_balance;

  -- Legacy transaction
  INSERT INTO public.transactions (player_id, type, amount, balance_after, description)
  VALUES (p_player_id, 'withdrawal', -p_amount, v_new_balance,
          'Withdrawal - ' || p_amount || ' credits');

  -- Ledger entries per bucket
  IF v_deduct_bonus > 0 THEN
    INSERT INTO public.wallet_ledger (
      user_id, tx_type, bucket, amount,
      balance_after, bucket_balance_after,
      description
    ) VALUES (
      p_player_id, 'withdrawal', 'bonus', -v_deduct_bonus,
      v_balance - v_deduct_bonus,
      v_bonus - v_deduct_bonus,
      'Withdrawal (bonus credits)'
    );
  END IF;

  IF v_deduct_purchased > 0 THEN
    INSERT INTO public.wallet_ledger (
      user_id, tx_type, bucket, amount,
      balance_after, bucket_balance_after,
      description
    ) VALUES (
      p_player_id, 'withdrawal', 'purchased', -v_deduct_purchased,
      v_new_balance,
      v_purchased - v_deduct_purchased,
      'Withdrawal (purchased credits)'
    );
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. UPDATE admin_adjust_balance — add ledger
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
  v_new_bonus BIGINT;
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

  -- Admin adjustments go to/from bonus bucket
  UPDATE public.profiles
  SET balance = v_new_balance,
      bonus_balance = GREATEST(0, bonus_balance + p_amount),
      updated_at = now()
  WHERE id = p_target_id
  RETURNING bonus_balance INTO v_new_bonus;

  -- Legacy transaction
  INSERT INTO public.transactions (player_id, type, amount, balance_after, description)
  VALUES (p_target_id, v_tx_type, ABS(p_amount), v_new_balance,
          p_reason || ' (by admin ' || LEFT(p_admin_id::text, 8) || ')');

  -- Ledger entry
  INSERT INTO public.wallet_ledger (
    user_id, tx_type, bucket, amount,
    balance_after, bucket_balance_after,
    description, created_by,
    metadata
  ) VALUES (
    p_target_id, v_tx_type, 'bonus', p_amount,
    v_new_balance, v_new_bonus,
    p_reason,
    p_admin_id,
    jsonb_build_object('admin_id', p_admin_id, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'adjustment', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. RECONCILIATION FUNCTION
-- ============================================
-- Returns rows where cached balance != ledger sum
-- Should return 0 rows if everything is correct
CREATE OR REPLACE FUNCTION public.reconcile_wallet_ledger()
RETURNS TABLE (
  user_id UUID,
  cached_balance BIGINT,
  ledger_balance BIGINT,
  discrepancy BIGINT,
  cached_bonus BIGINT,
  ledger_bonus BIGINT,
  bonus_discrepancy BIGINT,
  cached_purchased BIGINT,
  ledger_purchased BIGINT,
  purchased_discrepancy BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.balance AS cached_balance,
    COALESCE(l.total, 0)::BIGINT AS ledger_balance,
    (p.balance - COALESCE(l.total, 0))::BIGINT AS discrepancy,
    p.bonus_balance AS cached_bonus,
    COALESCE(l.bonus_total, 0)::BIGINT AS ledger_bonus,
    (p.bonus_balance - COALESCE(l.bonus_total, 0))::BIGINT AS bonus_discrepancy,
    p.purchased_balance AS cached_purchased,
    COALESCE(l.purchased_total, 0)::BIGINT AS ledger_purchased,
    (p.purchased_balance - COALESCE(l.purchased_total, 0))::BIGINT AS purchased_discrepancy
  FROM public.profiles p
  LEFT JOIN (
    SELECT
      wl.user_id,
      SUM(wl.amount) AS total,
      SUM(CASE WHEN wl.bucket = 'bonus' THEN wl.amount ELSE 0 END) AS bonus_total,
      SUM(CASE WHEN wl.bucket = 'purchased' THEN wl.amount ELSE 0 END) AS purchased_total
    FROM public.wallet_ledger wl
    GROUP BY wl.user_id
  ) l ON l.user_id = p.id
  WHERE
    -- Only return rows with discrepancies (but include all users with ledger entries)
    l.user_id IS NOT NULL
    AND (
      p.balance != COALESCE(l.total, 0)
      OR p.bonus_balance != COALESCE(l.bonus_total, 0)
      OR p.purchased_balance != COALESCE(l.purchased_total, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. BACKFILL: Seed ledger from existing txns
-- ============================================
-- This creates a single "genesis" ledger entry per user
-- representing their current balance as a bonus-bucket credit.
-- This ensures the ledger sum matches cached balance from day 1.
INSERT INTO public.wallet_ledger (
  user_id, tx_type, bucket, amount,
  balance_after, bucket_balance_after,
  description, idempotency_key
)
SELECT
  p.id,
  'adjustment',
  'bonus',
  p.balance,
  p.balance,
  p.balance,
  'Genesis: backfill from pre-ledger balance',
  'genesis:' || p.id::text
FROM public.profiles p
WHERE p.balance > 0
ON CONFLICT (idempotency_key) DO NOTHING;

COMMIT;
