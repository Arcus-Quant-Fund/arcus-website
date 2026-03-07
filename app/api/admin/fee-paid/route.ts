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
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase";

const ARCUS_EMAIL_FROM = "Arcus Quant Fund <admin@arcusquantfund.com>";
const ARCUS_EMAIL_CC   = "shehzadahmed@arcusquantfund.com";

const ADMIN_DOMAIN = "@arcusquantfund.com";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  if (req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`) return true;
  const session = await getServerSession(authOptions);
  return !!(session?.user?.email?.endsWith(ADMIN_DOMAIN));
}

// ─── POST — record a fee payment ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!await isAuthorized(req)) {
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
    .select("id, performance_fee, fee_paid, fee_payment_ref, payment_history")
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

  type PaymentRecord = { amount: number; method: string | null; ref: string | null; paid_at: string };
  const snap = snapshot as { id: number; performance_fee: number; fee_paid: number; fee_payment_ref: string | null; payment_history: PaymentRecord[] | null };
  const existingPayments: PaymentRecord[] = snap.payment_history ?? [];
  const already_paid = snap.fee_paid ?? 0;
  const total_paid   = already_paid + amount_paid;

  // Guard: no fee was owed this month
  if (snap.performance_fee <= 0) {
    return NextResponse.json(
      { error: `No performance fee was invoiced for ${client.name} in ${year}/${String(month).padStart(2, "0")} (loss month or zero-profit month)` },
      { status: 400 }
    );
  }

  // Guard: overpayment — total would exceed the invoiced amount
  if (total_paid > snap.performance_fee + 0.01) { // 0.01 tolerance for floating-point
    return NextResponse.json(
      {
        error: `Overpayment: recording this payment would bring total_paid (${total_paid.toFixed(2)}) above fee_invoiced (${snap.performance_fee.toFixed(2)})`,
        already_paid,
        amount_paid,
        total_paid,
        fee_invoiced: snap.performance_fee,
        max_recordable: +(snap.performance_fee - already_paid).toFixed(2),
        suggestion: `The maximum recordable amount is ${(snap.performance_fee - already_paid).toFixed(2)} USDT`
      },
      { status: 400 }
    );
  }

  // Guard: duplicate transaction reference — check full payment history, not just last ref
  if (transaction_ref && existingPayments.some((p) => p.ref === transaction_ref)) {
    return NextResponse.json(
      {
        error: `Duplicate transaction reference: "${transaction_ref}" has already been recorded for this fee`,
        already_paid,
        fee_invoiced: snap.performance_fee,
        payments_recorded: existingPayments.length,
        suggestion: "Check the payment history — this reference was already processed"
      },
      { status: 409 }
    );
  }

  // Update snapshot — append new payment to history
  const newPayment: PaymentRecord = {
    amount:  amount_paid,
    method:  payment_method ?? null,
    ref:     transaction_ref ?? null,
    paid_at: new Date().toISOString(),
  };

  await supabase
    .from("monthly_snapshots")
    .update({
      fee_paid:         total_paid,
      fee_paid_at:      newPayment.paid_at,
      fee_payment_ref:  transaction_ref ?? snap.fee_payment_ref ?? null,
      payment_history:  [...existingPayments, newPayment],
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

  // ── Send thank-you receipt email to client ────────────────────────────────
  try {
    const resend     = new Resend(process.env.RESEND_API_KEY);
    const gold       = "#f8ac07";
    const green      = "#22c55e";
    const red        = "#ef4444";
    const blue       = "#60a5fa";
    const periodLabel = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
    const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fullySettled = outstanding <= 0.01;

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;">
<tr><td align="center" style="padding:32px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#0a0a0a;border-radius:16px;border:1px solid #1f2937;overflow:hidden;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#111827,#0a0a0a);padding:28px 32px;border-bottom:1px solid #1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="color:${gold};font-size:21px;font-weight:800;letter-spacing:-0.02em;">◈ ARCUS QUANT FUND</div>
        <div style="color:#6b7280;font-size:12px;margin-top:3px;">Payment Receipt</div>
      </td>
      <td align="right">
        <div style="background:${green}15;border:1px solid ${green}40;border-radius:8px;padding:7px 14px;">
          <div style="color:${green};font-size:12px;font-weight:700;">PAYMENT RECEIVED</div>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- GREETING -->
  <tr><td style="padding:24px 32px 16px;">
    <div style="color:#e5e7eb;font-size:15px;margin-bottom:6px;">Dear <strong style="color:#fff;">${client.name}</strong>,</div>
    <div style="color:#6b7280;font-size:13px;line-height:1.7;">
      Thank you — we have received your performance fee payment for <strong style="color:#9ca3af;">${periodLabel}</strong>.
      This receipt confirms the amount recorded in your account.
    </div>
  </td></tr>

  <!-- PAYMENT SUMMARY -->
  <tr><td style="padding:0 32px 24px;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Payment Summary</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:7px 0;color:#9ca3af;font-size:13px;">Period</td>
            <td style="padding:7px 0;color:#e5e7eb;font-size:13px;font-weight:600;text-align:right;">${periodLabel}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:#9ca3af;font-size:13px;">Fee Invoiced</td>
            <td style="padding:7px 0;color:#e5e7eb;font-size:13px;font-weight:600;text-align:right;">${fmt(snap.performance_fee)}</td>
          </tr>
          <tr><td colspan="2"><div style="height:1px;background:#1f2937;margin:6px 0;"></div></td></tr>
          <tr>
            <td style="padding:7px 0;color:#e5e7eb;font-size:14px;font-weight:700;">Amount Received</td>
            <td style="padding:7px 0;color:${green};font-size:18px;font-weight:800;text-align:right;">${fmt(amount_paid)} USDT</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:12px;">Payment method</td>
            <td style="padding:4px 0;color:#9ca3af;font-size:12px;text-align:right;">${payment_method ? escapeHtml(payment_method) : "—"}</td>
          </tr>
          ${transaction_ref ? `<tr>
            <td style="padding:4px 0;color:#6b7280;font-size:12px;">Reference</td>
            <td style="padding:4px 0;color:#9ca3af;font-size:12px;font-family:monospace;text-align:right;">${escapeHtml(transaction_ref)}</td>
          </tr>` : ""}
          ${existingPayments.length > 0 ? `<tr>
            <td style="padding:4px 0;color:#6b7280;font-size:12px;">Total paid to date</td>
            <td style="padding:4px 0;color:#9ca3af;font-size:12px;text-align:right;">${fmt(total_paid)}</td>
          </tr>` : ""}
          <tr><td colspan="2"><div style="height:2px;background:#374151;margin:10px 0;"></div></td></tr>
          <tr>
            <td style="padding:6px 0;color:#e5e7eb;font-size:14px;font-weight:700;">Outstanding Balance</td>
            <td style="padding:6px 0;color:${fullySettled ? green : gold};font-size:16px;font-weight:800;text-align:right;">
              ${fullySettled ? "Fully Settled ✓" : fmt(outstanding) + " USDT"}
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- STATUS NOTICE -->
  <tr><td style="padding:0 32px 24px;">
    <div style="background:${fullySettled ? green + "10" : gold + "10"};border:1px solid ${fullySettled ? green + "30" : gold + "30"};border-radius:10px;padding:16px 20px;">
      <div style="color:${fullySettled ? green : gold};font-size:13px;font-weight:600;line-height:1.6;">
        ${fullySettled
          ? `Your account is fully settled for ${periodLabel}. Thank you for your continued partnership with Arcus Quant Fund.`
          : `A balance of ${fmt(outstanding)} USDT remains for ${periodLabel}. Please arrange the outstanding amount at your earliest convenience.`
        }
      </div>
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:20px 32px 28px;border-top:1px solid #111827;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="color:${gold};font-size:13px;font-weight:700;">◈ Arcus Quant Fund</div>
        <div style="color:#4b5563;font-size:11px;margin-top:2px;">Systematic Algorithmic Trading</div>
      </td>
      <td align="right">
        <div style="color:#4b5563;font-size:11px;line-height:2.2;">
          <a href="https://arcusquantfund.com" style="color:#6b7280;text-decoration:none;">arcusquantfund.com</a><br/>
          <a href="mailto:contact@arcusquantfund.com" style="color:#6b7280;text-decoration:none;">contact@arcusquantfund.com</a>
        </div>
      </td>
    </tr></table>
    <div style="margin-top:14px;color:#374151;font-size:10px;border-top:1px solid #111;padding-top:14px;">
      Generated ${new Date().toUTCString()} · This is an automated receipt. Please retain for your records.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

    await resend.emails.send({
      from:    ARCUS_EMAIL_FROM,
      to:      client_email,
      cc:      ARCUS_EMAIL_CC,
      subject: fullySettled
        ? `Payment Received — ${periodLabel} Fee Fully Settled ✓`
        : `Payment Received — ${fmt(amount_paid)} USDT for ${periodLabel} (${fmt(outstanding)} outstanding)`,
      html,
    });
  } catch (emailErr) {
    // Non-fatal — payment is already recorded; log and continue
    console.error("[fee-paid] Receipt email failed:", emailErr instanceof Error ? emailErr.message : String(emailErr));
  }

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
  if (!await isAuthorized(req)) {
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
      performance_fee, fee_paid, fee_paid_at, fee_payment_ref, payment_history,
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
