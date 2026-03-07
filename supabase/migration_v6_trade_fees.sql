-- Migration v6: Monthly exchange fee tracking
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS trade_fees_monthly (
  client_id uuid REFERENCES clients(id),
  year int NOT NULL,
  month int NOT NULL,
  exchange_fees_usdt float8 DEFAULT 0,
  trade_count int DEFAULT 0,
  last_synced timestamptz DEFAULT now(),
  PRIMARY KEY (client_id, year, month)
);

ALTER TABLE trade_fees_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on trade_fees_monthly" ON trade_fees_monthly
  USING (true) WITH CHECK (true);

-- Allow clients to read their own fee rows
CREATE POLICY "Clients can read own trade_fees_monthly" ON trade_fees_monthly
  FOR SELECT USING (client_id = auth.uid());
