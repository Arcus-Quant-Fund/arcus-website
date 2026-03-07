-- ============================================================
-- ARCUS QUANT FUND — Migration v5
-- Add binance_tx_id dedup guard to capital_events
--
-- Bug fixed: Python sync script used transfer_state.json as the
-- only dedup guard. If the Oracle server rebooted mid-write or
-- the screen session duplicated, the same Binance transfer could
-- produce duplicate DEPOSIT/WITHDRAWAL rows → phantom P&L.
--
-- Fix: unique partial index on (client_id, binance_tx_id) where
-- binance_tx_id IS NOT NULL. Manual admin entries (recorded_by='admin')
-- keep binance_tx_id = NULL and are not affected by this constraint.
-- Auto-detected transfers: duplicate txId for same client is silently
-- ignored (ON CONFLICT DO NOTHING via Supabase upsert).
--
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

ALTER TABLE public.capital_events
  ADD COLUMN IF NOT EXISTS binance_tx_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS capital_events_binance_tx_id_unique
  ON public.capital_events (client_id, binance_tx_id)
  WHERE binance_tx_id IS NOT NULL;

-- Verify
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'capital_events' AND column_name = 'binance_tx_id';
