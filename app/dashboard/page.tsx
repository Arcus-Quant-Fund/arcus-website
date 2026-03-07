import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import ProvisioningPage from "@/components/ProvisioningPage";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const supabase = createServiceClient();

  // 1 — Resolve this user's client profile
  const { data: clientRow } = await supabase
    .from("clients")
    .select("bot_id, initial_capital")
    .eq("id", session.user.id)
    .single();

  // If no client row / bot_id yet, bot is still being provisioned by Oracle
  if (!clientRow?.bot_id) {
    return <ProvisioningPage />;
  }

  const botId = clientRow.bot_id;
  const initialCapital = clientRow.initial_capital ?? 0;

  // 2 — Fetch bot state (single live row per bot, all columns including new enrichment fields)
  const { data: botStateRow } = await supabase
    .from("bot_state")
    .select("symbol, position, entry_price, extreme_price, is_uptrend, current_amount, current_quantity, last_dc_price, leverage, margin_type, updated_at, margin_level, liq_price, open_orders_json, bnb_burn_active")
    .eq("client_id", botId)
    .single();

  // 3 — Fetch all available candles (backfilled to full bot lifetime)
  const { data: priceRows } = await supabase
    .from("price_data")
    .select("timestamp, open, high, low, close, volume, vwap, vwap_ema")
    .eq("client_id", botId)
    .order("timestamp", { ascending: false })
    .limit(50000);

  // 4 — Fetch trade log from SQLite-sourced records (synced every 60s, always up-to-date).
  //     The one-time Binance fill backfill is stale and missing recent trades.
  const tradeSelect = "trade_id, timestamp, symbol, side, price, quantity, amount, pnl, pnl_percent, reason, commission_usdt, source";
  const { data: sqliteTradeRows } = await supabase
    .from("trade_log")
    .select(tradeSelect)
    .eq("client_id", botId)
    .eq("source", "sqlite")
    .order("timestamp", { ascending: false })
    .limit(500);

  let tradeRows = sqliteTradeRows ?? [];
  if (!tradeRows.length) {
    const { data: allTradeRows } = await supabase
      .from("trade_log")
      .select(tradeSelect)
      .eq("client_id", botId)
      .order("timestamp", { ascending: false })
      .limit(500);
    tradeRows = allTradeRows ?? [];
  }

  // 5 — Fetch balance history (last 100 snapshots, ascending for chart)
  //     balance_history.client_id is UUID (references clients.id), NOT the bot_id string
  const { data: balanceRows } = await supabase
    .from("balance_history")
    .select("balance, recorded_at")
    .eq("client_id", session.user.id)
    .order("recorded_at", { ascending: true })
    .limit(100);

  // 6 — Fetch all monthly snapshots (for Capital & Returns tab)
  //     client_id here is the Supabase UUID (session.user.id), NOT bot_id
  const { data: snapshotRows } = await supabase
    .from("monthly_snapshots")
    .select("year, month, opening_balance, closing_balance, gross_pnl, net_pnl, performance_fee, fee_paid, carried_loss_in, total_deposits, total_withdrawals, total_trades")
    .eq("client_id", session.user.id)
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  // 7 — Fetch capital events for this client (UUID)
  const { data: capitalRows } = await supabase
    .from("capital_events")
    .select("event_type, amount, notes, occurred_at")
    .eq("client_id", session.user.id)
    .order("occurred_at", { ascending: true });

  // 8 — Fetch monthly exchange fees (Binance trading commissions + borrowing interest, per month)
  const { data: feeRows } = await supabase
    .from("trade_fees_monthly")
    .select("year, month, exchange_fees_usdt, trade_count, borrowing_interest_usdt")
    .eq("client_id", session.user.id)
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  return (
    <DashboardClient
      session={session}
      botState={botStateRow ?? null}
      priceData={priceRows ?? []}
      trades={tradeRows ?? []}
      balanceHistory={balanceRows ?? []}
      monthlySnapshots={snapshotRows ?? []}
      capitalEvents={capitalRows ?? []}
      exchangeFees={feeRows ?? []}
      initialCapital={initialCapital}
    />
  );
}
