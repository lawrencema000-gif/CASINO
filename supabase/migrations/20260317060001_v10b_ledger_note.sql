-- Add missing note column to wallet_ledger
ALTER TABLE public.wallet_ledger ADD COLUMN IF NOT EXISTS note TEXT;
