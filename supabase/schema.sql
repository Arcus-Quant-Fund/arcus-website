-- ============================================================
-- ARCUS QUANT FUND — DATABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CLIENTS
-- One row per client. Linked to Supabase auth.users via id.
-- ============================================================
create table if not exists public.clients (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         text not null unique,
  account_id    text,                    -- broker/exchange account ID
  exchange      text default 'Binance',  -- Binance | Bybit | IB
  strategy      text default 'DC-VWAP', -- strategy assigned
  start_date    date,
  initial_capital numeric(15,2) default 0,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- ============================================================
-- BALANCE HISTORY
-- Daily snapshot of client account balance (for the chart)
-- ============================================================
create table if not exists public.balance_history (
  id         bigserial primary key,
  client_id  uuid not null references public.clients(id) on delete cascade,
  balance    numeric(15,2) not null,
  equity     numeric(15,2),
  recorded_at timestamptz default now()
);

create index if not exists idx_balance_history_client on public.balance_history(client_id, recorded_at desc);

-- ============================================================
-- OPEN POSITIONS
-- Live open trades for each client
-- ============================================================
create table if not exists public.positions (
  id            bigserial primary key,
  client_id     uuid not null references public.clients(id) on delete cascade,
  symbol        text not null,           -- e.g. 'XRPUSDT'
  side          text not null,           -- 'long' | 'short'
  size          numeric(18,6) not null,
  entry_price   numeric(18,6) not null,
  current_price numeric(18,6),
  unrealized_pnl numeric(15,2),
  leverage      numeric(5,2) default 1,
  opened_at     timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_positions_client on public.positions(client_id);

-- ============================================================
-- TRADES (closed)
-- Complete history of all executed trades
-- ============================================================
create table if not exists public.trades (
  id            bigserial primary key,
  client_id     uuid not null references public.clients(id) on delete cascade,
  symbol        text not null,
  side          text not null,           -- 'long' | 'short'
  size          numeric(18,6) not null,
  entry_price   numeric(18,6) not null,
  exit_price    numeric(18,6) not null,
  pnl           numeric(15,2) not null,
  pnl_pct       numeric(8,4),
  fee           numeric(15,6) default 0,
  strategy      text,
  opened_at     timestamptz not null,
  closed_at     timestamptz default now()
);

create index if not exists idx_trades_client on public.trades(client_id, closed_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- Each client can only see their own data
-- ============================================================
alter table public.clients          enable row level security;
alter table public.balance_history  enable row level security;
alter table public.positions        enable row level security;
alter table public.trades           enable row level security;

-- Clients: see own row only
create policy "client_own" on public.clients
  for select using (auth.uid() = id);

-- Balance history: own data only
create policy "balance_own" on public.balance_history
  for select using (auth.uid() = client_id);

-- Positions: own data only
create policy "positions_own" on public.positions
  for select using (auth.uid() = client_id);

-- Trades: own data only
create policy "trades_own" on public.trades
  for select using (auth.uid() = client_id);

-- ============================================================
-- DASHBOARD SUMMARY VIEW
-- Convenient view for the dashboard stats cards
-- ============================================================
create or replace view public.client_summary as
select
  c.id,
  c.name,
  c.email,
  c.strategy,
  c.exchange,
  c.initial_capital,
  -- Latest balance
  (select balance from public.balance_history bh
   where bh.client_id = c.id
   order by recorded_at desc limit 1) as current_balance,
  -- Total P&L
  (select coalesce(sum(pnl), 0) from public.trades t
   where t.client_id = c.id) as total_pnl,
  -- Monthly P&L (current month)
  (select coalesce(sum(pnl), 0) from public.trades t
   where t.client_id = c.id
   and date_trunc('month', closed_at) = date_trunc('month', now())) as monthly_pnl,
  -- Win rate
  (select
     case when count(*) = 0 then 0
     else round(100.0 * count(*) filter (where pnl > 0) / count(*), 1)
     end
   from public.trades t where t.client_id = c.id) as win_rate,
  -- Total trades
  (select count(*) from public.trades t where t.client_id = c.id) as total_trades
from public.clients c
where c.is_active = true;

-- ============================================================
-- HELPER: Insert a new client (run as admin/service role)
-- ============================================================
-- After creating the user in Supabase Auth, run:
-- insert into public.clients (id, name, email, start_date, initial_capital)
-- values ('<auth_user_id>', 'Dr. Rafiqul Bhuyan', 'dr.bhuyan@email.com', '2026-02-22', 50000);
