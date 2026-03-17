-- Achievements tracking table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, achievement_id)
);

CREATE INDEX idx_achievements_player ON achievements(player_id);

-- RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON achievements FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "Server can insert achievements" ON achievements FOR INSERT WITH CHECK (true);
