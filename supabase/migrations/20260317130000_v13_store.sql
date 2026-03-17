-- ============================================================
-- V13: Store / Purchases
-- ============================================================

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id),
  package_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  amount_paid INTEGER NOT NULL, -- cents
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_player ON purchases(player_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session ON purchases(stripe_session_id);

-- RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own purchases' AND tablename = 'purchases'
  ) THEN
    CREATE POLICY "Users can view own purchases" ON purchases FOR SELECT USING (auth.uid() = player_id);
  END IF;
END $$;

-- First purchase bonus tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_purchase_at TIMESTAMPTZ;
