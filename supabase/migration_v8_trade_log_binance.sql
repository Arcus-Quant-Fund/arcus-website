-- Migration v8: Binance-sourced trade history
-- Adds commission_usdt and source columns to trade_log
-- Apply in Supabase SQL Editor

ALTER TABLE trade_log
  ADD COLUMN IF NOT EXISTS commission_usdt float8,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'sqlite';

-- Mark all existing SQLite-synced rows so they can be filtered separately
UPDATE trade_log SET source = 'sqlite' WHERE source IS NULL;

-- Index for fast source-filtered queries on the dashboard
CREATE INDEX IF NOT EXISTS trade_log_source_idx
  ON trade_log (client_id, source, timestamp DESC);
