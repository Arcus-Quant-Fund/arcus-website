import { createClient } from "@supabase/supabase-js";
import TrackRecordClient from "./TrackRecordClient";

// Revalidate every 60 seconds — matches sync script interval
export const revalidate = 60;

async function getTrackRecordData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );

  const [{ data: stats }, { data: trades }, { data: keyEvents }] = await Promise.all([
    supabase
      .from("performance_stats")
      .select("*")
      .eq("client_id", "eth")
      .single(),
    supabase
      .from("trade_log")
      .select("timestamp, pnl, pnl_percent, reason")
      .eq("client_id", "eth")
      .eq("side", "SELL")
      .not("pnl", "is", null)
      .order("timestamp", { ascending: true }),
    supabase
      .from("key_events")
      .select("event_date, event_type, headline, body, trade_pct, equity_level, color")
      .eq("client_id", "eth")
      .order("event_date", { ascending: true }),
  ]);

  return {
    stats: stats ?? null,
    trades: trades ?? [],
    keyEvents: keyEvents ?? [],
  };
}

export default async function TrackRecordPage() {
  const { stats, trades, keyEvents } = await getTrackRecordData();
  return <TrackRecordClient stats={stats} trades={trades} keyEvents={keyEvents} />;
}
