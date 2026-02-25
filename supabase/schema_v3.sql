-- ============================================================
-- ARCUS QUANT FUND — Schema v3
-- Record Keeping, Audit Trail & Exchange Rates
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ============================================================
-- AUDIT LOG
-- Append-only immutable record of every financial event.
-- No UPDATE or DELETE policies — every dollar is permanently
-- traceable.
-- ============================================================
create table if not exists public.audit_log (
  id            bigserial primary key,
  client_id     uuid not null references public.clients(id) on delete cascade,
  event_type    text not null check (event_type in (
                  'DEPOSIT', 'WITHDRAWAL', 'TRADE_OPEN', 'TRADE_CLOSE',
                  'FEE', 'BALANCE_SNAPSHOT', 'REPORT_SENT',
                  'RATE_FETCH', 'POSITION_UPDATE'
                )),
  amount        float8,              -- signed: positive = money in, negative = money out
  balance_before float8,
  balance_after  float8,
  description   text,
  metadata      jsonb default '{}',  -- extra context (bot_id, symbol, trade_id, etc.)
  created_at    timestamptz default now()
);

create index if not exists idx_audit_log_client   on public.audit_log(client_id, created_at desc);
create index if not exists idx_audit_log_type     on public.audit_log(event_type, created_at desc);

alter table public.audit_log enable row level security;
-- Service role: full insert + select (immutable — no update/delete)
create policy "audit_service_insert" on public.audit_log
  for insert with check (true);
create policy "audit_service_select" on public.audit_log
  for select using (true);
-- Clients can read their own audit entries
create policy "audit_client_select" on public.audit_log
  for select using (auth.uid() = client_id);


-- ============================================================
-- MONTHLY SNAPSHOTS
-- Pre-computed per-client monthly performance stats.
-- Written by the monthly-report cron job every 1st of month.
-- ============================================================
create table if not exists public.monthly_snapshots (
  id                 bigserial primary key,
  client_id          uuid not null references public.clients(id) on delete cascade,
  year               int not null,
  month              int not null,  -- 1 = January, 12 = December

  -- Balances
  opening_balance    float8,        -- balance at start of month (USDT)
  closing_balance    float8,        -- balance at end of month (USDT)

  -- P&L
  gross_pnl          float8 default 0,
  carried_loss_in    float8 default 0, -- loss carried in from prior month
  net_pnl            float8 default 0, -- gross_pnl - carried_loss_in
  performance_fee    float8 default 0, -- Arcus fee = net_pnl * profit_share_pct (if net_pnl > 0)
  carried_loss_out   float8 default 0, -- loss carried forward to next month

  -- Trade stats
  total_trades       int default 0,
  winning_trades     int default 0,
  losing_trades      int default 0,
  win_rate           float8,            -- %
  profit_factor      float8,
  best_trade_pnl     float8,
  worst_trade_pnl    float8,
  avg_win            float8,
  avg_loss           float8,

  -- Report delivery
  report_sent_at     timestamptz,
  report_sent_to     text,

  created_at         timestamptz default now(),

  unique(client_id, year, month)
);

create index if not exists idx_monthly_client on public.monthly_snapshots(client_id, year desc, month desc);

alter table public.monthly_snapshots enable row level security;
create policy "monthly_service" on public.monthly_snapshots
  using (true) with check (true);
create policy "monthly_client_select" on public.monthly_snapshots
  for select using (auth.uid() = client_id);


-- ============================================================
-- EXCHANGE RATES
-- Daily P2P rates per currency pair (Binance P2P, bank transfer,
-- 1000+ USDT trades). Used to show clients their USDT balance
-- value in their local fiat currency.
-- ============================================================
create table if not exists public.exchange_rates (
  id            bigserial primary key,
  asset         text not null default 'USDT',
  fiat          text not null,          -- e.g. 'BDT', 'USD', 'PKR'
  lower_bound   float8 not null,        -- worst rate (min fiat per USDT, client selling USDT)
  upper_bound   float8 not null,        -- best rate (max fiat per USDT, client selling USDT)
  mid_rate      float8 not null,        -- median of sampled ads
  ad_count      int default 0,          -- how many P2P ads sampled
  source        text default 'Binance P2P',
  fetched_at    timestamptz default now()
);

create index if not exists idx_exchange_rates_pair on public.exchange_rates(asset, fiat, fetched_at desc);

alter table public.exchange_rates enable row level security;
create policy "rates_service" on public.exchange_rates
  using (true) with check (true);
-- All authenticated clients can read exchange rates
create policy "rates_client_select" on public.exchange_rates
  for select using (auth.role() = 'authenticated');


-- ============================================================
-- ALTER CLIENTS TABLE
-- Add new columns needed for the record-keeping system.
-- ============================================================
alter table public.clients
  add column if not exists fiat_currency    text    default 'BDT',
  add column if not exists profit_share_pct float8  default 0.50,  -- Arcus performance fee %
  add column if not exists carried_loss     float8  default 0.00;  -- cumulative unrecovered loss


-- ============================================================
-- HELPER: Seed exchange rate manually (for testing)
-- ============================================================
-- insert into public.exchange_rates (asset, fiat, lower_bound, upper_bound, mid_rate, ad_count)
-- values ('USDT', 'BDT', 127.00, 128.50, 127.75, 10);
