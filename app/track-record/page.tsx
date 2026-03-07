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

  const [{ data: stats }, { data: binanceTrades }, { data: binanceAllTrades }] =
    await Promise.all([
      supabase
        .from("performance_stats")
        .select("*")
        .eq("client_id", "eth")
        .single(),
      // SELL-only trades for equity curve.
      // Use source='sqlite' — the bot directly logs pnl_percent as margin ROI%
      // (price_return × leverage), which is what the equity index needs.
      // Binance-backfilled records have null or differently-computed pnl_percent.
      supabase
        .from("trade_log")
        .select("timestamp, pnl, pnl_percent, reason, trade_id")
        .eq("client_id", "eth")
        .eq("side", "SELL")
        .eq("source", "sqlite")
        .not("pnl", "is", null)
        .gte("timestamp", PERIOD_START)
        .order("timestamp", { ascending: true }),
      // All trades (BUY + SELL) for the 4h chart markers — sqlite source (always current)
      supabase
        .from("trade_log")
        .select("trade_id, timestamp, side, price, pnl, amount")
        .eq("client_id", "eth")
        .eq("source", "sqlite")
        .gte("timestamp", PERIOD_START)
        .order("timestamp", { ascending: true }),
    ]);

  // Fallback to all sources if no sqlite records
  let trades = binanceTrades ?? [];
  let allTrades = binanceAllTrades ?? [];

  if (trades.length === 0) {
    const { data: fallback } = await supabase
      .from("trade_log")
      .select("timestamp, pnl, pnl_percent, reason, trade_id")
      .eq("client_id", "eth")
      .eq("side", "SELL")
      .not("pnl", "is", null)
      .gte("timestamp", PERIOD_START)
      .order("timestamp", { ascending: true });
    trades = fallback ?? [];
  }

  if (allTrades.length === 0) {
    const { data: fallback } = await supabase
      .from("trade_log")
      .select("trade_id, timestamp, side, price, pnl, amount")
      .eq("client_id", "eth")
      .gte("timestamp", PERIOD_START)
      .order("timestamp", { ascending: true });
    allTrades = fallback ?? [];
  }

  return {
    stats: stats ?? null,
    trades,
    allTrades,
  };
}

export default async function TrackRecordPage() {
  const { stats, trades, allTrades } = await getTrackRecordData();
  return (
    <TrackRecordClient
      stats={stats}
      trades={trades}
      allTrades={allTrades}
    />
  );
}
