import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const ARCUS_EMAIL_FROM = "Arcus Quant Fund <admin@arcusquantfund.com>";
const ARCUS_EMAIL_CC   = "shehzadahmed@arcusquantfund.com";
const ARCUS_SITE       = "https://arcusquantfund.com";

const PAYMENT_BINANCE_UID  = "131952271";
const PAYMENT_BINANCE_USER = "User-b138c";
const PAYMENT_BANK_HOLDER  = "Shehzad Ahmed";
const PAYMENT_BANK_NAME    = "United Commercial Bank PLC";
const PAYMENT_BANK_ACCOUNT = "050 3201 0000 99748";
const PAYMENT_BANK_ROUTING = "245263286";
const PAYMENT_BANK_BRANCH  = "Mohammadpur Branch (050)";

const OPERATING_COSTS_USD = 5000; // servers, AI subscriptions, domain, email — per month

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = {
  id: string;
  name: string;
  email: string;
  bot_id: string | null;
  fiat_currency: string;
  profit_share_pct: number;
  carried_loss: number;
  initial_capital: number;
};

type Trade = {
  trade_id: string | null;
  timestamp: string;
  symbol: string;
  side: string;
  price: number;
  quantity: number;
  amount: number;
  pnl: number | null;
  reason: string | null;
};

type BalancePoint = { balance: number; recorded_at: string };

type CapitalEvent = {
  event_type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  notes: string | null;
  occurred_at: string;
};

type ExchangeRate = {
  lower_bound: number;
  upper_bound: number;
  mid_rate: number;
  fetched_at: string;
};

