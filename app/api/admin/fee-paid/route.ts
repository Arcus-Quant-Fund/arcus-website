/**
 * POST /api/admin/fee-paid
 * Mark a monthly performance fee as received.
 * Call this when the client sends payment.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Body:
 *   client_email    string  — client who paid
 *   year            number  — e.g. 2026
 *   month           number  — 1–12
 *   amount_paid     number  — USDT actually received (may differ from invoice if partial)
 *   payment_method  string  — "Binance" | "UCB Bank" | other
 *   transaction_ref string  — Binance tx ID / bank reference
 *
 * GET /api/admin/fee-paid?email=<email>
 * List all fee payment records for a client.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// ─── POST — record a fee payment ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    client_email?: string;
    year?: number;
    month?: number;
    amount_paid?: number;
    payment_method?: string;
    transaction_ref?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { client_email, year, month, amount_paid, payment_method, transaction_ref } = body;

  if (!client_email) return NextResponse.json({ error: "client_email required" }, { status: 400 });
  if (!year || !month) return NextResponse.json({ error: "year and month required" }, { status: 400 });
  if (!amount_paid || amount_paid <= 0) return NextResponse.json({ error: "amount_paid must be positive" }, { status: 400 });

  const supabase = createServiceClient();

  // Resolve client
  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, name")
    .eq("email", client_email)
    .single();

  if (!clientRow) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  const client = clientRow as { id: string; name: string };

  // Find the monthly snapshot
  const { data: snapshot, error: snapErr } = await supabase
    .from("monthly_snapshots")
    .select("id, performance_fee, fee_paid")
    .eq("client_id", client.id)
    .eq("year", year)
    .eq("month", month)
    .single();

  if (snapErr || !snapshot) {
    return NextResponse.json(
      { error: `No monthly snapshot found for ${client.name} — ${year}/${String(month).padStart(2, "0")}` },
      { status: 404 }
    );
  }

  const snap = snapshot as { id: number; performance_fee: number; fee_paid: number };
  const already_paid = snap.fee_paid ?? 0;
  const total_paid   = already_paid + amount_paid;

  // Update snapshot
  await supabase
    .from("monthly_snapshots")
    .update({
      fee_paid:        total_paid,
      fee_paid_at:     new Date().toISOString(),
      fee_payment_ref: transaction_ref ?? null,
    })
    .eq("id", snap.id);

  // Audit entry
  await supabase.from("audit_log").insert({
    client_id:     client.id,
    event_type:    "FEE",
    amount:        amount_paid,
    balance_before: null,
    balance_after:  null,
    description:   `Performance fee received from ${client.name} for ${year}/${String(month).padStart(2, "0")} via ${payment_method ?? "unknown"}`,
    metadata: {
      year, month,
      invoiced:        snap.performance_fee,
      amount_paid,
      total_paid,
      outstanding:     Math.max(0, snap.performance_fee - total_paid),
      payment_method:  payment_method ?? null,
      transaction_ref: transaction_ref ?? null,
    },
  });

  const outstanding = Math.max(0, snap.performance_fee - total_paid);

  return NextResponse.json({
    success: true,
    client:          client.name,
    period:          `${year}/${String(month).padStart(2, "0")}`,
    fee_invoiced:    snap.performance_fee,
    amount_paid,
    total_paid,
    outstanding,
    fully_settled:   outstanding <= 0,
    payment_method:  payment_method ?? null,
    transaction_ref: transaction_ref ?? null,
  });
}

// ─── GET — list fee payment history for a client ──────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email query param required" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, name, carried_loss")
    .eq("email", email)
    .single();

  if (!clientRow) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  const client = clientRow as { id: string; name: string; carried_loss: number };

  const { data: snapshots, error } = await supabase
    .from("monthly_snapshots")
    .select(`
      year, month,
      opening_balance, closing_balance,
      total_deposits, total_withdrawals, net_new_capital,
      gross_pnl, net_pnl,
      performance_fee, fee_paid, fee_paid_at, fee_payment_ref,
      carried_loss_in, carried_loss_out,
      total_trades, win_rate, profit_factor,
      report_sent_at
    `)
    .eq("client_id", client.id)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (snapshots ?? []) as {
    performance_fee: number;
    fee_paid: number;
    gross_pnl: number;
    total_deposits: number;
    total_withdrawals: number;
  }[];

  const totals = {
    total_fees_invoiced:  rows.reduce((s, r) => s + (r.performance_fee ?? 0), 0),
    total_fees_paid:      rows.reduce((s, r) => s + (r.fee_paid ?? 0), 0),
    total_trading_pnl:    rows.reduce((s, r) => s + (r.gross_pnl ?? 0), 0),
    total_deposited:      rows.reduce((s, r) => s + (r.total_deposits ?? 0), 0),
    total_withdrawn:      rows.reduce((s, r) => s + (r.total_withdrawals ?? 0), 0),
    current_carried_loss: client.carried_loss ?? 0,
  };

  totals.total_fees_invoiced = +totals.total_fees_invoiced.toFixed(2);
  totals.total_fees_paid     = +totals.total_fees_paid.toFixed(2);

  return NextResponse.json({
    client:   client.name,
    totals,
    outstanding: +(totals.total_fees_invoiced - totals.total_fees_paid).toFixed(2),
    snapshots,
  });
}
