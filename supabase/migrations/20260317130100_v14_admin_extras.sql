-- Admin audit logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT, -- 'user', 'game', 'setting', 'promo'
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);

-- Platform settings (key-value store)
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO platform_settings (key, value) VALUES
  ('general', '{"siteName": "Fortuna Casino", "maintenanceMode": false}'::jsonb),
  ('games', '{"minBet": 10, "maxBet": 100000, "defaultHouseEdge": 0.03}'::jsonb),
  ('bonuses', '{"welcomeBonus": 10000, "dailyBonusBase": 500}'::jsonb),
  ('registration', '{"emailVerificationRequired": true, "ageGateEnabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
