-- Migration v7: Binance API enrichment — open orders, BNB burn, interest, liquidations
-- Run in Supabase SQL Editor

-- bot_state: add open orders snapshot and BNB burn status
ALTER TABLE bot_state
  ADD COLUMN IF NOT EXISTS open_orders_json  text,        -- JSON array of pending orders
  ADD COLUMN IF NOT EXISTS bnb_burn_active   boolean,     -- spotBNBBurn: 25% fee discount
  ADD COLUMN IF NOT EXISTS last_liquidation  timestamptz; -- most recent force-liquidation time (null = never)

-- trade_fees_monthly: add borrowing interest column
ALTER TABLE trade_fees_monthly
  ADD COLUMN IF NOT EXISTS borrowing_interest_usdt float8 DEFAULT 0; -- daily margin interest paid to Binance

-- liquidation_events: immutable record of any force liquidations
CREATE TABLE IF NOT EXISTS liquidation_events (
  id          bigserial PRIMARY KEY,
  client_id   uuid REFERENCES clients(id),
  bot_id      text,
  symbol      text,
  price       float8,
  qty         float8,
  side        text,
  occurred_at timestamptz,
  raw_json    jsonb,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE liquidation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on liquidation_events" ON liquidation_events
  USING (true) WITH CHECK (true);
