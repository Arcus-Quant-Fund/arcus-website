-- Migration v4: Add margin level and liquidation price to bot_state
-- Run this in the Supabase dashboard SQL editor:
-- https://supabase.com/dashboard/project/idbnpxljkepzfizmrazb/sql/new

ALTER TABLE bot_state 
  ADD COLUMN IF NOT EXISTS margin_level float8,
  ADD COLUMN IF NOT EXISTS liq_price float8;

-- Comment: margin_level = Binance marginLevel (liquidation at 1.1)
-- liq_price = Binance liquidatePrice (XRP price that triggers forced liquidation)
