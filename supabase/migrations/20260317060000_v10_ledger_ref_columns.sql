-- ============================================
-- FORTUNA CASINO Migration V10: Add ref columns to wallet_ledger
-- Date: 2026-03-17
-- ============================================

BEGIN;

ALTER TABLE public.wallet_ledger ADD COLUMN IF NOT EXISTS ref_type TEXT;
ALTER TABLE public.wallet_ledger ADD COLUMN IF NOT EXISTS ref_id UUID;

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_ref ON public.wallet_ledger(ref_type, ref_id) WHERE ref_type IS NOT NULL;

COMMIT;
