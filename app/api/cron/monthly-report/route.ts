import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const ARCUS_EMAIL_FROM  = "Arcus Quant Fund <admin@arcusquantfund.com>";
const ARCUS_EMAIL_CC    = "shehzadahmed@arcusquantfund.com";
const ARCUS_SITE        = "https://arcusquantfund.com";

// Shehzad's payment details for performance fee collection
const PAYMENT_BINANCE_UID    = "131952271";
const PAYMENT_BINANCE_USER   = "User-b138c";
const PAYMENT_BANK_NAME      = "United Commercial Bank PLC";
const PAYMENT_BANK_HOLDER    = "Shehzad Ahmed";
const PAYMENT_BANK_ACCOUNT   = "050 3201 0000 99748";
const PAYMENT_BANK_ROUTING   = "245263286";
const PAYMENT_BANK_BRANCH    = "Mohammadpur Branch (050)";

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

type BalancePoint = {
  balance: number;
  recorded_at: string;
};

type ExchangeRate = {
  lower_bound: number;
  upper_bound: number;
  mid_rate: number;
  fetched_at: string;
};

type MonthStats = {
  gross_pnl: number;
  net_pnl: number;
  carried_loss_in: number;
  performance_fee: number;
  carried_loss_out: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_factor: number;
  best_trade_pnl: number;
  worst_trade_pnl: number;
  avg_win: number;
  avg_loss: number;
  opening_balance: number;
  closing_balance: number;
};

