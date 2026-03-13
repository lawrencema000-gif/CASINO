-- ============================================
-- CASINO DATABASE SCHEMA
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  balance BIGINT NOT NULL DEFAULT 10000,
  total_wagered BIGINT NOT NULL DEFAULT 0,
  total_won BIGINT NOT NULL DEFAULT 0,
  games_played BIGINT NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  exp BIGINT NOT NULL DEFAULT 0,
  vip_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (vip_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can view usernames" ON public.profiles
  FOR SELECT USING (true);

-- ============================================
-- 2. GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('slots', 'blackjack', 'roulette', 'dice', 'coinflip', 'crash', 'plinko', 'poker', 'lottery', 'jackpot')),
  bet_amount BIGINT NOT NULL CHECK (bet_amount > 0),
  server_seed_hash TEXT,
  client_seed TEXT,
  nonce INTEGER,
  result JSONB,
  payout BIGINT NOT NULL DEFAULT 0,
  multiplier NUMERIC(10, 4),
  settled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own games" ON public.games
  FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Service role full access games" ON public.games
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_games_player_id ON public.games(player_id);
CREATE INDEX idx_games_type ON public.games(game_type);
CREATE INDEX idx_games_created ON public.games(created_at DESC);

-- ============================================
-- 3. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win', 'bonus', 'refund')),
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  game_id UUID REFERENCES public.games(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Service role full access transactions" ON public.transactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_transactions_player_id ON public.transactions(player_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON public.transactions(type);

-- ============================================
-- 4. JACKPOTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.jackpots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_type TEXT NOT NULL UNIQUE,
  pool_amount BIGINT NOT NULL DEFAULT 0,
  rake_bps INTEGER NOT NULL DEFAULT 500,
  last_winner_id UUID REFERENCES public.profiles(id),
  last_payout BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jackpots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view jackpots" ON public.jackpots
  FOR SELECT USING (true);

CREATE POLICY "Service role full access jackpots" ON public.jackpots
  FOR ALL USING (auth.role() = 'service_role');

INSERT INTO public.jackpots (game_type, pool_amount) VALUES
  ('slots', 50000),
  ('poker', 25000),
  ('jackpot', 100000)
ON CONFLICT (game_type) DO NOTHING;

-- ============================================
-- 5. DAILY BONUSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_streak INTEGER NOT NULL DEFAULT 1,
  last_claimed TIMESTAMPTZ NOT NULL DEFAULT now(),
  bonus_amount BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bonuses" ON public.daily_bonuses
  FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Service role full access bonuses" ON public.daily_bonuses
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Player_' || LEFT(NEW.id::text, 8)),
    10000
  );

  INSERT INTO public.transactions (player_id, type, amount, balance_after, description)
  VALUES (
    NEW.id,
    'bonus',
    10000,
    10000,
    'Welcome bonus - 10,000 free credits!'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 7. ATOMIC BET PROCESSING
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

-- ============================================
-- 8. ATOMIC GAME SETTLEMENT
-- ============================================
CREATE OR REPLACE FUNCTION public.settle_game(
  p_game_id UUID,
  p_player_id UUID,
  p_result JSONB,
  p_payout BIGINT,
  p_multiplier NUMERIC
) RETURNS BIGINT AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  UPDATE public.games
  SET result = p_result,
      payout = p_payout,
      multiplier = p_multiplier,
      settled = true
  WHERE id = p_game_id AND player_id = p_player_id;

  IF p_payout > 0 THEN
    UPDATE public.profiles
    SET balance = balance + p_payout,
        total_won = total_won + p_payout,
        exp = exp + (p_payout / 100),
        updated_at = now()
    WHERE id = p_player_id
    RETURNING balance INTO v_new_balance;

    INSERT INTO public.transactions (player_id, type, amount, balance_after, game_id, description)
    VALUES (
      p_player_id,
      'win',
      p_payout,
      v_new_balance,
      p_game_id,
      'Won ' || p_payout || ' credits'
    );
  ELSE
    SELECT balance INTO v_new_balance FROM public.profiles WHERE id = p_player_id;
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. AUTO LEVEL & VIP TIER UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION public.update_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := GREATEST(1, FLOOR(SQRT(NEW.exp / 100.0))::INTEGER + 1);

  IF NEW.total_wagered >= 10000000 THEN
    NEW.vip_tier := 'diamond';
  ELSIF NEW.total_wagered >= 1000000 THEN
    NEW.vip_tier := 'platinum';
  ELSIF NEW.total_wagered >= 100000 THEN
    NEW.vip_tier := 'gold';
  ELSIF NEW.total_wagered >= 10000 THEN
    NEW.vip_tier := 'silver';
  ELSE
    NEW.vip_tier := 'bronze';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_player_level ON public.profiles;
CREATE TRIGGER update_player_level
  BEFORE UPDATE OF exp, total_wagered ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_level();

-- ============================================
-- 10. ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jackpots;
