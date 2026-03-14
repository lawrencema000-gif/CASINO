-- FORTUNA CASINO Migration V2: Production Fixes
-- Run this in Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/yfppyfyuwbdllinmhqoa/sql

-- 1. Fix game_type constraint to allow all game types
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_game_type_check;
ALTER TABLE games ADD CONSTRAINT games_game_type_check
  CHECK (game_type::text = ANY(ARRAY['slots','blackjack','roulette','dice','coinflip','crash','plinko','poker','lottery','jackpot','mines','keno','limbo','hilo','holdem']));

-- 2. Fix transaction type constraint to allow admin operations
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type::text = ANY(ARRAY['deposit','withdrawal','bet','win','bonus','refund','admin_credit','admin_debit']));

-- 3. Add role column to profiles for admin system
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player';

-- 4. Fix settle_game to handle null game_id (for poker)
CREATE OR REPLACE FUNCTION settle_game(
  p_game_id UUID,
  p_player_id UUID,
  p_result JSONB,
  p_payout BIGINT,
  p_multiplier NUMERIC DEFAULT 1
) RETURNS BIGINT AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  -- Update game record if game_id is provided
  IF p_game_id IS NOT NULL THEN
    UPDATE games
    SET result = p_result,
        payout = p_payout,
        multiplier = p_multiplier,
        settled = true
    WHERE id = p_game_id AND player_id = p_player_id;
  END IF;

  -- Add payout to player balance
  IF p_payout > 0 THEN
    UPDATE profiles
    SET balance = balance + p_payout,
        total_won = total_won + p_payout,
        exp = exp + (p_payout / 100)
    WHERE id = p_player_id
    RETURNING balance INTO v_new_balance;

    -- Record win transaction
    INSERT INTO transactions (player_id, type, amount, balance_after, game_id, description)
    VALUES (p_player_id, 'win', p_payout, v_new_balance, p_game_id, 'Game payout');
  ELSE
    SELECT balance INTO v_new_balance FROM profiles WHERE id = p_player_id;
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