// ─── Authorization ────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const isCronRequest = req.headers.get("x-vercel-cron-job-name") !== null;
  const isManual =
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  return isCronRequest || isManual;
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function getPreviousMonth(): { year: number; month: number; label: string; startISO: string; endISO: string } {
  const now = new Date();
  const year  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-indexed
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end   = new Date(year, month,     0, 23, 59, 59, 999); // last day of month
  const label = start.toLocaleString("en-US", { month: "long", year: "numeric" });
  return {
    year, month, label,
    startISO: start.toISOString(),
    endISO:   end.toISOString(),
  };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtMoney(val: number | null | undefined, prefix = "$"): string {
  if (val == null) return "N/A";
  return `${prefix}${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMoneyFull(val: number | null | undefined, prefix = "$"): string {
  if (val == null) return "N/A";
  const sign = val >= 0 ? "+" : "-";
  return `${sign}${prefix}${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFiat(val: number | null | undefined, fiat: string): string {
  if (val == null) return "N/A";
  return `${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${fiat}`;
}

// ─── Stats Calculator ─────────────────────────────────────────────────────────

function computeStats(
  trades: Trade[],
  balances: BalancePoint[],
  carriedLossIn: number,
  profitSharePct: number
): MonthStats {
  const closedTrades = trades.filter((t) => t.side?.toUpperCase() === "SELL" && t.pnl != null);
  const wins   = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closedTrades.filter((t) => (t.pnl ?? 0) < 0);

  const gross_pnl     = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const gross_wins    = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const gross_losses  = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const profit_factor = gross_losses > 0 ? gross_wins / gross_losses : gross_wins > 0 ? 999 : 0;

  // Net P&L after deducting any carried loss from prior months
  const net_pnl        = gross_pnl - carriedLossIn;
  const performance_fee = net_pnl > 0 ? net_pnl * profitSharePct : 0;
  const carried_loss_out = net_pnl < 0 ? Math.abs(net_pnl) : 0;

  const sorted = [...balances].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
  const opening_balance = sorted[0]?.balance ?? 0;
  const closing_balance = sorted[sorted.length - 1]?.balance ?? 0;

  const pnls = closedTrades.map((t) => t.pnl ?? 0);
  const best_trade_pnl  = pnls.length > 0 ? Math.max(...pnls) : 0;
  const worst_trade_pnl = pnls.length > 0 ? Math.min(...pnls) : 0;
  const avg_win         = wins.length > 0 ? gross_wins / wins.length : 0;
  const avg_loss        = losses.length > 0 ? gross_losses / losses.length : 0;

  return {
    gross_pnl,
    net_pnl,
    carried_loss_in: carriedLossIn,
    performance_fee,
    carried_loss_out,
    total_trades: closedTrades.length,
    winning_trades: wins.length,
    losing_trades: losses.length,
    win_rate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
    profit_factor,
    best_trade_pnl,
    worst_trade_pnl,
    avg_win,
    avg_loss,
    opening_balance,
    closing_balance,
  };
}

// ─── Email HTML Generator ─────────────────────────────────────────────────────

function buildEmailHtml(
  client: Client,
  stats: MonthStats,
  trades: Trade[],
  rate: ExchangeRate | null,
  monthLabel: string
): string {
  const isProfitable = stats.net_pnl > 0;
  const gold   = "#f8ac07";
  const green  = "#22c55e";
  const red    = "#ef4444";
  const pnlColor = (val: number) => (val >= 0 ? green : red);

  // BDT equivalent of closing balance
  const closingFiatLower = rate ? stats.closing_balance * rate.lower_bound : null;
  const closingFiatUpper = rate ? stats.closing_balance * rate.upper_bound : null;
  const feeInFiatLower   = rate ? stats.performance_fee * rate.lower_bound : null;
  const feeInFiatUpper   = rate ? stats.performance_fee * rate.upper_bound : null;

  // Transaction rows
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const tradeRows = sortedTrades.map((t, i) => {
    const isBuy  = t.side?.toUpperCase() === "BUY";
    const hasPnl = t.pnl != null && t.side?.toUpperCase() === "SELL";
    return `
    <tr style="border-bottom:1px solid #1f2937;">
      <td style="padding:10px 8px;color:#9ca3af;font-size:12px;">${i + 1}</td>
      <td style="padding:10px 8px;color:#d1d5db;font-size:12px;">${fmtDate(t.timestamp)}</td>
      <td style="padding:10px 8px;font-size:12px;font-weight:700;color:${isBuy ? green : red};">${t.side?.toUpperCase()}</td>
      <td style="padding:10px 8px;color:#d1d5db;font-family:monospace;font-size:12px;">$${t.price?.toFixed(4)}</td>
      <td style="padding:10px 8px;color:#9ca3af;font-size:12px;">${t.quantity?.toFixed(2)}</td>
      <td style="padding:10px 8px;color:#d1d5db;font-size:12px;">$${t.amount?.toFixed(2)}</td>
      <td style="padding:10px 8px;font-size:12px;font-weight:600;color:${hasPnl ? pnlColor(t.pnl!) : "#6b7280"};">
        ${hasPnl ? fmtMoneyFull(t.pnl) : "—"}
      </td>
      <td style="padding:10px 8px;color:#6b7280;font-size:11px;">${t.reason ?? "—"}</td>
    </tr>`;
  }).join("");

  const profitBlock = isProfitable ? `
  <!-- PERFORMANCE FEE SECTION (PROFIT) -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#0d1a0d;border:1px solid ${green}30;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:20px 24px 0;">
      <div style="color:${green};font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px;">
        Performance Fee — ${(client.profit_share_pct * 100).toFixed(0)}% per Contract
      </div>
    </td></tr>
    <tr><td style="padding:0 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;color:#9ca3af;font-size:13px;width:55%;">Gross Monthly P&L</td>
          <td style="padding:8px 0;color:${pnlColor(stats.gross_pnl)};font-size:13px;font-weight:600;text-align:right;">
            ${fmtMoneyFull(stats.gross_pnl)}
          </td>
        </tr>
        ${stats.carried_loss_in > 0 ? `
        <tr>
          <td style="padding:8px 0;color:#9ca3af;font-size:13px;">Less: Carried Loss from Prior Month</td>
          <td style="padding:8px 0;color:${red};font-size:13px;font-weight:600;text-align:right;">
            −${fmtMoney(stats.carried_loss_in)}
          </td>
        </tr>` : ""}
        <tr>
          <td style="padding:8px 0;border-top:1px solid #1f2937;color:#e5e7eb;font-size:14px;font-weight:700;">Net Profit</td>
          <td style="padding:8px 0;border-top:1px solid #1f2937;color:${green};font-size:14px;font-weight:700;text-align:right;">
            ${fmtMoneyFull(stats.net_pnl)}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0 8px;color:#e5e7eb;font-size:14px;font-weight:700;">
            Performance Fee (${(client.profit_share_pct * 100).toFixed(0)}%)
          </td>
          <td style="padding:12px 0 8px;color:${gold};font-size:18px;font-weight:800;text-align:right;">
            ${fmtMoney(stats.performance_fee)} USDT
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:4px 24px 20px;">
      ${rate ? `
      <div style="color:#6b7280;font-size:12px;">
        BDT equivalent: ${fmtFiat(feeInFiatLower, client.fiat_currency)} – ${fmtFiat(feeInFiatUpper, client.fiat_currency)}
        &nbsp;(at current P2P bank transfer rates)
      </div>` : ""}
    </td></tr>

    <!-- Payment Instructions -->
    <tr><td style="background:#111827;padding:20px 24px;border-top:1px solid #1f2937;">
      <div style="color:${gold};font-size:13px;font-weight:700;margin-bottom:14px;">
        ► Please Send ${fmtMoney(stats.performance_fee)} USDT To:
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="48%" valign="top" style="padding-right:12px;">
            <div style="background:#0a0a0a;border:1px solid #374151;border-radius:10px;padding:16px;">
              <div style="color:${gold};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">
                Option 1 — Binance Transfer
              </div>
              <div style="margin-bottom:6px;">
                <span style="color:#6b7280;font-size:12px;">Username:</span>
                <span style="color:#e5e7eb;font-size:12px;font-weight:600;margin-left:6px;">${PAYMENT_BINANCE_USER}</span>
              </div>
              <div>
                <span style="color:#6b7280;font-size:12px;">UID:</span>
                <span style="color:#e5e7eb;font-size:12px;font-weight:600;margin-left:6px;font-family:monospace;">${PAYMENT_BINANCE_UID}</span>
              </div>
            </div>
          </td>
          <td width="4%" style="text-align:center;vertical-align:middle;color:#4b5563;font-size:13px;">OR</td>
          <td width="48%" valign="top" style="padding-left:12px;">
            <div style="background:#0a0a0a;border:1px solid #374151;border-radius:10px;padding:16px;">
              <div style="color:${gold};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">
                Option 2 — UCB Bank (${client.fiat_currency})
              </div>
              <div style="margin-bottom:4px;">
                <span style="color:#6b7280;font-size:11px;">Account Holder:</span>
                <span style="color:#e5e7eb;font-size:11px;font-weight:600;margin-left:4px;">${PAYMENT_BANK_HOLDER}</span>
              </div>
              <div style="margin-bottom:4px;">
                <span style="color:#6b7280;font-size:11px;">Bank:</span>
                <span style="color:#e5e7eb;font-size:11px;margin-left:4px;">${PAYMENT_BANK_NAME}</span>
              </div>
              <div style="margin-bottom:4px;">
                <span style="color:#6b7280;font-size:11px;">Branch:</span>
                <span style="color:#e5e7eb;font-size:11px;margin-left:4px;">${PAYMENT_BANK_BRANCH}</span>
              </div>
              <div style="margin-bottom:4px;">
                <span style="color:#6b7280;font-size:11px;">A/C No:</span>
                <span style="color:#e5e7eb;font-size:11px;font-weight:600;font-family:monospace;margin-left:4px;">${PAYMENT_BANK_ACCOUNT}</span>
              </div>
              <div>
                <span style="color:#6b7280;font-size:11px;">Routing:</span>
                <span style="color:#e5e7eb;font-size:11px;font-family:monospace;margin-left:4px;">${PAYMENT_BANK_ROUTING}</span>
              </div>
            </div>
          </td>
        </tr>
      </table>
      <div style="margin-top:14px;color:#4b5563;font-size:11px;line-height:1.5;">
        Please complete this payment within 5 business days of receiving this report.
        Once sent, please reply to this email or message us on WhatsApp with the transaction reference.
      </div>
    </td></tr>
  </table>` : `
  <!-- LOSS CARRIED FORWARD SECTION -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#1a0d0d;border:1px solid ${red}30;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:20px 24px;">
      <div style="color:${red};font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px;">
        Loss — No Performance Fee This Month
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;color:#9ca3af;font-size:13px;width:55%;">Monthly Loss</td>
          <td style="padding:8px 0;color:${red};font-size:13px;font-weight:600;text-align:right;">
            ${fmtMoneyFull(stats.gross_pnl)}
          </td>
        </tr>
        ${stats.carried_loss_in > 0 ? `
        <tr>
          <td style="padding:8px 0;color:#9ca3af;font-size:13px;">Prior Carried Loss</td>
          <td style="padding:8px 0;color:${red};font-size:13px;font-weight:600;text-align:right;">
            −${fmtMoney(stats.carried_loss_in)}
          </td>
        </tr>` : ""}
        <tr>
          <td style="padding:8px 0;border-top:1px solid #1f2937;color:#e5e7eb;font-size:14px;font-weight:700;">
            Total Loss Carried Forward
          </td>
          <td style="padding:8px 0;border-top:1px solid #1f2937;color:${red};font-size:14px;font-weight:700;text-align:right;">
            −${fmtMoney(stats.carried_loss_out)}
          </td>
        </tr>
      </table>
      <div style="margin-top:14px;background:#0a0a0a;border-radius:8px;padding:14px;color:#9ca3af;font-size:13px;line-height:1.6;">
        No performance fee is due this month. The loss of
        <strong style="color:${red};">${fmtMoney(stats.carried_loss_out)}</strong>
        will be deducted from the first profitable month before any fee calculation.
        Your trading account continues operating at full capacity.
      </div>
    </td></tr>
  </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Arcus Quant Fund — Monthly Report</title></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;">
<tr><td align="center" style="padding:40px 20px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid #1f2937;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#111827 0%,#0a0a0a 100%);padding:32px 32px 28px;border-bottom:1px solid #1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="color:${gold};font-size:22px;font-weight:800;letter-spacing:-0.02em;">◈ ARCUS QUANT FUND</div>
          <div style="color:#6b7280;font-size:13px;margin-top:4px;">Monthly Performance Report</div>
        </td>
        <td align="right">
          <div style="background:${gold}15;border:1px solid ${gold}40;border-radius:8px;padding:8px 16px;display:inline-block;">
            <div style="color:${gold};font-size:13px;font-weight:700;">${monthLabel}</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- GREETING -->
  <tr><td style="padding:28px 32px 8px;">
    <div style="color:#e5e7eb;font-size:16px;margin-bottom:8px;">Dear <strong style="color:#fff;">${client.name}</strong>,</div>
    <div style="color:#6b7280;font-size:14px;line-height:1.6;">
      Here is your complete account statement for <strong style="color:#9ca3af;">${monthLabel}</strong>.
      Every transaction has been recorded and is auditable on your dashboard.
    </div>
  </td></tr>

  <!-- ACCOUNT STATEMENT -->
  <tr><td style="padding:8px 32px 0;">
    <div style="color:${gold};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
      Account Statement
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Opening Balance</div>
          <div style="color:#e5e7eb;font-size:20px;font-weight:700;">${fmtMoney(stats.opening_balance)}</div>
        </td>
        <td style="padding:16px 20px;border-bottom:1px solid #1f2937;border-left:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Closing Balance</div>
          <div style="color:#e5e7eb;font-size:20px;font-weight:700;">${fmtMoney(stats.closing_balance)}</div>
        </td>
        <td style="padding:16px 20px;border-bottom:1px solid #1f2937;border-left:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">Gross Monthly P&L</div>
          <div style="color:${pnlColor(stats.gross_pnl)};font-size:20px;font-weight:700;">
            ${fmtMoneyFull(stats.gross_pnl)}
          </div>
        </td>
      </tr>
      <tr>
        <td colspan="3" style="padding:12px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#6b7280;font-size:12px;padding:4px 0;">Monthly ROI</td>
              <td style="color:${pnlColor(stats.gross_pnl)};font-size:12px;font-weight:600;text-align:right;padding:4px 0;">
                ${stats.opening_balance > 0 ? fmtMoneyFull((stats.gross_pnl / stats.opening_balance) * 100, "").replace("$", "") + "%" : "N/A"}
              </td>
            </tr>
            ${stats.carried_loss_in > 0 ? `
            <tr>
              <td style="color:#6b7280;font-size:12px;padding:4px 0;">Carried Loss (from prior month)</td>
              <td style="color:${red};font-size:12px;font-weight:600;text-align:right;padding:4px 0;">
                −${fmtMoney(stats.carried_loss_in)}
              </td>
            </tr>` : ""}
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- PROFIT OR LOSS BLOCK -->
  <tr><td style="padding:0 32px;">
    ${profitBlock}
  </td></tr>

  <!-- TRADING PERFORMANCE -->
  <tr><td style="padding:8px 32px 0;">
    <div style="color:${gold};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
      Trading Performance
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:16px;text-align:center;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:6px;">Total Trades</div>
          <div style="color:#fff;font-size:22px;font-weight:800;">${stats.total_trades}</div>
          <div style="color:#6b7280;font-size:11px;margin-top:2px;">${stats.winning_trades}W / ${stats.losing_trades}L</div>
        </td>
        <td style="padding:16px;text-align:center;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:6px;">Win Rate</div>
          <div style="color:${stats.win_rate >= 50 ? green : red};font-size:22px;font-weight:800;">${stats.win_rate.toFixed(1)}%</div>
        </td>
        <td style="padding:16px;text-align:center;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:6px;">Profit Factor</div>
          <div style="color:${stats.profit_factor >= 1 ? green : red};font-size:22px;font-weight:800;">
            ${isFinite(stats.profit_factor) ? stats.profit_factor.toFixed(2) : "∞"}
          </div>
        </td>
        <td style="padding:16px;text-align:center;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:6px;">Avg Win</div>
          <div style="color:${green};font-size:22px;font-weight:800;">${fmtMoney(stats.avg_win)}</div>
        </td>
      </tr>
      <tr style="border-top:1px solid #1f2937;">
        <td colspan="2" style="padding:12px 16px;border-right:1px solid #1f2937;">
          <span style="color:#6b7280;font-size:12px;">Best Trade: </span>
          <span style="color:${green};font-size:12px;font-weight:600;">${fmtMoneyFull(stats.best_trade_pnl)}</span>
        </td>
        <td colspan="2" style="padding:12px 16px;">
          <span style="color:#6b7280;font-size:12px;">Worst Trade: </span>
          <span style="color:${red};font-size:12px;font-weight:600;">${fmtMoneyFull(stats.worst_trade_pnl)}</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- EXCHANGE RATES -->
  ${rate ? `
  <tr><td style="padding:24px 32px 0;">
    <div style="color:${gold};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
      USDT → ${client.fiat_currency} Exchange Rates &nbsp;
      <span style="color:#4b5563;font-size:10px;font-weight:400;text-transform:none;">
        Binance P2P · Bank Transfer · 1,000+ USDT · as of ${fmtDate(rate.fetched_at)}
      </span>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:16px;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:6px;">Rate Range</div>
          <div style="color:#fff;font-size:16px;font-weight:700;">
            ${rate.lower_bound.toLocaleString()} – ${rate.upper_bound.toLocaleString()}
            <span style="color:#6b7280;font-size:12px;font-weight:400;"> ${client.fiat_currency}/USDT</span>
          </div>
        </td>
        <td style="padding:16px;border-right:1px solid #1f2937;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:6px;">Your Balance at Lower Rate</div>
          <div style="color:#9ca3af;font-size:16px;font-weight:700;">
            ${fmtFiat(closingFiatLower, client.fiat_currency)}
          </div>
          <div style="color:#4b5563;font-size:11px;">(${rate.lower_bound.toLocaleString()} ${client.fiat_currency}/USDT)</div>
        </td>
        <td style="padding:16px;">
          <div style="color:#6b7280;font-size:11px;margin-bottom:6px;">Your Balance at Upper Rate</div>
          <div style="color:${gold};font-size:16px;font-weight:700;">
            ${fmtFiat(closingFiatUpper, client.fiat_currency)}
          </div>
          <div style="color:#4b5563;font-size:11px;">(${rate.upper_bound.toLocaleString()} ${client.fiat_currency}/USDT)</div>
        </td>
      </tr>
    </table>
  </td></tr>` : ""}

  <!-- TRANSACTION HISTORY -->
  <tr><td style="padding:24px 32px 0;">
    <div style="color:${gold};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
      Transaction History — ${monthLabel}
    </div>
    ${trades.length === 0 ? `
    <div style="background:#111827;border-radius:12px;padding:24px;text-align:center;color:#4b5563;font-size:14px;">
      No trades executed this month.
    </div>` : `
    <div style="background:#111827;border-radius:12px;overflow:hidden;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="background:#0a0a0a;border-bottom:1px solid #374151;">
          <th style="padding:10px 8px;color:#6b7280;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;">#</th>
          <th style="padding:10px 8px;color:#6b7280;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;">Date</th>
          <th style="padding:10px 8px;color:#6b7280;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;">Side</th>
          <th style="padding:10px 8px;color:#6b7280;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;">Price</th>
          <th style="padding:10px 8px;color:#6b7280;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;">Qty</th>
          <th style="padding:10px 8px;color:#6b7280;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;">Amount</th>
          <th style="padding:10px 8px;color:#6b7280;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;">P&L</th>
          <th style="padding:10px 8px;color:#6b7280;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;">Reason</th>
        </tr>
        ${tradeRows}
      </table>
    </div>`}
  </td></tr>

  <!-- AUDIT NOTICE -->
  <tr><td style="padding:24px 32px 0;">
    <div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:10px;padding:16px 20px;">
      <div style="color:#60a5fa;font-size:12px;font-weight:600;margin-bottom:6px;">Audit Trail</div>
      <div style="color:#6b7280;font-size:12px;line-height:1.6;">
        This report is auto-generated from live trading data. Every balance snapshot, trade, and
        rate fetch is permanently logged in our immutable audit system.
        View your complete record at
        <a href="${ARCUS_SITE}/dashboard" style="color:#60a5fa;text-decoration:none;">${ARCUS_SITE}/dashboard</a>.
      </div>
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:28px 32px 32px;border-top:1px solid #1f2937;margin-top:24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="color:${gold};font-size:14px;font-weight:700;margin-bottom:4px;">◈ Arcus Quant Fund</div>
          <div style="color:#4b5563;font-size:12px;">Systematic Algorithmic Trading</div>
        </td>
        <td align="right" valign="top">
          <div style="color:#4b5563;font-size:11px;line-height:2;">
            <a href="${ARCUS_SITE}" style="color:#6b7280;text-decoration:none;">${ARCUS_SITE}</a><br/>
            <a href="mailto:contact@arcusquantfund.com" style="color:#6b7280;text-decoration:none;">contact@arcusquantfund.com</a>
          </div>
        </td>
      </tr>
    </table>
    <div style="margin-top:16px;color:#374151;font-size:11px;line-height:1.5;border-top:1px solid #111;padding-top:16px;">
      This report was generated automatically on ${new Date().toUTCString()}.
      Past performance does not guarantee future results. This is not financial advice.
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

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

  // ── 1. Fetch all active clients ──────────────────────────────────────────
  const { data: clients, error: clientsErr } = await supabase
    .from("clients")
    .select("id, name, email, bot_id, fiat_currency, profit_share_pct, carried_loss, initial_capital")
    .eq("is_active", true);

  if (clientsErr || !clients) {
    return NextResponse.json(
      { error: "Failed to fetch clients", detail: clientsErr?.message },
      { status: 500 }
    );
  }

  for (const client of clients as Client[]) {
    try {
      if (!client.bot_id || !client.email) {
        results.skipped++;
        continue;
      }

      // ── 2. Fetch trades for the month ──────────────────────────────────
      const { data: tradeRows } = await supabase
        .from("trade_log")
        .select("trade_id, timestamp, symbol, side, price, quantity, amount, pnl, reason")
        .eq("client_id", client.bot_id)
        .gte("timestamp", startISO)
        .lte("timestamp", endISO)
        .order("timestamp", { ascending: true });

      const trades = (tradeRows ?? []) as Trade[];

      // ── 3. Fetch balance history for the month ─────────────────────────
      const { data: balanceRows } = await supabase
        .from("balance_history")
        .select("balance, recorded_at")
        .eq("client_id", client.id)
        .gte("recorded_at", startISO)
        .lte("recorded_at", endISO)
        .order("recorded_at", { ascending: true });

      const balances = (balanceRows ?? []) as BalancePoint[];

      // ── 4. Fetch latest exchange rate for client's fiat ────────────────
      const { data: rateRow } = await supabase
        .from("exchange_rates")
        .select("lower_bound, upper_bound, mid_rate, fetched_at")
        .eq("asset", "USDT")
        .eq("fiat", client.fiat_currency)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single();

      const rate = (rateRow as ExchangeRate | null);

      // ── 5. Compute stats ───────────────────────────────────────────────
      const stats = computeStats(
        trades,
        balances,
        client.carried_loss ?? 0,
        client.profit_share_pct ?? 0.5
      );

      // ── 6. Build and send email ────────────────────────────────────────
      const html = buildEmailHtml(client, stats, trades, rate, label);

      const subject = stats.net_pnl > 0
        ? `Your ${label} Report — Performance Fee Due: ${fmtMoney(stats.performance_fee)} USDT`
        : `Your ${label} Report — Account Statement`;

      const { error: emailErr } = await resend.emails.send({
        from: ARCUS_EMAIL_FROM,
        to: client.email,
        cc: ARCUS_EMAIL_CC,
        subject,
        html,
      });

      if (emailErr) throw new Error(`Resend: ${emailErr.message}`);

      // ── 7. Upsert monthly snapshot ─────────────────────────────────────
      await supabase.from("monthly_snapshots").upsert({
        client_id:         client.id,
        year,
        month,
        opening_balance:   stats.opening_balance,
        closing_balance:   stats.closing_balance,
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

      // ── 8. Update client's carried_loss for next month ─────────────────
      await supabase
        .from("clients")
        .update({ carried_loss: stats.carried_loss_out })
        .eq("id", client.id);

      // ── 9. Append to audit log ─────────────────────────────────────────
      await supabase.from("audit_log").insert({
        client_id:     client.id,
        event_type:    "REPORT_SENT",
        amount:        stats.performance_fee > 0 ? -stats.performance_fee : 0,
        balance_before: stats.opening_balance,
        balance_after:  stats.closing_balance,
        description:   `Monthly report sent for ${label}. Fee due: ${fmtMoney(stats.performance_fee)} USDT`,
        metadata: {
          year, month, label,
          gross_pnl:       stats.gross_pnl,
          net_pnl:         stats.net_pnl,
          performance_fee: stats.performance_fee,
          carried_loss_out: stats.carried_loss_out,
          trades_count:    stats.total_trades,
          email_sent_to:   client.email,
          exchange_rate:   rate ?? null,
        },
      });

      results.reports_sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push({ client: client.name, error: msg });
    }
  }

  console.log("[monthly-report] Complete:", results);
  return NextResponse.json({
    success: true,
    period: { year, month, label },
    ...results,
  });
}
