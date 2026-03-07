-- ============================================================
-- migration_v13_security_fixes.sql
-- Fix Supabase security linter errors:
--   1. client_summary view: SECURITY DEFINER → SECURITY INVOKER
--   2. key_events table: enable RLS
--   3. performance_stats table: enable RLS
-- ============================================================

-- ── 1. Fix client_summary view (SECURITY DEFINER → SECURITY INVOKER) ─────────
-- The view was created with SECURITY DEFINER, which means it runs with the
-- view creator's permissions and bypasses RLS on underlying tables.
-- Recreating with security_invoker = on forces the view to respect the
-- querying user's RLS policies instead.

drop view if exists public.client_summary;

create or replace view public.client_summary
  with (security_invoker = on)
as
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

-- ── 2. Enable RLS on key_events ───────────────────────────────────────────────
-- key_events is a public table exposed to PostgREST without RLS.
-- Enable RLS with read-only public access (marketing/fund milestone data)
-- and restrict writes to service_role only.

alter table public.key_events enable row level security;

-- Anyone (including anon) can read key_events (public fund timeline/milestones)
drop policy if exists "key_events_public_read" on public.key_events;
create policy "key_events_public_read"
  on public.key_events
  for select
  using (true);

-- Only service_role can insert/update/delete (no policy = denied for other roles)

-- ── 3. Enable RLS on performance_stats ───────────────────────────────────────
-- performance_stats is a public table exposed to PostgREST without RLS.
-- Enable RLS with read-only public access (fund performance data for website).

alter table public.performance_stats enable row level security;

-- Anyone (including anon) can read performance_stats (public marketing data)
drop policy if exists "performance_stats_public_read" on public.performance_stats;
create policy "performance_stats_public_read"
  on public.performance_stats
  for select
  using (true);

-- Only service_role can insert/update/delete (no policy = denied for other roles)