type MonthStats = {
  // Balances
  opening_balance: number;
  closing_balance: number;
  // Capital flows
  total_deposits: number;
  total_withdrawals: number;
  net_new_capital: number;
  // P&L — capital-adjusted
  gross_pnl: number;         // (closing - opening) - net_new_capital
  carried_loss_in: number;
  net_pnl: number;           // gross_pnl - carried_loss_in
  performance_fee: number;   // net_pnl * profit_share_pct (only if net_pnl > 0)
  carried_loss_out: number;  // |net_pnl| if net_pnl < 0, else 0
  // Derived P&L
  realized_pnl: number;           // sum of closed trade pnl
  unrealized_pnl_change: number;  // gross_pnl - realized_pnl (MTM change)
  client_share: number;           // what client keeps after fee
  // Trade stats
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_factor: number;
  best_trade_pnl: number;
  worst_trade_pnl: number;
  avg_win: number;
  avg_loss: number;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const isCron   = req.headers.get("x-vercel-cron-job-name") !== null;
  const isManual = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  return isCron || isManual;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getPreviousMonth() {
  const now   = new Date();
  const year  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end   = new Date(year, month, 0, 23, 59, 59, 999);
  return {
    year, month,
    label:    start.toLocaleString("en-US", { month: "long", year: "numeric" }),
    startISO: start.toISOString(),
    endISO:   end.toISOString(),
  };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(val: number | null | undefined, prefix = "$"): string {
  if (val == null) return "N/A";
  return `${prefix}${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtSigned(val: number | null | undefined, prefix = "$"): string {
  if (val == null) return "N/A";
  const sign = val >= 0 ? "+" : "−";
  return `${sign}${prefix}${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFiat(val: number | null | undefined, fiat: string): string {
  if (val == null) return "N/A";
  return `${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${fiat}`;
}

// ─── Stats calculator (capital-adjusted) ─────────────────────────────────────
//
// TRUE TRADING PROFIT formula (Modified Dietz simplified):
//
//   gross_pnl = (closing_balance - opening_balance) - net_new_capital
//
// This strips out deposits and withdrawals so only bot-generated
// profit/loss remains.
//
// Example:
//   Opening: $1,000  Deposit: +$500  Closing: $1,600
//   gross_pnl = ($1,600 - $1,000) - $500 = $100  ✓ (only bot made $100)
//   Without tracking: would show $600 profit (includes $500 deposit) ✗
//
// Bug 1 fix (opening balance):
//   opening_balance = last balance BEFORE month start (prevClosingBalance)
//   Falls back to first balance OF the month only if no prior record.
//   This prevents daily-snapshot outages early in the month from
//   corrupting the opening balance figure.

function computeStats(
  trades: Trade[],
  balances: BalancePoint[],
  capitalEvents: CapitalEvent[],
  carriedLossIn: number,
  profitSharePct: number,
  prevClosingBalance?: number | null
): MonthStats {
  const sorted = [...balances].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
  // Bug 1 fix: use last balance BEFORE the month starts as opening.
  // Falls back to first balance OF the month when no prior record exists
  // (e.g., new client whose account started mid-month).
  const opening_balance = prevClosingBalance ?? sorted[0]?.balance ?? 0;
  const closing_balance = sorted[sorted.length - 1]?.balance ?? 0;

  // Capital flows this month
  const total_deposits    = capitalEvents.filter(e => e.event_type === "DEPOSIT").reduce((s, e) => s + e.amount, 0);
  const total_withdrawals = capitalEvents.filter(e => e.event_type === "WITHDRAWAL").reduce((s, e) => s + e.amount, 0);
  const net_new_capital   = total_deposits - total_withdrawals;

  // Capital-adjusted P&L
  const gross_pnl = (closing_balance - opening_balance) - net_new_capital;

  // Performance fee calculation (after deducting any carried loss)
  const net_pnl         = gross_pnl - carriedLossIn;
  const performance_fee = net_pnl > 0 ? net_pnl * profitSharePct : 0;
  const carried_loss_out = net_pnl < 0 ? Math.abs(net_pnl) : 0;

  // Trade stats (only closed trades = SELL side with pnl)
  const closed = trades.filter(t => t.side?.toUpperCase() === "SELL" && t.pnl != null);
  const wins   = closed.filter(t => (t.pnl ?? 0) > 0);
  const losses = closed.filter(t => (t.pnl ?? 0) < 0);

  const grossWins   = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLosses = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const pnls        = closed.map(t => t.pnl ?? 0);

  // Financial statement derived fields
  const realized_pnl         = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const unrealized_pnl_change = gross_pnl - realized_pnl;
  const client_share          = net_pnl > 0 ? net_pnl - performance_fee : net_pnl;

  return {
    opening_balance, closing_balance,
    total_deposits, total_withdrawals, net_new_capital,
    gross_pnl, carried_loss_in: carriedLossIn, net_pnl, performance_fee, carried_loss_out,
    realized_pnl, unrealized_pnl_change, client_share,
    total_trades:   closed.length,
    winning_trades: wins.length,
    losing_trades:  losses.length,
    win_rate:       closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
    profit_factor:  grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0,
    best_trade_pnl:  pnls.length > 0 ? Math.max(...pnls) : 0,
    worst_trade_pnl: pnls.length > 0 ? Math.min(...pnls) : 0,
    avg_win:         wins.length > 0 ? grossWins / wins.length : 0,
    avg_loss:        losses.length > 0 ? grossLosses / losses.length : 0,
  };
}

// ─── Email builder ────────────────────────────────────────────────────────────

function buildEmail(
  client: Client,
  stats: MonthStats,
  trades: Trade[],
  capitalEvents: CapitalEvent[],
  rate: ExchangeRate | null,
  monthLabel: string,
  feePaid: number,
  year: number,
  month: number
): string {
  const gold  = "#f8ac07";
  const green = "#22c55e";
  const red   = "#ef4444";
  const blue  = "#60a5fa";
  const pnlColor = (v: number) => v >= 0 ? green : red;

  const closingFiatLow  = rate ? stats.closing_balance * rate.lower_bound : null;
  const closingFiatHigh = rate ? stats.closing_balance * rate.upper_bound : null;
  const feeInFiatLow    = rate ? stats.performance_fee * rate.lower_bound : null;
  const feeInFiatHigh   = rate ? stats.performance_fee * rate.upper_bound : null;

  const roi = stats.opening_balance > 0
    ? (stats.gross_pnl / stats.opening_balance) * 100
    : null;

  // Financial statement derived values
  const clientEffReturn = stats.opening_balance > 0
    ? (stats.client_share / stats.opening_balance) * 100
    : null;
  const navClosing   = stats.closing_balance - stats.performance_fee;
  const netFinancing = stats.total_deposits - stats.total_withdrawals - feePaid;

  // Last day of the reporting month for Balance Sheet header
  const lastDay      = new Date(year, month, 0);  // day 0 of next month = last day of this month
  const lastDayLabel = lastDay.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // ── Capital events rows ──
  const capitalRows = capitalEvents.length > 0 ? capitalEvents.map(e => {
    const isDeposit = e.event_type === "DEPOSIT";
    return `
    <tr style="border-bottom:1px solid #1f2937;">
      <td style="padding:9px 10px;color:#9ca3af;font-size:12px;">${fmtDate(e.occurred_at)}</td>
      <td style="padding:9px 10px;font-weight:700;font-size:12px;color:${isDeposit ? green : red};">
        ${e.event_type}
      </td>
      <td style="padding:9px 10px;font-weight:700;font-size:13px;color:${isDeposit ? green : red};text-align:right;">
        ${isDeposit ? "+" : "−"}${fmtMoney(e.amount)}
      </td>
      <td style="padding:9px 10px;color:#6b7280;font-size:12px;">${e.notes ?? "—"}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="4" style="padding:14px 10px;color:#4b5563;font-size:12px;">No capital movements this month.</td></tr>`;

  // ── Trade rows ──
  const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const tradeRows = sorted.length > 0 ? sorted.map((t, i) => {
    const isBuy  = t.side?.toUpperCase() === "BUY";
    const hasPnl = t.pnl != null && t.side?.toUpperCase() === "SELL";
    return `
    <tr style="border-bottom:1px solid #1f2937;">
      <td style="padding:9px 8px;color:#6b7280;font-size:11px;">${i + 1}</td>
      <td style="padding:9px 8px;color:#d1d5db;font-size:11px;">${fmtDate(t.timestamp)}</td>
      <td style="padding:9px 8px;font-weight:700;font-size:11px;color:${isBuy ? green : red};">${t.side?.toUpperCase()}</td>
      <td style="padding:9px 8px;color:#d1d5db;font-family:monospace;font-size:11px;">$${t.price?.toFixed(4)}</td>
      <td style="padding:9px 8px;color:#9ca3af;font-size:11px;">${t.quantity?.toFixed(2)}</td>
      <td style="padding:9px 8px;color:#d1d5db;font-size:11px;">$${t.amount?.toFixed(2)}</td>
      <td style="padding:9px 8px;font-weight:600;font-size:12px;color:${hasPnl ? pnlColor(t.pnl!) : "#6b7280"};">
        ${hasPnl ? fmtSigned(t.pnl) : "—"}
      </td>
      <td style="padding:9px 8px;color:#6b7280;font-size:11px;">${t.reason ?? "—"}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="8" style="padding:16px 10px;color:#4b5563;font-size:12px;text-align:center;">No trades executed this month.</td></tr>`;

  // ── Profit / Loss block ──
  const profitBlock = stats.net_pnl > 0 ? `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#0d1a0d;border:1px solid ${green}30;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:20px 24px 0;">
      <div style="color:${green};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px;">
        Performance Fee — ${(client.profit_share_pct * 100).toFixed(0)}% of Net Profit (per contract)
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:7px 0;color:#9ca3af;font-size:13px;">Trading P&L (capital-adjusted)</td>
          <td style="padding:7px 0;color:${pnlColor(stats.gross_pnl)};font-size:13px;font-weight:600;text-align:right;">${fmtSigned(stats.gross_pnl)}</td>
        </tr>
        ${stats.carried_loss_in > 0 ? `
        <tr>
          <td style="padding:7px 0;color:#9ca3af;font-size:13px;">Less: Carried Loss from Prior Month</td>
          <td style="padding:7px 0;color:${red};font-size:13px;font-weight:600;text-align:right;">−${fmtMoney(stats.carried_loss_in)}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:10px 0 7px;border-top:1px solid #1f2937;color:#e5e7eb;font-size:14px;font-weight:700;">Net Profit</td>
          <td style="padding:10px 0 7px;border-top:1px solid #1f2937;color:${green};font-size:14px;font-weight:700;text-align:right;">${fmtSigned(stats.net_pnl)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0 4px;color:#e5e7eb;font-size:15px;font-weight:700;">Performance Fee Due (${(client.profit_share_pct * 100).toFixed(0)}%)</td>
          <td style="padding:10px 0 4px;color:${gold};font-size:20px;font-weight:800;text-align:right;">${fmtMoney(stats.performance_fee)} USDT</td>
        </tr>
      </table>
      ${rate ? `<div style="color:#6b7280;font-size:12px;margin-bottom:16px;">
        ≈ ${fmtFiat(feeInFiatLow, client.fiat_currency)} – ${fmtFiat(feeInFiatHigh, client.fiat_currency)} at current P2P rates
      </div>` : ""}
    </td></tr>

    <!-- Payment instructions -->
    <tr><td style="background:#111827;padding:20px 24px;border-top:1px solid #1f2937;">
      <div style="color:${gold};font-size:13px;font-weight:700;margin-bottom:14px;">
        ► Please send ${fmtMoney(stats.performance_fee)} USDT within 5 business days:
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr valign="top">
          <td width="47%" style="padding-right:10px;">
            <div style="background:#0a0a0a;border:1px solid #374151;border-radius:10px;padding:14px;">
              <div style="color:${gold};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Option 1 — Binance</div>
              <div style="margin:4px 0;"><span style="color:#6b7280;font-size:11px;">Username: </span><span style="color:#e5e7eb;font-size:11px;font-weight:600;">${PAYMENT_BINANCE_USER}</span></div>
              <div><span style="color:#6b7280;font-size:11px;">UID: </span><span style="color:#e5e7eb;font-size:11px;font-weight:600;font-family:monospace;">${PAYMENT_BINANCE_UID}</span></div>
            </div>
          </td>
          <td width="6%" style="text-align:center;vertical-align:middle;color:#4b5563;font-size:12px;">or</td>
          <td width="47%" style="padding-left:10px;">
            <div style="background:#0a0a0a;border:1px solid #374151;border-radius:10px;padding:14px;">
              <div style="color:${gold};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Option 2 — UCB Bank</div>
              <div style="margin:3px 0;"><span style="color:#6b7280;font-size:11px;">Name: </span><span style="color:#e5e7eb;font-size:11px;font-weight:600;">${PAYMENT_BANK_HOLDER}</span></div>
              <div style="margin:3px 0;"><span style="color:#6b7280;font-size:11px;">Bank: </span><span style="color:#e5e7eb;font-size:11px;">${PAYMENT_BANK_NAME}</span></div>
              <div style="margin:3px 0;"><span style="color:#6b7280;font-size:11px;">Branch: </span><span style="color:#e5e7eb;font-size:11px;">${PAYMENT_BANK_BRANCH}</span></div>
              <div style="margin:3px 0;"><span style="color:#6b7280;font-size:11px;">A/C: </span><span style="color:#e5e7eb;font-size:11px;font-weight:600;font-family:monospace;">${PAYMENT_BANK_ACCOUNT}</span></div>
              <div><span style="color:#6b7280;font-size:11px;">Routing: </span><span style="color:#e5e7eb;font-size:11px;font-family:monospace;">${PAYMENT_BANK_ROUTING}</span></div>
            </div>
          </td>
        </tr>
      </table>
      <div style="margin-top:12px;color:#4b5563;font-size:11px;line-height:1.6;">
        Once paid, please reply with the transaction reference so we can record it in your account.
      </div>
    </td></tr>
  </table>` : `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#1a0d0d;border:1px solid ${red}30;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:20px 24px;">
      <div style="color:${red};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:14px;">No Performance Fee This Month</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:7px 0;color:#9ca3af;font-size:13px;">Trading P&L (capital-adjusted)</td>
          <td style="padding:7px 0;color:${pnlColor(stats.gross_pnl)};font-size:13px;font-weight:600;text-align:right;">${fmtSigned(stats.gross_pnl)}</td>
        </tr>
        ${stats.carried_loss_in > 0 ? `
        <tr>
          <td style="padding:7px 0;color:#9ca3af;font-size:13px;">Prior Carried Loss</td>
          <td style="padding:7px 0;color:${red};font-size:13px;font-weight:600;text-align:right;">−${fmtMoney(stats.carried_loss_in)}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:10px 0 7px;border-top:1px solid #1f2937;color:#e5e7eb;font-size:14px;font-weight:700;">Carried Forward to Next Month</td>
          <td style="padding:10px 0 7px;border-top:1px solid #1f2937;color:${red};font-size:14px;font-weight:700;text-align:right;">−${fmtMoney(stats.carried_loss_out)}</td>
        </tr>
      </table>
      <div style="margin-top:14px;background:#0a0a0a;border-radius:8px;padding:14px;color:#9ca3af;font-size:13px;line-height:1.6;">
        The loss of <strong style="color:${red};">${fmtMoney(stats.carried_loss_out)}</strong> will be deducted from the first
        profitable month before any fee is calculated. No payment is due. Your account continues at full capacity.
      </div>
    </td></tr>
  </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;">
<tr><td align="center" style="padding:32px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:660px;background:#0a0a0a;border-radius:16px;border:1px solid #1f2937;overflow:hidden;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#111827,#0a0a0a);padding:28px 32px;border-bottom:1px solid #1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="color:${gold};font-size:21px;font-weight:800;letter-spacing:-0.02em;">◈ ARCUS QUANT FUND</div>
        <div style="color:#6b7280;font-size:12px;margin-top:3px;">Monthly Performance Report</div>
      </td>
      <td align="right">
        <div style="background:${gold}15;border:1px solid ${gold}40;border-radius:8px;padding:7px 14px;display:inline-block;">
          <div style="color:${gold};font-size:13px;font-weight:700;">${monthLabel}</div>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- GREETING -->
  <tr><td style="padding:24px 32px 16px;">
    <div style="color:#e5e7eb;font-size:15px;margin-bottom:8px;">Dear <strong style="color:#fff;">${client.name}</strong>,</div>
    <div style="color:#6b7280;font-size:13px;line-height:1.7;">
      Here is your complete account statement for <strong style="color:#9ca3af;">${monthLabel}</strong>.
      Every trade, capital movement, and balance snapshot has been recorded and is fully auditable.
    </div>
  </td></tr>

  <!-- ACCOUNT OVERVIEW -->
  <tr><td style="padding:0 32px 24px;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Account Overview</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:16px;border-right:1px solid #1f2937;border-bottom:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Opening Balance</div>
          <div style="color:#e5e7eb;font-size:18px;font-weight:700;">${fmtMoney(stats.opening_balance)}</div>
        </td>
        <td style="padding:16px;border-right:1px solid #1f2937;border-bottom:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Closing Balance</div>
          <div style="color:#e5e7eb;font-size:18px;font-weight:700;">${fmtMoney(stats.closing_balance)}</div>
        </td>
        <td style="padding:16px;border-bottom:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Trading P&L</div>
          <div style="color:${pnlColor(stats.gross_pnl)};font-size:18px;font-weight:700;">${fmtSigned(stats.gross_pnl)}</div>
          ${roi != null ? `<div style="color:#4b5563;font-size:11px;margin-top:2px;">${roi >= 0 ? "+" : ""}${roi.toFixed(2)}% on capital</div>` : ""}
        </td>
      </tr>
      <!-- Capital flows row (only if there were deposits/withdrawals) -->
      ${stats.total_deposits > 0 || stats.total_withdrawals > 0 ? `
      <tr>
        <td colspan="3" style="padding:12px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#6b7280;font-size:12px;padding:3px 0;">Net New Capital This Month</td>
              <td style="color:${stats.net_new_capital >= 0 ? blue : red};font-size:12px;font-weight:600;text-align:right;padding:3px 0;">
                ${stats.net_new_capital >= 0 ? "+" : "−"}${fmtMoney(Math.abs(stats.net_new_capital))}
                <span style="color:#4b5563;font-weight:400;"> (${fmtMoney(stats.total_deposits)} in · ${fmtMoney(stats.total_withdrawals)} out)</span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:4px;">
                <div style="color:#4b5563;font-size:11px;line-height:1.5;">
                  P&L is calculated after removing capital movements — only bot-generated profit/loss is counted.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>` : ""}
    </table>
  </td></tr>

  <!-- PROFIT OR LOSS BLOCK -->
  <tr><td style="padding:0 32px;">
    ${profitBlock}
  </td></tr>

  <!-- TRADING PERFORMANCE -->
  <tr><td style="padding:0 32px 24px;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Trading Performance</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:14px;text-align:center;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Trades</div>
          <div style="color:#fff;font-size:20px;font-weight:800;">${stats.total_trades}</div>
          <div style="color:#6b7280;font-size:11px;margin-top:2px;">${stats.winning_trades}W · ${stats.losing_trades}L</div>
        </td>
        <td style="padding:14px;text-align:center;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Win Rate</div>
          <div style="color:${stats.win_rate >= 50 ? green : red};font-size:20px;font-weight:800;">${stats.win_rate.toFixed(1)}%</div>
        </td>
        <td style="padding:14px;text-align:center;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Profit Factor</div>
          <div style="color:${stats.profit_factor >= 1 ? green : red};font-size:20px;font-weight:800;">
            ${isFinite(stats.profit_factor) ? stats.profit_factor.toFixed(2) : "∞"}
          </div>
        </td>
        <td style="padding:14px;text-align:center;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Best / Worst</div>
          <div style="font-size:12px;font-weight:600;">
            <span style="color:${green};">${fmtSigned(stats.best_trade_pnl)}</span>
            <span style="color:#4b5563;"> · </span>
            <span style="color:${red};">${fmtSigned(stats.worst_trade_pnl)}</span>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- INCOME STATEMENT -->
  <tr><td style="padding:0 32px 24px;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Income Statement — ${monthLabel}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:16px 18px;">
        <div style="color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Revenue</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Gross Trading P&L (capital-adjusted)</td>
            <td style="padding:5px 0;color:${pnlColor(stats.gross_pnl)};font-size:12px;font-weight:600;text-align:right;">${fmtSigned(stats.gross_pnl)}</td>
          </tr>
          ${stats.carried_loss_in > 0 ? `
          <tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Less: Prior Period Carried Loss</td>
            <td style="padding:5px 0;color:${red};font-size:12px;font-weight:600;text-align:right;">−${fmtMoney(stats.carried_loss_in)}</td>
          </tr>` : ""}
          <tr><td colspan="2" style="padding:4px 0 0;"><div style="height:1px;background:#1f2937;"></div></td></tr>
          <tr>
            <td style="padding:8px 0 5px;color:#e5e7eb;font-size:13px;font-weight:700;">Net Profit / (Loss)</td>
            <td style="padding:8px 0 5px;color:${pnlColor(stats.net_pnl)};font-size:13px;font-weight:700;text-align:right;">${fmtSigned(stats.net_pnl)}</td>
          </tr>
          ${stats.performance_fee > 0 ? `
          <tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Less: Performance Fee (${(client.profit_share_pct * 100).toFixed(0)}%)</td>
            <td style="padding:5px 0;color:${red};font-size:12px;font-weight:600;text-align:right;">−${fmtMoney(stats.performance_fee)}</td>
          </tr>` : ""}
          <tr><td colspan="2" style="padding:4px 0 0;"><div style="height:2px;background:#374151;"></div></td></tr>
          <tr>
            <td style="padding:8px 0 5px;color:#fff;font-size:14px;font-weight:800;">Net Income to Client</td>
            <td style="padding:8px 0 5px;color:${pnlColor(stats.client_share)};font-size:14px;font-weight:800;text-align:right;">${fmtSigned(stats.client_share)}</td>
          </tr>
        </table>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid #1f2937;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${roi != null ? `<tr>
              <td style="padding:3px 0;color:#6b7280;font-size:11px;">ROI on capital</td>
              <td style="padding:3px 0;color:${pnlColor(roi)};font-size:11px;font-weight:600;text-align:right;">${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%</td>
            </tr>` : ""}
            ${clientEffReturn != null ? `<tr>
              <td style="padding:3px 0;color:#6b7280;font-size:11px;">Client effective return (after fee)</td>
              <td style="padding:3px 0;color:${pnlColor(clientEffReturn)};font-size:11px;font-weight:600;text-align:right;">${clientEffReturn >= 0 ? "+" : ""}${clientEffReturn.toFixed(2)}%</td>
            </tr>` : ""}
          </table>
        </div>
      </td></tr>
    </table>
  </td></tr>

  <!-- BALANCE SHEET -->
  <tr><td style="padding:0 32px 24px;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Balance Sheet — As of ${lastDayLabel}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:16px 18px;">
        <div style="color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Assets</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Account Equity (USDT)</td>
            <td style="padding:5px 0;color:#e5e7eb;font-size:12px;font-weight:600;text-align:right;">${fmtMoney(stats.closing_balance)}</td>
          </tr>
          <tr><td colspan="2" style="padding:4px 0 0;"><div style="height:1px;background:#1f2937;"></div></td></tr>
          <tr>
            <td style="padding:7px 0;color:#e5e7eb;font-size:13px;font-weight:700;">Total Assets</td>
            <td style="padding:7px 0;color:#e5e7eb;font-size:13px;font-weight:700;text-align:right;">${fmtMoney(stats.closing_balance)}</td>
          </tr>
        </table>
        <div style="color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:16px 0 10px;">Liabilities</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Performance Fee Payable</td>
            <td style="padding:5px 0;color:${stats.performance_fee > 0 ? red : "#9ca3af"};font-size:12px;font-weight:600;text-align:right;">${fmtMoney(stats.performance_fee)}</td>
          </tr>
          <tr><td colspan="2" style="padding:4px 0 0;"><div style="height:1px;background:#1f2937;"></div></td></tr>
          <tr>
            <td style="padding:7px 0;color:#e5e7eb;font-size:13px;font-weight:700;">Total Liabilities</td>
            <td style="padding:7px 0;color:${stats.performance_fee > 0 ? red : "#e5e7eb"};font-size:13px;font-weight:700;text-align:right;">${fmtMoney(stats.performance_fee)}</td>
          </tr>
        </table>
        <div style="margin-top:16px;padding-top:14px;border-top:2px solid #374151;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;color:#fff;font-size:14px;font-weight:800;">Net Asset Value (NAV)</td>
              <td style="padding:4px 0;color:${gold};font-size:14px;font-weight:800;text-align:right;">${fmtMoney(navClosing)}</td>
            </tr>
          </table>
        </div>
        <div style="color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:16px 0 10px;">NAV Movement</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Opening NAV</td>
            <td style="padding:5px 0;color:#e5e7eb;font-size:12px;text-align:right;">${fmtMoney(stats.opening_balance)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Trading Gains / (Losses)</td>
            <td style="padding:5px 0;color:${pnlColor(stats.gross_pnl)};font-size:12px;font-weight:600;text-align:right;">${fmtSigned(stats.gross_pnl)}</td>
          </tr>
          ${stats.net_new_capital !== 0 ? `<tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Net Capital Flow</td>
            <td style="padding:5px 0;color:${stats.net_new_capital >= 0 ? blue : red};font-size:12px;font-weight:600;text-align:right;">${fmtSigned(stats.net_new_capital)}</td>
          </tr>` : ""}
          ${stats.performance_fee > 0 ? `<tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Performance Fee Due</td>
            <td style="padding:5px 0;color:${red};font-size:12px;font-weight:600;text-align:right;">−${fmtMoney(stats.performance_fee)}</td>
          </tr>` : ""}
          <tr><td colspan="2" style="padding:4px 0 0;"><div style="height:2px;background:#374151;"></div></td></tr>
          <tr>
            <td style="padding:7px 0;color:#e5e7eb;font-size:13px;font-weight:700;">Closing NAV</td>
            <td style="padding:7px 0;color:${gold};font-size:13px;font-weight:700;text-align:right;">${fmtMoney(navClosing)}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- CASH FLOW STATEMENT -->
  <tr><td style="padding:0 32px 24px;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Cash Flow Statement — ${monthLabel}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:16px 18px;">
        <div style="color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Operating Activities</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Realized Trading P&L (closed trades)</td>
            <td style="padding:5px 0;color:${pnlColor(stats.realized_pnl)};font-size:12px;font-weight:600;text-align:right;">${fmtSigned(stats.realized_pnl)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Unrealized P&L Change (open positions)</td>
            <td style="padding:5px 0;color:${pnlColor(stats.unrealized_pnl_change)};font-size:12px;font-weight:600;text-align:right;">${fmtSigned(stats.unrealized_pnl_change)}</td>
          </tr>
          <tr><td colspan="2" style="padding:4px 0 0;"><div style="height:1px;background:#1f2937;"></div></td></tr>
          <tr>
            <td style="padding:7px 0;color:#e5e7eb;font-size:13px;font-weight:700;">Net Operating Cash Flow</td>
            <td style="padding:7px 0;color:${pnlColor(stats.gross_pnl)};font-size:13px;font-weight:700;text-align:right;">${fmtSigned(stats.gross_pnl)}</td>
          </tr>
        </table>
        <div style="color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:16px 0 10px;">Financing Activities</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${stats.total_deposits > 0 ? `<tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Capital Contributions</td>
            <td style="padding:5px 0;color:${blue};font-size:12px;font-weight:600;text-align:right;">+${fmtMoney(stats.total_deposits)}</td>
          </tr>` : ""}
          ${stats.total_withdrawals > 0 ? `<tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Capital Withdrawals</td>
            <td style="padding:5px 0;color:${red};font-size:12px;font-weight:600;text-align:right;">−${fmtMoney(stats.total_withdrawals)}</td>
          </tr>` : ""}
          ${feePaid > 0 ? `<tr>
            <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Performance Fee Paid</td>
            <td style="padding:5px 0;color:${red};font-size:12px;font-weight:600;text-align:right;">−${fmtMoney(feePaid)}</td>
          </tr>` : ""}
          ${stats.total_deposits === 0 && stats.total_withdrawals === 0 && feePaid === 0 ? `<tr>
            <td colspan="2" style="padding:8px 0;color:#4b5563;font-size:12px;">No financing activities this month.</td>
          </tr>` : ""}
          <tr><td colspan="2" style="padding:4px 0 0;"><div style="height:1px;background:#1f2937;"></div></td></tr>
          <tr>
            <td style="padding:7px 0;color:#e5e7eb;font-size:13px;font-weight:700;">Net Financing Activities</td>
            <td style="padding:7px 0;color:${netFinancing >= 0 ? blue : red};font-size:13px;font-weight:700;text-align:right;">${fmtSigned(netFinancing)}</td>
          </tr>
        </table>
        <div style="margin-top:16px;padding-top:14px;border-top:2px solid #374151;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Opening Balance</td>
              <td style="padding:5px 0;color:#e5e7eb;font-size:12px;text-align:right;">${fmtMoney(stats.opening_balance)}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#9ca3af;font-size:12px;">Closing Balance</td>
              <td style="padding:5px 0;color:#e5e7eb;font-size:12px;text-align:right;">${fmtMoney(stats.closing_balance)}</td>
            </tr>
            <tr><td colspan="2" style="padding:4px 0 0;"><div style="height:1px;background:#374151;"></div></td></tr>
            <tr>
              <td style="padding:8px 0 4px;color:#fff;font-size:13px;font-weight:800;">Net Change in Balance</td>
              <td style="padding:8px 0 4px;color:${pnlColor(stats.closing_balance - stats.opening_balance)};font-size:13px;font-weight:800;text-align:right;">${fmtSigned(stats.closing_balance - stats.opening_balance)}</td>
            </tr>
          </table>
        </div>
      </td></tr>
    </table>
  </td></tr>

  <!-- EXCHANGE RATES -->
  ${rate ? `
  <tr><td style="padding:0 32px 24px;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">
      USDT → ${client.fiat_currency} &nbsp;<span style="color:#4b5563;font-weight:400;text-transform:none;font-size:10px;">Binance P2P · Bank Transfer · 1,000+ USDT · ${fmtDate(rate.fetched_at)}</span>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:14px 16px;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">P2P Rate Range</div>
          <div style="color:#fff;font-size:15px;font-weight:700;">
            ${rate.lower_bound.toLocaleString()} – ${rate.upper_bound.toLocaleString()}
            <span style="color:#6b7280;font-size:11px;"> ${client.fiat_currency}/USDT</span>
          </div>
        </td>
        <td style="padding:14px 16px;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Your Balance · Lower Rate</div>
          <div style="color:#9ca3af;font-size:15px;font-weight:700;">${fmtFiat(closingFiatLow, client.fiat_currency)}</div>
          <div style="color:#4b5563;font-size:11px;">${rate.lower_bound.toLocaleString()} ${client.fiat_currency}/USDT</div>
        </td>
        <td style="padding:14px 16px;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Your Balance · Upper Rate</div>
          <div style="color:${gold};font-size:15px;font-weight:700;">${fmtFiat(closingFiatHigh, client.fiat_currency)}</div>
          <div style="color:#4b5563;font-size:11px;">${rate.upper_bound.toLocaleString()} ${client.fiat_currency}/USDT</div>
        </td>
      </tr>
    </table>
  </td></tr>` : ""}

  <!-- CAPITAL MOVEMENTS -->
  <tr><td style="padding:0 32px 24px;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Capital Movements — ${monthLabel}</div>
    <div style="background:#111827;border-radius:12px;overflow:hidden;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="background:#0a0a0a;border-bottom:1px solid #374151;">
          <th style="padding:9px 10px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">Date</th>
          <th style="padding:9px 10px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">Type</th>
          <th style="padding:9px 10px;color:#6b7280;font-size:10px;font-weight:600;text-align:right;text-transform:uppercase;">Amount</th>
          <th style="padding:9px 10px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">Notes</th>
        </tr>
        ${capitalRows}
      </table>
    </div>
  </td></tr>

  <!-- TRANSACTIONS -->
  <tr><td style="padding:0 32px 24px;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">
      Trade Transactions — ${monthLabel}
    </div>
    <div style="background:#111827;border-radius:12px;overflow:hidden;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="background:#0a0a0a;border-bottom:1px solid #374151;">
          <th style="padding:9px 8px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">#</th>
          <th style="padding:9px 8px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">Date</th>
          <th style="padding:9px 8px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">Side</th>
          <th style="padding:9px 8px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">Price</th>
          <th style="padding:9px 8px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">Qty</th>
          <th style="padding:9px 8px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">Amount</th>
          <th style="padding:9px 8px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">P&L</th>
          <th style="padding:9px 8px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">Reason</th>
        </tr>
        ${tradeRows}
      </table>
    </div>
  </td></tr>

  <!-- AUDIT NOTICE -->
  <tr><td style="padding:0 32px 24px;">
    <div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:10px;padding:14px 18px;">
      <span style="color:${blue};font-size:12px;font-weight:600;">Audit Trail: </span>
      <span style="color:#6b7280;font-size:12px;line-height:1.6;">
        Every balance snapshot, capital movement, trade, and report is permanently logged.
        View your full history at
        <a href="${ARCUS_SITE}/dashboard" style="color:${blue};text-decoration:none;">${ARCUS_SITE}/dashboard</a>
      </span>
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:20px 32px 28px;border-top:1px solid #111827;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="color:${gold};font-size:13px;font-weight:700;">◈ Arcus Quant Fund</div>
        <div style="color:#4b5563;font-size:11px;margin-top:2px;">Systematic Algorithmic Trading</div>
      </td>
      <td align="right" valign="top">
        <div style="color:#4b5563;font-size:11px;line-height:2.2;">
          <a href="${ARCUS_SITE}" style="color:#6b7280;text-decoration:none;">${ARCUS_SITE}</a><br/>
          <a href="mailto:contact@arcusquantfund.com" style="color:#6b7280;text-decoration:none;">contact@arcusquantfund.com</a>
        </div>
      </td>
    </tr></table>
    <div style="margin-top:14px;color:#374151;font-size:10px;line-height:1.5;border-top:1px solid #111;padding-top:14px;">
      Generated ${new Date().toUTCString()} · Past performance does not guarantee future results.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

// ─── Arcus admin report ────────────────────────────────────────────────────────
//
// Internal-only email sent to shehzadahmed@arcusquantfund.com after all client
// reports complete. Shows AUM, fees earned, operating costs, and net income.

type MonthlySnapshot = {
  client_id: string;
  opening_balance: number;
  closing_balance: number;
  gross_pnl: number;
  performance_fee: number;
  fee_paid: number | null;
  total_trades: number;
};

async function sendArcusAdminReport(
  resend: Resend,
  supabase: ReturnType<typeof createServiceClient>,
  year: number,
  month: number,
  label: string,
  clients: Client[]
): Promise<void> {
  const gold  = "#f8ac07";
  const green = "#22c55e";
  const red   = "#ef4444";
  const grey  = "#6b7280";

  // Fetch all snapshots for this period
  const { data: snapshots, error } = await supabase
    .from("monthly_snapshots")
    .select("client_id, opening_balance, closing_balance, gross_pnl, performance_fee, fee_paid, total_trades")
    .eq("year", year)
    .eq("month", month);

  if (error || !snapshots || snapshots.length === 0) return;

  const snaps = snapshots as MonthlySnapshot[];

  // Build lookup: client_id → client name
  const clientMap = new Map(clients.map(c => [c.id, c]));

  // Aggregates
  const totalAUM         = snaps.reduce((s, r) => s + r.closing_balance, 0);
  const totalOpeningAUM  = snaps.reduce((s, r) => s + r.opening_balance, 0);
  const totalFeesEarned  = snaps.reduce((s, r) => s + r.performance_fee, 0);
  const totalFeesPaid    = snaps.reduce((s, r) => s + (r.fee_paid ?? 0), 0);
  const totalGrossPnl    = snaps.reduce((s, r) => s + r.gross_pnl, 0);
  const totalTrades      = snaps.reduce((s, r) => s + r.total_trades, 0);
  const avgROI           = totalOpeningAUM > 0 ? (totalGrossPnl / totalOpeningAUM) * 100 : 0;
  const netIncome        = totalFeesEarned - OPERATING_COSTS_USD;
  const feesOutstanding  = totalFeesEarned - totalFeesPaid;

  const pnlColor = (v: number) => v >= 0 ? green : red;

  // ── Per-client rows ──
  const clientRows = snaps.map(snap => {
    const c    = clientMap.get(snap.client_id);
    const name = c?.name ?? snap.client_id.slice(0, 8);
    const pnl  = snap.gross_pnl;
    const feePaid = snap.fee_paid ?? 0;
    const isLossMonth = snap.performance_fee === 0;
    const isPaid      = !isLossMonth && feePaid >= snap.performance_fee;
    const statusLabel = isLossMonth ? "LOSS MONTH" : isPaid ? "PAID ✓" : "PENDING";
    const statusColor = isLossMonth ? grey : isPaid ? green : gold;

    return `
    <tr style="border-bottom:1px solid #1f2937;">
      <td style="padding:10px 12px;color:#e5e7eb;font-size:13px;font-weight:600;">${name}</td>
      <td style="padding:10px 12px;color:#9ca3af;font-size:12px;text-align:right;">${fmtMoney(snap.opening_balance)}</td>
      <td style="padding:10px 12px;color:#e5e7eb;font-size:12px;text-align:right;">${fmtMoney(snap.closing_balance)}</td>
      <td style="padding:10px 12px;color:${pnlColor(pnl)};font-size:12px;font-weight:600;text-align:right;">${fmtSigned(pnl)}</td>
      <td style="padding:10px 12px;color:${gold};font-size:12px;text-align:right;">${fmtMoney(snap.performance_fee)}</td>
      <td style="padding:10px 12px;color:${feePaid > 0 ? green : grey};font-size:12px;text-align:right;">${fmtMoney(feePaid)}</td>
      <td style="padding:10px 12px;text-align:center;">
        <span style="background:${statusColor}20;color:${statusColor};font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:0.05em;">${statusLabel}</span>
      </td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;">
<tr><td align="center" style="padding:32px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background:#0a0a0a;border-radius:16px;border:1px solid #1f2937;overflow:hidden;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#111827,#0a0a0a);padding:28px 32px;border-bottom:1px solid #1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="color:${gold};font-size:21px;font-weight:800;letter-spacing:-0.02em;">◈ ARCUS QUANT FUND — Internal Report</div>
        <div style="color:#9ca3af;font-size:12px;margin-top:3px;">Fund Performance — ${label}</div>
      </td>
      <td align="right">
        <div style="background:#dc262620;border:1px solid #dc262640;border-radius:8px;padding:7px 14px;display:inline-block;">
          <div style="color:#dc2626;font-size:11px;font-weight:700;letter-spacing:0.06em;">ADMIN ONLY — DO NOT FORWARD</div>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- FUND OVERVIEW GRID -->
  <tr><td style="padding:24px 32px 0;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Fund Overview</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:18px;text-align:center;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Total AUM</div>
          <div style="color:#fff;font-size:22px;font-weight:800;">${fmtMoney(totalAUM)}</div>
        </td>
        <td style="padding:18px;text-align:center;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Active Clients</div>
          <div style="color:#fff;font-size:22px;font-weight:800;">${snaps.length}</div>
        </td>
        <td style="padding:18px;text-align:center;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Fund P&L</div>
          <div style="color:${pnlColor(totalGrossPnl)};font-size:22px;font-weight:800;">${fmtSigned(totalGrossPnl)}</div>
          <div style="color:#4b5563;font-size:11px;margin-top:2px;">${avgROI >= 0 ? "+" : ""}${avgROI.toFixed(2)}% avg ROI</div>
        </td>
        <td style="padding:18px;text-align:center;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:5px;">Reporting Month</div>
          <div style="color:#9ca3af;font-size:14px;font-weight:600;">${label}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- INCOME STATEMENT -->
  <tr><td style="padding:24px 32px 0;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Income Statement — ${label}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 24px;">
        <div style="color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Revenue</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:7px 0;color:#9ca3af;font-size:13px;">Performance Fees Earned</td>
            <td style="padding:7px 0;color:${green};font-size:13px;font-weight:600;text-align:right;">+${fmtMoney(totalFeesEarned)}</td>
          </tr>
          <tr>
            <td colspan="2"><div style="border-top:1px solid #374151;margin:8px 0;"></div></td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#e5e7eb;font-size:13px;font-weight:600;">Gross Revenue</td>
            <td style="padding:4px 0;color:#e5e7eb;font-size:13px;font-weight:600;text-align:right;">${fmtMoney(totalFeesEarned)}</td>
          </tr>
        </table>

        <div style="color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:20px 0 12px;">Operating Expenses</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:7px 0;color:#9ca3af;font-size:13px;">Servers, AI, Domain &amp; Email</td>
            <td style="padding:7px 0;color:${red};font-size:13px;font-weight:600;text-align:right;">−${fmtMoney(OPERATING_COSTS_USD)}</td>
          </tr>
          <tr>
            <td colspan="2"><div style="border-top:1px solid #374151;margin:8px 0;"></div></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#fff;font-size:15px;font-weight:800;">Net Income to Arcus</td>
            <td style="padding:8px 0;color:${pnlColor(netIncome)};font-size:20px;font-weight:800;text-align:right;">${fmtSigned(netIncome)}</td>
          </tr>
        </table>

        <div style="margin-top:20px;border-top:1px solid #1f2937;padding-top:16px;">
          <div style="color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Fee Collection Status</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:12px;">Fees Earned This Month</td>
              <td style="padding:6px 0;color:${gold};font-size:12px;font-weight:600;text-align:right;">${fmtMoney(totalFeesEarned)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:12px;">Fees Collected (received)</td>
              <td style="padding:6px 0;color:${green};font-size:12px;font-weight:600;text-align:right;">${fmtMoney(totalFeesPaid)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:12px;font-weight:700;">Fees Outstanding</td>
              <td style="padding:6px 0;color:${feesOutstanding > 0 ? gold : green};font-size:12px;font-weight:700;text-align:right;">${fmtMoney(feesOutstanding)}</td>
            </tr>
          </table>
        </div>
      </td></tr>
    </table>
  </td></tr>

  <!-- CLIENT BREAKDOWN TABLE -->
  <tr><td style="padding:24px 32px 0;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Client Breakdown</div>
    <div style="background:#111827;border-radius:12px;overflow:hidden;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="background:#0a0a0a;border-bottom:1px solid #374151;">
          <th style="padding:10px 12px;color:#6b7280;font-size:10px;font-weight:600;text-align:left;text-transform:uppercase;">Client</th>
          <th style="padding:10px 12px;color:#6b7280;font-size:10px;font-weight:600;text-align:right;text-transform:uppercase;">Opening</th>
          <th style="padding:10px 12px;color:#6b7280;font-size:10px;font-weight:600;text-align:right;text-transform:uppercase;">Closing</th>
          <th style="padding:10px 12px;color:#6b7280;font-size:10px;font-weight:600;text-align:right;text-transform:uppercase;">P&amp;L</th>
          <th style="padding:10px 12px;color:#6b7280;font-size:10px;font-weight:600;text-align:right;text-transform:uppercase;">Fee Earned</th>
          <th style="padding:10px 12px;color:#6b7280;font-size:10px;font-weight:600;text-align:right;text-transform:uppercase;">Fee Paid</th>
          <th style="padding:10px 12px;color:#6b7280;font-size:10px;font-weight:600;text-align:center;text-transform:uppercase;">Status</th>
        </tr>
        ${clientRows}
      </table>
    </div>
  </td></tr>

  <!-- FUND AGGREGATE -->
  <tr><td style="padding:24px 32px 0;">
    <div style="color:${gold};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Fund Aggregate</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;color:#9ca3af;font-size:13px;">Total AUM</td>
            <td style="padding:6px 0;color:#fff;font-size:13px;font-weight:700;text-align:right;">${fmtMoney(totalAUM)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#9ca3af;font-size:13px;">Total Fund P&amp;L</td>
            <td style="padding:6px 0;color:${pnlColor(totalGrossPnl)};font-size:13px;font-weight:700;text-align:right;">${fmtSigned(totalGrossPnl)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#9ca3af;font-size:13px;">Average ROI</td>
            <td style="padding:6px 0;color:${pnlColor(avgROI)};font-size:13px;font-weight:700;text-align:right;">${avgROI >= 0 ? "+" : ""}${avgROI.toFixed(2)}%</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#9ca3af;font-size:13px;">Total Trades (all clients)</td>
            <td style="padding:6px 0;color:#e5e7eb;font-size:13px;font-weight:700;text-align:right;">${totalTrades}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:24px 32px 28px;margin-top:12px;">
    <div style="border-top:1px solid #1f2937;padding-top:16px;color:#374151;font-size:10px;line-height:1.5;">
      Generated ${new Date().toUTCString()} · Arcus Quant Fund Internal Report · Do not distribute.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  await resend.emails.send({
    from:    ARCUS_EMAIL_FROM,
    to:      ARCUS_EMAIL_CC,
    subject: `[Arcus Internal] ${label} — AUM ${fmtMoney(totalAUM)} · Net Income ${fmtSigned(netIncome)}`,
    html,
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend   = new Resend(process.env.RESEND_API_KEY);
  const supabase = createServiceClient();
  const { year, month, label, startISO, endISO } = getPreviousMonth();

  const results = {
    reports_sent: 0,
    skipped: 0,
    errors: [] as { client: string; error: string }[],
  };

  const { data: clients, error: clientsErr } = await supabase
    .from("clients")
    .select("id, name, email, bot_id, fiat_currency, profit_share_pct, carried_loss, initial_capital")
    .eq("is_active", true);

  if (clientsErr || !clients) {
    return NextResponse.json({ error: "Failed to fetch clients", detail: clientsErr?.message }, { status: 500 });
  }

  for (const client of clients as Client[]) {
    try {
      if (!client.bot_id || !client.email) { results.skipped++; continue; }

      // Trades for the month
      const { data: tradeRows } = await supabase
        .from("trade_log")
        .select("trade_id, timestamp, symbol, side, price, quantity, amount, pnl, reason")
        .eq("client_id", client.bot_id)
        .gte("timestamp", startISO)
        .lte("timestamp", endISO)
        .order("timestamp", { ascending: true });

      // Balance history for the month
      const { data: balanceRows } = await supabase
        .from("balance_history")
        .select("balance, recorded_at")
        .eq("client_id", client.id)
        .gte("recorded_at", startISO)
        .lte("recorded_at", endISO)
        .order("recorded_at", { ascending: true });

      // Capital events for the month (deposits & withdrawals)
      const { data: capitalRows } = await supabase
        .from("capital_events")
        .select("event_type, amount, notes, occurred_at")
        .eq("client_id", client.id)
        .gte("occurred_at", startISO)
        .lte("occurred_at", endISO)
        .order("occurred_at", { ascending: true });

      // Latest exchange rate
      const { data: rateRow } = await supabase
        .from("exchange_rates")
        .select("lower_bound, upper_bound, mid_rate, fetched_at")
        .eq("asset", "USDT")
        .eq("fiat", client.fiat_currency)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single();

      const trades        = (tradeRows ?? []) as Trade[];
      const balances      = (balanceRows ?? []) as BalancePoint[];
      const capitalEvents = (capitalRows ?? []) as CapitalEvent[];
      const rate          = rateRow as ExchangeRate | null;

      // ── Idempotency: check if this month's report was already sent ──
      // Prevents duplicate emails and double-updating carried_loss on re-runs.
      const { data: existingSnap } = await supabase
        .from("monthly_snapshots")
        .select("carried_loss_in, report_sent_at, fee_paid")
        .eq("client_id", client.id)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();

      if (existingSnap?.report_sent_at) {
        results.skipped++;
        continue;
      }

      // ── Bug 1 fix: opening balance = last balance BEFORE month start ──
      // Using first-of-month balance is fragile — if the daily-snapshot cron
      // fails for the first few days, the "opening" becomes skewed.
      // The correct opening is the last snapshot BEFORE the month began.
      const { data: prevRow } = await supabase
        .from("balance_history")
        .select("balance, recorded_at")
        .eq("client_id", client.id)
        .lt("recorded_at", startISO)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevClosingBalance = (prevRow as BalancePoint | null)?.balance ?? null;

      // ── Guard: no balance history → cannot compute accurate P&L ──
      // Skips rather than sending a $0 / misleading report.
      if (balances.length === 0) {
        results.errors.push({
          client: client.name,
          error: `No balance history found for ${label} — skipping. Ensure the daily-snapshot cron is running.`,
        });
        results.skipped++;
        continue;
      }

      // Use carried_loss_in from an existing partial snapshot when retrying
      // (email failed previously after DB was updated — avoids double-deducting).
      const carriedLossIn = existingSnap != null
        ? ((existingSnap as { carried_loss_in?: number | null }).carried_loss_in ?? client.carried_loss ?? 0)
        : (client.carried_loss ?? 0);

      // fee_paid from snapshot (set by /api/admin/fee-paid after client pays).
      // On first send, existingSnap is null → feePaid = 0 (fee is a liability,
      // shown in Cash Flow only when actually received, not when billed).
      const feePaid = (existingSnap as { fee_paid?: number | null } | null)?.fee_paid ?? 0;

      const stats = computeStats(trades, balances, capitalEvents, carriedLossIn, client.profit_share_pct ?? 0.5, prevClosingBalance);

      // ── Accounting reconciliation check ──────────────────────────────────────
      // Verify the fundamental accounting identity BEFORE sending the email:
      //
      //   closing = opening + deposits - withdrawals + gross_pnl
      //   ↔  gross_pnl = (closing - opening) - (deposits - withdrawals)
      //
      // If this doesn't hold within $0.01, there is a data integrity problem:
      //   • A deposit/withdrawal is missing from capital_events
      //   • Balance history has a corrupted snapshot
      //   • The transfer detection system missed a ROLL_IN or ROLL_OUT
      //
      // The email is still sent (to not block the client), but the error is
      // logged prominently so the admin can investigate before the fee is paid.
      const expectedClosing = stats.opening_balance + stats.net_new_capital + stats.gross_pnl;
      const reconciliationDelta = Math.abs(expectedClosing - stats.closing_balance);
      if (reconciliationDelta > 0.01) {
        const reconMsg = [
          `RECONCILIATION MISMATCH for ${client.name} (${label}):`,
          `  opening_balance    = ${stats.opening_balance.toFixed(4)}`,
          `  + net_new_capital  = ${stats.net_new_capital.toFixed(4)}  (deposits ${stats.total_deposits.toFixed(4)} − withdrawals ${stats.total_withdrawals.toFixed(4)})`,
          `  + gross_pnl        = ${stats.gross_pnl.toFixed(4)}`,
          `  = expected_closing = ${expectedClosing.toFixed(4)}`,
          `  actual closing     = ${stats.closing_balance.toFixed(4)}`,
          `  delta              = ${reconciliationDelta.toFixed(4)} USDT`,
          `Possible causes:`,
          `  1. A deposit or withdrawal is missing from capital_events`,
          `  2. A balance_history snapshot was corrupted or duplicated`,
          `  3. Transfer detection missed a ROLL_IN or ROLL_OUT on Binance`,
          `Action: run GET /api/admin/capital-event?email=${client.email} and compare against Binance transfer history.`,
        ].join("\n");
        console.error(`[monthly-report] ⚠ ${reconMsg}`);
        results.errors.push({ client: client.name, error: `Reconciliation mismatch: delta=${reconciliationDelta.toFixed(4)} USDT (see server logs)` });
      }

      const html  = buildEmail(client, stats, trades, capitalEvents, rate, label, feePaid, year, month);

      const subject = stats.net_pnl > 0
        ? `${label} Report — Performance Fee Due: ${fmtMoney(stats.performance_fee)} USDT`
        : `${label} Report — Account Statement`;

      const { error: emailErr } = await resend.emails.send({
        from: ARCUS_EMAIL_FROM,
        to:   client.email,
        cc:   ARCUS_EMAIL_CC,
        subject,
        html,
      });

      if (emailErr) throw new Error(`Resend: ${emailErr.message}`);

      // Persist snapshot
      await supabase.from("monthly_snapshots").upsert({
        client_id: client.id, year, month,
        opening_balance:   stats.opening_balance,
        closing_balance:   stats.closing_balance,
        total_deposits:    stats.total_deposits,
        total_withdrawals: stats.total_withdrawals,
        net_new_capital:   stats.net_new_capital,
        gross_pnl:         stats.gross_pnl,
        carried_loss_in:   stats.carried_loss_in,
        net_pnl:           stats.net_pnl,
        performance_fee:   stats.performance_fee,
        carried_loss_out:  stats.carried_loss_out,
        total_trades:      stats.total_trades,
        winning_trades:    stats.winning_trades,
        losing_trades:     stats.losing_trades,
        win_rate:          stats.win_rate,
        profit_factor:     isFinite(stats.profit_factor) ? stats.profit_factor : null,
        best_trade_pnl:    stats.best_trade_pnl,
        worst_trade_pnl:   stats.worst_trade_pnl,
        avg_win:           stats.avg_win,
        avg_loss:          stats.avg_loss,
        report_sent_at:    new Date().toISOString(),
        report_sent_to:    client.email,
      }, { onConflict: "client_id,year,month" });

      // Roll carried_loss forward — monthly_snapshots.carried_loss_out is the
      // source of truth if this update ever fails (recoverable via manual SQL).
      const { error: carryErr } = await supabase.from("clients")
        .update({ carried_loss: stats.carried_loss_out })
        .eq("id", client.id);
      if (carryErr) {
        // Non-fatal: email already sent and snapshot saved. Log clearly so admin
        // can manually run: UPDATE clients SET carried_loss = <carried_loss_out>
        console.error(`[monthly-report] carried_loss update failed for ${client.name}: ${carryErr.message}`);
        results.errors.push({ client: client.name, error: `carried_loss update failed (email was sent): ${carryErr.message}` });
      }

      // Immutable audit entry
      await supabase.from("audit_log").insert({
        client_id:     client.id,
        event_type:    "REPORT_SENT",
        amount:        stats.performance_fee > 0 ? -stats.performance_fee : 0,
        balance_before: stats.opening_balance,
        balance_after:  stats.closing_balance,
        description:   `Monthly report sent for ${label}. Fee due: ${fmtMoney(stats.performance_fee)} USDT. Net P&L (capital-adj): ${fmtSigned(stats.gross_pnl)}`,
        metadata: {
          year, month, label,
          gross_pnl: stats.gross_pnl, net_pnl: stats.net_pnl,
          performance_fee: stats.performance_fee, carried_loss_out: stats.carried_loss_out,
          total_deposits: stats.total_deposits, total_withdrawals: stats.total_withdrawals,
          net_new_capital: stats.net_new_capital, trades_count: stats.total_trades,
          email_sent_to: client.email,
        },
      });

      results.reports_sent++;
    } catch (err) {
      results.errors.push({ client: (client as Client).name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Arcus internal business report — sent after all client reports complete
  try {
    await sendArcusAdminReport(resend, supabase, year, month, label, clients as Client[]);
  } catch (err) {
    console.error("[monthly-report] Arcus admin report failed:", err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({ success: true, period: { year, month, label }, ...results });
}
