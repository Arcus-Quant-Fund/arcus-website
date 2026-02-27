import { createClient } from "@supabase/supabase-js";
import TrackRecordClient from "./TrackRecordClient";

// Revalidate every 60 seconds — matches sync script interval
export const revalidate = 60;

// Track record period: Sep 2025 onward (when margin strategy fully established)
const PERIOD_START = "2025-09-01";

async function getTrackRecordData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );

  const [{ data: stats }, { data: trades }, { data: allTrades }, , { data: snapshots }] =
    await Promise.all([
      supabase
        .from("performance_stats")
        .select("*")
        .eq("client_id", "eth")
        .single(),
      // SELL-only trades for equity curve — filtered to the stated period
      supabase
        .from("trade_log")
        .select("timestamp, pnl, pnl_percent, reason, trade_id")
        .eq("client_id", "eth")
        .eq("side", "SELL")
        .not("pnl", "is", null)
        .gte("timestamp", PERIOD_START)
        .order("timestamp", { ascending: true }),
      // All trades (BUY + SELL) for the 4h chart markers
      supabase
        .from("trade_log")
        .select("trade_id, timestamp, side, price, pnl, amount")
        .eq("client_id", "eth")
        .gte("timestamp", PERIOD_START)
        .order("timestamp", { ascending: true }),
      supabase
        .from("key_events")
        .select("event_date, event_type, headline, body, trade_pct, equity_level, color")
        .eq("client_id", "eth")
        .order("event_date", { ascending: true }),
      // Monthly snapshots for Sep 2025+ — used for accurate compound TWR headline metric
      supabase
        .from("monthly_snapshots")
        .select("year, month, opening_balance, gross_pnl")
        .eq("client_id", "a1121d0e-e945-45c6-8d83-5dc9445d5469")
        .or("year.gt.2025,and(year.eq.2025,month.gte.9)")
        .order("year", { ascending: true })
        .order("month", { ascending: true }),
    ]);

  // Compute compound TWR from monthly snapshots for the stated period.
  // This is the correct metric: gross_pnl / opening_balance compounded monthly,
  // independent of deposits/withdrawals and fixed-position-size bias.
  let twrFactor = 1.0;
  for (const s of snapshots ?? []) {
    if (s.opening_balance > 0) {
      twrFactor *= 1 + s.gross_pnl / s.opening_balance;
    }
  }
  const periodTWR = (twrFactor - 1) * 100;

  return {
    stats: stats ?? null,
    trades: trades ?? [],
    allTrades: allTrades ?? [],
    periodTWR,
  };
}

export default async function TrackRecordPage() {
  const { stats, trades, allTrades, periodTWR } = await getTrackRecordData();
  return (
    <TrackRecordClient
      stats={stats}
      trades={trades}
      allTrades={allTrades}
      periodTWR={periodTWR}
    />
  );
}
