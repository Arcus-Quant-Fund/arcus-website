-- ============================================================
-- Arcus Quant Fund — Schema v2
-- Run in Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Bot state: one live row per bot, updated every 60s by sync script
create table if not exists bot_state (
  client_id text primary key,
  timestamp timestamptz,
  symbol text default 'XRPUSDT',
  position text,
  entry_price float8,
  extreme_price float8,
  is_uptrend boolean default false,
  current_amount float8,
  current_quantity float8,
  last_dc_price float8,
  leverage float8 default 3.5,
  margin_type text default 'ISOLATED',
  updated_at timestamptz default now()
);
alter table bot_state enable row level security;
create policy "Service role full access on bot_state" on bot_state
  using (true) with check (true);

-- Price data: recent OHLCV candles for charts
create table if not exists price_data (
  id bigserial primary key,
  client_id text not null,
  timestamp timestamptz not null,
  open float8,
  high float8,
  low float8,
  close float8,
  volume float8,
  vwap float8,
  vwap_ema float8,
  unique(client_id, timestamp)
);
alter table price_data enable row level security;
create policy "Service role full access on price_data" on price_data
  using (true) with check (true);

-- Trade log: all executed trades per bot
create table if not exists trade_log (
  id bigserial primary key,
  client_id text not null,
  trade_id text,
  timestamp timestamptz,
  symbol text,
  side text,
  price float8,
  quantity float8,
  amount float8,
  pnl float8,
  pnl_percent float8,
  reason text,
  unique(client_id, trade_id)
);
alter table trade_log enable row level security;
create policy "Service role full access on trade_log" on trade_log
  using (true) with check (true);

-- Add bot_id to clients table so users map to their bot
alter table clients add column if not exists bot_id text;
