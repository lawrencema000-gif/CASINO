-- ============================================
-- V12: Tournament / Event System
-- ============================================

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  game_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  entry_fee INTEGER NOT NULL DEFAULT 0,
  prize_pool INTEGER NOT NULL DEFAULT 0,
  max_players INTEGER NOT NULL DEFAULT 100,
  min_players INTEGER NOT NULL DEFAULT 2,
  min_vip_tier TEXT DEFAULT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  scoring_type TEXT NOT NULL DEFAULT 'highest_multiplier' CHECK (scoring_type IN ('highest_multiplier', 'total_winnings', 'most_games', 'biggest_win')),
  prize_distribution JSONB NOT NULL DEFAULT '[{"place": 1, "pct": 50}, {"place": 2, "pct": 25}, {"place": 3, "pct": 15}, {"place": 4, "pct": 10}]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tournament entries (participants)
CREATE TABLE IF NOT EXISTS tournament_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id),
  score NUMERIC NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  best_multiplier NUMERIC NOT NULL DEFAULT 0,
  total_wagered INTEGER NOT NULL DEFAULT 0,
  total_won INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  prize_awarded INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, player_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_starts_at ON tournaments(starts_at);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament ON tournament_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_player ON tournament_entries(player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_score ON tournament_entries(tournament_id, score DESC);

-- RPC: Join a tournament
CREATE OR REPLACE FUNCTION join_tournament(p_tournament_id UUID, p_player_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tournament RECORD;
  v_profile RECORD;
  v_entry_count INTEGER;
BEGIN
  -- Get tournament
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Tournament not found');
  END IF;

  IF v_tournament.status != 'upcoming' AND v_tournament.status != 'active' THEN
    RETURN jsonb_build_object('error', 'Tournament is not open for registration');
  END IF;

  -- Check player count
  SELECT COUNT(*) INTO v_entry_count FROM tournament_entries WHERE tournament_id = p_tournament_id;
  IF v_entry_count >= v_tournament.max_players THEN
    RETURN jsonb_build_object('error', 'Tournament is full');
  END IF;

  -- Check VIP requirement
  IF v_tournament.min_vip_tier IS NOT NULL THEN
    SELECT * INTO v_profile FROM profiles WHERE id = p_player_id;
    -- Simple tier ordering check
    IF v_profile.vip_tier IS NULL OR (
      v_tournament.min_vip_tier = 'silver' AND v_profile.vip_tier = 'bronze'
    ) OR (
      v_tournament.min_vip_tier = 'gold' AND v_profile.vip_tier IN ('bronze', 'silver')
    ) OR (
      v_tournament.min_vip_tier = 'platinum' AND v_profile.vip_tier IN ('bronze', 'silver', 'gold')
    ) OR (
      v_tournament.min_vip_tier = 'diamond' AND v_profile.vip_tier IN ('bronze', 'silver', 'gold', 'platinum')
    ) THEN
      RETURN jsonb_build_object('error', 'VIP tier too low. Required: ' || v_tournament.min_vip_tier);
    END IF;
  END IF;

  -- Deduct entry fee
  IF v_tournament.entry_fee > 0 THEN
    SELECT * INTO v_profile FROM profiles WHERE id = p_player_id;
    IF v_profile.balance < v_tournament.entry_fee THEN
      RETURN jsonb_build_object('error', 'Insufficient balance for entry fee');
    END IF;

    UPDATE profiles SET balance = balance - v_tournament.entry_fee WHERE id = p_player_id;

    INSERT INTO transactions (player_id, type, amount, balance_after, description)
    VALUES (p_player_id, 'bet', v_tournament.entry_fee,
      (SELECT balance FROM profiles WHERE id = p_player_id),
      'Tournament entry: ' || v_tournament.name);
  END IF;

  -- Create entry
  INSERT INTO tournament_entries (tournament_id, player_id)
  VALUES (p_tournament_id, p_player_id)
  ON CONFLICT (tournament_id, player_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Update tournament scores (called after each game)
CREATE OR REPLACE FUNCTION update_tournament_score(
  p_player_id UUID,
  p_game_type TEXT,
  p_bet_amount INTEGER,
  p_payout INTEGER,
  p_multiplier NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- Update all active tournament entries for this player + game type
  UPDATE tournament_entries te
  SET
    score = CASE
      WHEN t.scoring_type = 'highest_multiplier' THEN GREATEST(te.score, p_multiplier)
      WHEN t.scoring_type = 'total_winnings' THEN te.total_won + GREATEST(0, p_payout - p_bet_amount)
      WHEN t.scoring_type = 'most_games' THEN te.games_played + 1
      WHEN t.scoring_type = 'biggest_win' THEN GREATEST(te.score, p_payout)
      ELSE te.score
    END,
    games_played = te.games_played + 1,
    best_multiplier = GREATEST(te.best_multiplier, p_multiplier),
    total_wagered = te.total_wagered + p_bet_amount,
    total_won = te.total_won + p_payout
  FROM tournaments t
  WHERE te.tournament_id = t.id
    AND te.player_id = p_player_id
    AND t.game_type = p_game_type
    AND t.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed sample tournaments
INSERT INTO tournaments (name, description, game_type, status, entry_fee, prize_pool, max_players, starts_at, ends_at, scoring_type) VALUES
  ('Weekly Slots Showdown', 'Spin to win! Highest single multiplier takes the prize pool.', 'slots', 'active', 100, 50000, 200, now() - interval '1 day', now() + interval '6 days', 'highest_multiplier'),
  ('Blackjack Masters', 'Show your card skills. Most total winnings in blackjack this week.', 'blackjack', 'upcoming', 250, 100000, 100, now() + interval '2 days', now() + interval '9 days', 'total_winnings'),
  ('Crash Kings', 'How high can you go? Biggest single crash win takes it all.', 'crash', 'upcoming', 50, 25000, 300, now() + interval '5 days', now() + interval '12 days', 'biggest_win'),
  ('Plinko Frenzy', 'Drop the most balls! Most games played in Plinko wins.', 'plinko', 'active', 0, 10000, 500, now() - interval '2 days', now() + interval '5 days', 'most_games');

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments are viewable by everyone"
  ON tournaments FOR SELECT USING (true);

CREATE POLICY "Tournament entries viewable by everyone"
  ON tournament_entries FOR SELECT USING (true);

CREATE POLICY "Users can insert their own entries"
  ON tournament_entries FOR INSERT WITH CHECK (auth.uid() = player_id);
