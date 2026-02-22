import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const supabase = createServiceClient();

  // 1 — Resolve this user's bot_id from the clients table
  const { data: clientRow } = await supabase
    .from("clients")
    .select("bot_id")
    .eq("id", session.user.id)
    .single();

  // Fall back to 'eth2' placeholder until clients table is fully mapped
  const botId = clientRow?.bot_id ?? "eth2";

  // 2 — Fetch bot state (single live row per bot)
  const { data: botStateRow } = await supabase
    .from("bot_state")
    .select("*")
    .eq("client_id", botId)
    .single();

  // 3 — Fetch price data (last 500 candles, ascending for chart)
  const { data: priceRows } = await supabase
    .from("price_data")
    .select("timestamp, open, high, low, close, volume, vwap, vwap_ema")
    .eq("client_id", botId)
    .order("timestamp", { ascending: false })
    .limit(500);

  // 4 — Fetch trade log (most recent 200)
  const { data: tradeRows } = await supabase
    .from("trade_log")
    .select("trade_id, timestamp, symbol, side, price, quantity, amount, pnl, pnl_percent, reason")
    .eq("client_id", botId)
    .order("timestamp", { ascending: false })
    .limit(200);

  // 5 — Fetch balance history (last 100 snapshots, ascending for chart)
  const { data: balanceRows } = await supabase
    .from("balance_history")
    .select("balance, recorded_at")
    .eq("client_id", botId)
    .order("recorded_at", { ascending: true })
    .limit(100);

  return (
    <DashboardClient
      session={session}
      botState={botStateRow ?? null}
      priceData={priceRows ?? []}
      trades={tradeRows ?? []}
      balanceHistory={balanceRows ?? []}
    />
  );
}
