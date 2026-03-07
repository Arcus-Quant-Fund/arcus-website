-- ============================================================
-- Migration v12: fiat_currency on client_applications
-- Run in Supabase SQL Editor AFTER migration_v11
-- ============================================================

ALTER TABLE client_applications
  ADD COLUMN IF NOT EXISTS fiat_currency TEXT DEFAULT 'USD';

COMMENT ON COLUMN client_applications.fiat_currency IS
  'Client preferred currency for monthly report P2P rate conversion (e.g. BDT, AED, USD).';
