"use client";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Area, AreaChart, Cell,
} from "recharts";
import { LogOut } from "lucide-react";
import dynamic from "next/dynamic";

const TradingChart = dynamic(() => import("@/components/TradingChart"), { ssr: false });
const TradeHistoryChart = dynamic(() => import("@/components/TradeHistoryChart"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

type BotState = {
  symbol: string;
  position: string | null;
  entry_price: number | null;
  extreme_price: number | null;
  is_uptrend: boolean;
  current_amount: number;
  current_quantity: number | null;
  last_dc_price: number | null;
  leverage: number;
  margin_type: string;
  updated_at: string;
  open_orders_json: string | null;   // JSON array of pending Binance orders
  bnb_burn_active: boolean | null;   // true = 25% fee discount active
  margin_level: number | null;
  liq_price: number | null;
} | null;

type PricePoint = {
  timestamp: string;
  open: number; high: number; low: number; close: number;
  volume: number; vwap: number; vwap_ema: number;
};

type Trade = {
  trade_id: string;
  timestamp: string;
  symbol: string;
  side: string;
  price: number;
  quantity: number;
  amount: number;
  pnl: number | null;
  pnl_percent: number | null;
  reason: string | null;
  commission_usdt: number | null;
  source: string | null;
};

type MonthlySnapshot = {
  year: number;
  month: number;
  opening_balance: number;
  closing_balance: number;
  gross_pnl: number;
  net_pnl: number;
  performance_fee: number;
  fee_paid: number | null;
  carried_loss_in: number;
  total_deposits: number;
  total_withdrawals: number;
  total_trades: number;
};

type CapitalEvent = {
  event_type: string;
  amount: number;
  notes: string | null;
  occurred_at: string;
};

type ExchangeFeeRow = {
  year: number;
  month: number;
  exchange_fees_usdt: number;
  trade_count: number;
  borrowing_interest_usdt: number | null;
};

type Props = {
  session: { user: { name: string; email: string } };
  botState: BotState;
  priceData: PricePoint[];
  trades: Trade[];
  balanceHistory: { balance: number; recorded_at: string }[];
  monthlySnapshots: MonthlySnapshot[];
  capitalEvents: CapitalEvent[];
  exchangeFees: ExchangeFeeRow[];
  initialCapital: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 2, prefix = "") {
  if (val == null) return "N/A";
  return `${prefix}${val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function pnlClass(val: number | null | undefined) {
  if (val == null || val === 0) return "text-gray-400";
  return val > 0 ? "text-green-400" : "text-red-400";
}

function calcMargin(botState: NonNullable<BotState>, currentPrice: number) {
  if (botState.position !== "long" || !botState.entry_price || !botState.current_quantity) return null;
  const { entry_price: entry, current_quantity: qty, leverage } = botState;
  const positionValue  = qty * currentPrice;
  const unrealizedPnl  = (currentPrice - entry) * qty;

  // Prefer real Binance values from DB (set by sync_to_supabase.py from Binance API).
  // Fall back to formula estimates only when DB columns are null.
  const liqPrice  = botState.liq_price ?? entry * (1 - 1 / leverage + 0.04);
  const distToLiq = ((currentPrice - liqPrice) / currentPrice) * 100;

  // initialMargin and borrowedAmount are fixed at entry — they don't change with price.
  const initialMargin  = (entry * qty) / leverage;
  const borrowedAmount = entry * qty - initialMargin;

  // margin_level = equity / borrowed. equity moves with price, borrowed is fixed.
  // Previous formula: positionValue / borrowedValue was circular (both scaled with currentPrice → always ~1.4).
  const calcedMarginLevel = borrowedAmount > 0 ? (initialMargin + unrealizedPnl) / borrowedAmount : Infinity;
  const marginLevel  = botState.margin_level ?? calcedMarginLevel;

  const marginStatus = marginLevel < 1.1 ? "HIGH RISK" : marginLevel < 1.3 ? "MODERATE RISK" : "SAFE";
  const pnlPct       = positionValue > 0 ? (unrealizedPnl / positionValue) * 100 * leverage : 0;

  const requiredMargin = positionValue / leverage;  // current margin requirement (for display)
  const marginRatio    = ((positionValue - requiredMargin) / positionValue) * 100;
  const borrowedValue  = positionValue - requiredMargin;
  return {
    positionValue, liqPrice, distToLiq, requiredMargin,
    marginRatio, borrowedValue, unrealizedPnl, marginLevel,
    marginStatus, pnlPct,
    totalAssetValue:  positionValue,
    totalEquityValue: initialMargin + unrealizedPnl,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, delta, deltaColor = "neutral", sub, tooltip }:
  { label: string; value: string; delta?: string; deltaColor?: "positive" | "negative" | "neutral"; sub?: string; tooltip?: string }) {
  const dc = deltaColor === "positive" ? "text-green-400" : deltaColor === "negative" ? "text-red-400" : "text-gray-400";
  return (
    <div className={`relative bg-gray-800/60 rounded-xl p-4 ${tooltip ? "group cursor-help" : ""}`}>
      <div className="text-gray-500 text-xs mb-1">{label}</div>
      <div className="text-white font-bold text-lg">{value}</div>
      {delta && <div className={`text-xs mt-0.5 ${dc}`}>{delta}</div>}
      {sub && <div className="text-gray-600 text-xs mt-0.5">{sub}</div>}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 shadow-xl z-50 hidden group-hover:block pointer-events-none">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-white font-semibold text-sm mb-3 mt-5 first:mt-0">{children}</h3>;
}

const TABS = ["dashboard", "trades", "performance", "capital"] as const;
type Tab = typeof TABS[number];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardClient({ session, botState, priceData, trades, balanceHistory, monthlySnapshots, capitalEvents, exchangeFees, initialCapital }: Props) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();

  // Tick every 30s so the live indicator stays accurate client-side
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Auto-refresh server data every 60s (matches sync script cadence)
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [router]);

  // Staleness: sync runs every 60s — >5 min = delayed, >8 min = offline
  const lastSync = botState?.updated_at ? new Date(botState.updated_at).getTime() : null;
  const ageSeconds = lastSync ? (now - lastSync) / 1000 : null;
  const liveStatus =
    ageSeconds === null ? "unknown"
    : ageSeconds < 300   ? "live"
    : ageSeconds < 480   ? "delayed"
    : "offline";

  const liveConfig = {
    live:    { dot: "bg-green-500",  ring: "border-green-500/30",  bg: "bg-green-500/10",  text: "text-green-400",  label: "LIVE" },
    delayed: { dot: "bg-yellow-400", ring: "border-yellow-400/30", bg: "bg-yellow-400/10", text: "text-yellow-400", label: "DELAYED" },
    offline: { dot: "bg-red-500",    ring: "border-red-500/30",    bg: "bg-red-500/10",    text: "text-red-400",    label: "OFFLINE" },
    unknown: { dot: "bg-gray-500",   ring: "border-gray-500/30",   bg: "bg-gray-500/10",   text: "text-gray-400",   label: "NO DATA" },
  }[liveStatus];

  const sortedPrice = [...priceData].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const latest = sortedPrice[sortedPrice.length - 1];
  const prev = sortedPrice[sortedPrice.length - 2];
  const currentPrice = latest?.close ?? null;
  const priceChange = currentPrice && prev ? ((currentPrice - prev.close) / prev.close) * 100 : null;
  const margin = botState && currentPrice ? calcMargin(botState, currentPrice) : null;

  const chartData = sortedPrice.slice(-240).map((p) => ({
    time: new Date(p.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    close: +p.close.toFixed(4),
    vwap_ema: p.vwap_ema ? +p.vwap_ema.toFixed(4) : null,
    volume: +p.volume.toFixed(0),
  }));

  const balanceChartData = balanceHistory.slice(-100).map((b) => ({
    date: new Date(b.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    balance: +b.balance.toFixed(2),
  }));

  const isUptrend = botState?.is_uptrend ?? false;
  const inPosition = botState?.position === "long";

  // ── Performance stats ──
  const closedTrades = [...trades]
    .filter(t => t.pnl != null)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Trades with |pnl| < $0.01 are break-even (rounding artifacts from near-zero fills)
  const PNL_MIN = 0.01;
  const wins   = closedTrades.filter(t => (t.pnl ?? 0) > PNL_MIN);
  const losses = closedTrades.filter(t => (t.pnl ?? 0) < -PNL_MIN);
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : null;
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const grossWin  = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
  // Guard: PF only meaningful when there are real losses (> $0.01)
  const profitFactor = grossLoss > PNL_MIN ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
  const avgWin  = wins.length   > 0 ? grossWin  / wins.length   : null;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : null;
  const bestTrade  = closedTrades.reduce((best,  t) => (t.pnl ?? -Infinity) > (best?.pnl  ?? -Infinity) ? t : best,  closedTrades[0]);
  const worstTrade = closedTrades.reduce((worst, t) => (t.pnl ?? Infinity)  < (worst?.pnl ?? Infinity)  ? t : worst, closedTrades[0]);

  const leverage = botState?.leverage ?? 3.5;
  const currentBalance = botState?.current_amount ?? null;

  // ROI: use pnl_percent from DB (FIFO-computed for Binance, bot-computed for SQLite).
  // Weighted average: weight each trade's % return by the margin deployed.
  // Avoids the index-pairing bug (pairing unrelated BUY[i] with SELL[i]).
  const pctTrades = closedTrades.filter(t => t.pnl_percent != null && Math.abs(t.pnl_percent) > 0.001);
  let roiPct: number | null = null;
  let totalInvested = 0;
  if (pctTrades.length > 0) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const t of pctTrades) {
      // margin deployed = |pnl| / |pnl_percent / 100|
      const pct = t.pnl_percent!;
      const margin = Math.abs(pct) > 0.001 ? Math.abs(t.pnl ?? 0) / Math.abs(pct / 100) : 0;
      weightedSum   += pct * margin;
      totalWeight   += margin;
      totalInvested += margin;
    }
    roiPct = totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
  const roiTradeCount = pctTrades.length;

  // Duration: first trade → now
  const firstTradeDate = closedTrades.length > 0 ? new Date(closedTrades[0].timestamp) : null;
  const monthsActive = firstTradeDate
    ? Math.max(1, Math.round((Date.now() - firstTradeDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
    : null;

  // Cumulative PnL chart (chronological)
  let running = 0;
  const cumulativePnlData = closedTrades.map((t, i) => {
    running += t.pnl ?? 0;
    return {
      n: i + 1,
      label: new Date(t.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cumPnl: +running.toFixed(2),
      pnl: +(t.pnl ?? 0).toFixed(2),
    };
  });

  // Per-trade PnL bars (last 50 for readability)
  const tradeBars = cumulativePnlData.slice(-50);

  const tabLabel: Record<Tab, string> = {
    dashboard:   "Trading Dashboard",
    trades:      "Trade History",
    performance: "Performance & ROI",
    capital:     "Capital & Returns",
  };

  // CSV export for trade history
  function downloadTradesCsv() {
    const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const headers = ["#", "Date", "Time", "Symbol", "Side", "Price", "Quantity", "Amount_USDT", "PnL_USDT", "PnL_Pct", "Return_On_Margin_Pct", "Reason"];
    const rows = sorted.map((t, i) => {
      const dt    = new Date(t.timestamp);
      const pnlPct = t.pnl != null && t.amount ? (t.pnl / t.amount * 100).toFixed(4) : "";
      const romPct = t.pnl != null && t.amount  ? (t.pnl / (t.amount / leverage) * 100).toFixed(4) : "";
      return [
        i + 1,
        dt.toLocaleDateString("en-US"),
        dt.toLocaleTimeString("en-US", { hour12: false }),
        t.symbol,
        t.side?.toUpperCase(),
        t.price?.toFixed(6),
        t.quantity?.toFixed(4),
        t.amount?.toFixed(4),
        t.pnl?.toFixed(4) ?? "",
        pnlPct,
        romPct,
        `"${(t.reason ?? "").replace(/"/g, '""')}"`,
      ].join(",");
    });
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `arcus_trades_${session.user.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // PDF/Print export for Capital & Returns report
  function printCapitalReport() {
    const rows = capRows ?? [];
    const printHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>Arcus Quant Fund — Capital Statement · ${session.user.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#111; font-size:11px; }
  h1 { font-size:18px; font-weight:800; margin-bottom:4px; }
  h2 { font-size:12px; font-weight:700; margin:18px 0 8px; text-transform:uppercase; letter-spacing:.08em; color:#555; border-bottom:1px solid #ddd; padding-bottom:4px; }
  .header { border-bottom:2px solid #f8ac07; padding-bottom:12px; margin-bottom:16px; }
  .gold { color:#b8860b; }
  .metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
  .metric { border:1px solid #e5e7eb; border-radius:6px; padding:8px 10px; }
  .metric-label { font-size:9px; text-transform:uppercase; letter-spacing:.06em; color:#888; }
  .metric-value { font-size:14px; font-weight:700; margin-top:2px; }
  table { width:100%; border-collapse:collapse; font-size:10px; }
  th { background:#f9fafb; border:1px solid #e5e7eb; padding:6px 8px; text-align:left; font-weight:600; text-transform:uppercase; font-size:9px; letter-spacing:.05em; color:#6b7280; }
  td { border:1px solid #e5e7eb; padding:5px 8px; }
  .annual { background:#fffbeb; font-weight:700; }
  .total  { background:#f3f4f6; font-weight:800; border-top:2px solid #d1d5db; }
  .pos { color:#15803d; } .neg { color:#b91c1c; }
  .footer { margin-top:24px; border-top:1px solid #e5e7eb; padding-top:10px; color:#9ca3af; font-size:9px; }
  @media print { body{padding:10mm} button{display:none!important} }
</style></head>
<body>
  <button onclick="window.print();window.close();" style="position:fixed;top:12px;right:12px;background:#f8ac07;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-weight:700;font-size:12px;">Print / Save PDF</button>
  <div class="header">
    <div class="gold" style="font-size:11px;font-weight:700;letter-spacing:.05em;">◈ ARCUS QUANT FUND</div>
    <h1>Capital &amp; Returns Statement</h1>
    <div style="color:#6b7280;font-size:11px;margin-top:3px;">${session.user.name} · Generated ${new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}</div>
  </div>

  <div class="metrics">
    <div class="metric"><div class="metric-label">Total Deployed</div><div class="metric-value">$${totalDeposited.toFixed(2)}</div></div>
    <div class="metric"><div class="metric-label">Net In Account</div><div class="metric-value">$${netInAccount.toFixed(2)}</div></div>
    <div class="metric"><div class="metric-label">Current Equity</div><div class="metric-value">$${currentEquity.toFixed(2)}</div></div>
    <div class="metric"><div class="metric-label">Absolute P&L</div><div class="metric-value class="${absolutePnl >= 0 ? 'pos' : 'neg'}">${absolutePnl >= 0 ? "+" : "−"}$${Math.abs(absolutePnl).toFixed(2)}</div></div>
    <div class="metric"><div class="metric-label">Absolute Return</div><div class="metric-value">${absoluteReturn >= 0 ? "+" : ""}${absoluteReturn.toFixed(2)}%</div></div>
    <div class="metric"><div class="metric-label">Time-Weighted Return</div><div class="metric-value">${twr >= 0 ? "+" : ""}${twr.toFixed(2)}%</div></div>
    <div class="metric"><div class="metric-label">Total Fees Earned</div><div class="metric-value">$${totalFeesEarned.toFixed(2)}</div></div>
    <div class="metric"><div class="metric-label">Fees Outstanding</div><div class="metric-value">${totalFeesOutstanding > 0 ? "$"+totalFeesOutstanding.toFixed(2) : "Settled"}</div></div>
  </div>

  <h2>Monthly Capital History</h2>
  <table>
    <thead>
      <tr><th>Period</th><th>Opening</th><th>Deposits</th><th>Withdrawals</th><th>Trading P&L</th><th>Closing</th><th>Monthly %</th><th>Cumul TWR</th><th>Fee Earned</th><th>Fee Paid</th></tr>
    </thead>
    <tbody>
      ${rows.map((row, i) => {
        const isAnn = i === rows.length - 1 || rows[i + 1]?.year !== row.year;
        const ann   = isAnn ? yearMap.get(row.year) : null;
        const rowHtml = `<tr>
          <td>${row.label}</td>
          <td>$${row.opening.toFixed(2)}</td>
          <td>${row.deposits > 0 ? "+$"+row.deposits.toFixed(2) : "—"}</td>
          <td>${row.withdrawals > 0 ? "−$"+row.withdrawals.toFixed(2) : "—"}</td>
          <td class="${row.grossPnl >= 0 ? 'pos' : 'neg'}">${row.grossPnl >= 0 ? "+" : "−"}$${Math.abs(row.grossPnl).toFixed(2)}</td>
          <td>$${row.closing.toFixed(2)}</td>
          <td class="${row.monthlyReturn >= 0 ? 'pos' : 'neg'}">${row.monthlyReturn >= 0 ? "+" : ""}${row.monthlyReturn.toFixed(2)}%</td>
          <td class="${row.cumulativeTWR >= 0 ? 'pos' : 'neg'}">${row.cumulativeTWR >= 0 ? "+" : ""}${row.cumulativeTWR.toFixed(2)}%</td>
          <td>${row.feeOwed > 0 ? "$"+row.feeOwed.toFixed(2) : "—"}</td>
          <td>${row.feePaid > 0 ? "$"+row.feePaid.toFixed(2) : "—"}</td>
        </tr>`;
        if (!ann) return rowHtml;
        return rowHtml + `<tr class="annual">
          <td>${row.year} Annual Total</td>
          <td>$${ann.firstOpening.toFixed(2)}</td>
          <td>${ann.totalDepositsYear > 0 ? "+$"+ann.totalDepositsYear.toFixed(2) : "—"}</td>
          <td>${ann.totalWithdrawalsYear > 0 ? "−$"+ann.totalWithdrawalsYear.toFixed(2) : "—"}</td>
          <td class="${ann.totalGrossPnl >= 0 ? 'pos' : 'neg'}">${ann.totalGrossPnl >= 0 ? "+" : "−"}$${Math.abs(ann.totalGrossPnl).toFixed(2)}</td>
          <td>$${ann.lastClosing.toFixed(2)}</td>
          <td class="${ann.annualReturn >= 0 ? 'pos' : 'neg'}">${ann.annualReturn >= 0 ? "+" : ""}${ann.annualReturn.toFixed(2)}%</td>
          <td class="${ann.endTWR >= 0 ? 'pos' : 'neg'}">${ann.endTWR >= 0 ? "+" : ""}${ann.endTWR.toFixed(2)}%</td>
          <td>${ann.totalFeeOwed > 0 ? "$"+ann.totalFeeOwed.toFixed(2) : "—"}</td>
          <td>${ann.totalFeePaid > 0 ? "$"+ann.totalFeePaid.toFixed(2) : "—"}</td>
        </tr>`;
      }).join("")}
      <tr class="total">
        <td>ALL TIME</td>
        <td>$${firstSnap ? firstSnap.opening_balance.toFixed(2) : "—"}</td>
        <td>${totalDeposited - (firstSnap?.opening_balance ?? 0) > 0 ? "+$"+(totalDeposited - (firstSnap?.opening_balance ?? 0)).toFixed(2) : "—"}</td>
        <td>${totalWithdrawn > 0 ? "−$"+totalWithdrawn.toFixed(2) : "—"}</td>
        <td class="${absolutePnl >= 0 ? 'pos' : 'neg'}">${absolutePnl >= 0 ? "+" : "−"}$${Math.abs(absolutePnl).toFixed(2)}</td>
        <td>$${currentEquity.toFixed(2)}</td>
        <td class="${absoluteReturn >= 0 ? 'pos' : 'neg'}">${absoluteReturn >= 0 ? "+" : ""}${absoluteReturn.toFixed(2)}%</td>
        <td class="${twr >= 0 ? 'pos' : 'neg'}">${twr >= 0 ? "+" : ""}${twr.toFixed(2)}%</td>
        <td>$${totalFeesEarned.toFixed(2)}</td>
        <td>${totalFeesPaid > 0 ? "$"+totalFeesPaid.toFixed(2) : "—"}</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">
    Arcus Quant Fund · arcusquantfund.com · P&L calculated using Modified Dietz (capital-adjusted) formula · TWR = Time-Weighted Return
  </div>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(printHtml); w.document.close(); }
  }

  // ── Capital & Returns accounting ──────────────────────────────────────────
  // Sorted chronologically (should already be, but ensure it)
  const snapsSorted = [...monthlySnapshots].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );

  // Time-Weighted Return: compounds monthly gross_pnl/opening_balance
  // Not affected by deposits/withdrawals — the correct investment performance metric.
  let twrFactor = 1.0;
  snapsSorted.forEach(snap => {
    if (snap.opening_balance > 0) {
      twrFactor *= (1 + snap.gross_pnl / snap.opening_balance);
    }
  });
  const twr = (twrFactor - 1) * 100;

  const firstSnap = snapsSorted[0];
  const lastSnap  = snapsSorted[snapsSorted.length - 1];

  // Isolated margin accounts are the canonical financial ledger.
  // Every ROLL_IN (spot → isolated margin) = DEPOSIT capital_event.
  // Every ROLL_OUT (isolated margin → spot) = WITHDRAWAL capital_event.
  // All historical flows are backfilled; ongoing sync auto-detects new ones.
  // initial_capital is set to 0 once all flows are recorded here.
  const totalDeposited  = capitalEvents.filter(e => e.event_type === "DEPOSIT").reduce((s, e) => s + e.amount, 0);
  const totalWithdrawn  = capitalEvents.filter(e => e.event_type === "WITHDRAWAL").reduce((s, e) => s + e.amount, 0);
  const netInAccount    = totalDeposited - totalWithdrawn;  // net capital still deployed

  // Current equity: use live bot state if available, else last monthly closing
  const currentEquity   = botState?.current_amount ?? lastSnap?.closing_balance ?? 0;

  // True all-time trading P&L:
  //   absolutePnl = currentEquity − netInAccount
  //              = currentEquity + totalWithdrawn − totalDeposited
  // Reads as: "what you have now, plus everything you've taken out, minus everything you put in."
  //
  // Edge case — incomplete historical transfers:
  //   Binance's isolated margin transfer API has a lookback limit (~12 months).
  //   For long-running accounts (ETH bot since Feb 2025), the initial deposit that
  //   funded the account may not be returned by the API. This makes netInAccount
  //   understated and can produce a false negative absolutePnl.
  //   Detect this: if balance math says negative but realized trade P&L is positive,
  //   fall back to trade P&L as the best available all-time performance measure.
  const _balancePnl    = currentEquity - netInAccount;
  const absolutePnl    = (_balancePnl < 0 && totalPnl > 0) ? totalPnl : _balancePnl;
  const absoluteReturn = (() => {
    if (absolutePnl <= 0) return 0;
    const denom = netInAccount > 0 ? netInAccount : totalDeposited;
    return denom > 0 ? (absolutePnl / denom) * 100 : 0;
  })();

  // Fees owed / receivable tracking
  //   performance_fee = what client owes Arcus (positive = payable by client)
  //   fee_paid        = what has been confirmed paid (set by admin)
  //   carried_loss_in > 0 = prior loss not yet recovered → no fee owed

  // Across all months:
  const totalFeesEarned    = snapsSorted.reduce((s, r) => s + r.performance_fee, 0);
  const totalFeesPaid      = snapsSorted.reduce((s, r) => s + (r.fee_paid ?? 0), 0);
  const totalFeesOutstanding = totalFeesEarned - totalFeesPaid;

  // Current month's snapshot for the payable/receivable banner
  const currentSnap = snapsSorted[snapsSorted.length - 1] ?? null;
  const currentFeeOwed      = currentSnap ? currentSnap.performance_fee : 0;
  const currentFeePaid      = currentSnap ? (currentSnap.fee_paid ?? 0) : 0;
  const currentFeeOutstanding = currentFeeOwed - currentFeePaid;
  const currentCarriedLoss  = currentSnap ? currentSnap.carried_loss_in : 0;

  // Build per-month rows with running TWR
  // Build exchange fee lookup: "YYYY-M" → fees row
  const feeMap = new Map<string, ExchangeFeeRow>();
  for (const f of exchangeFees) feeMap.set(`${f.year}-${f.month}`, f);

  type CapRow = {
    label: string;
    year: number;
    opening: number;
    deposits: number;
    withdrawals: number;
    grossPnl: number;
    closing: number;
    feeOwed: number;
    feePaid: number;
    carriedLossIn: number;
    exchangeFees: number;      // Binance trading commissions (USDT)
    binanceTrades: number;     // number of Binance fills this month
    borrowingInterest: number; // margin borrowing interest (USDT)
    monthlyReturn: number;     // gross_pnl / opening_balance
    cumulativeTWR: number;   // running product up to this month
  };

  let runTWR = 1.0;
  const capRows: CapRow[] = snapsSorted.map(snap => {
    const monthlyReturn = snap.opening_balance > 0 ? (snap.gross_pnl / snap.opening_balance) * 100 : 0;
    runTWR *= (1 + (snap.opening_balance > 0 ? snap.gross_pnl / snap.opening_balance : 0));
    const feeRow = feeMap.get(`${snap.year}-${snap.month}`);
    return {
      label: new Date(snap.year, snap.month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" }),
      year:  snap.year,
      opening:      snap.opening_balance,
      deposits:     snap.total_deposits,
      withdrawals:  snap.total_withdrawals,
      grossPnl:     snap.gross_pnl,
      closing:      snap.closing_balance,
      feeOwed:      snap.performance_fee,
      feePaid:      snap.fee_paid ?? 0,
      carriedLossIn: snap.carried_loss_in,
      exchangeFees: feeRow?.exchange_fees_usdt ?? 0,
      binanceTrades: feeRow?.trade_count ?? 0,
      borrowingInterest: feeRow?.borrowing_interest_usdt ?? 0,
      monthlyReturn,
      cumulativeTWR: (runTWR - 1) * 100,
    };
  });

  // Annual summary rows — keyed by year
  type AnnualRow = {
    year: number;
    firstOpening: number;
    lastClosing: number;
    totalDepositsYear: number;
    totalWithdrawalsYear: number;
    totalGrossPnl: number;
    totalFeeOwed: number;
    totalFeePaid: number;
    endTWR: number;          // cumulative TWR since inception at year end
    annualTWRFactor: number; // product of (1 + monthly_return) for months in this year
    annualReturn: number;    // (annualTWRFactor - 1) * 100 — correct compound annual TWR
  };
  const yearMap = new Map<number, AnnualRow>();
  for (const row of capRows) {
    const monthFactor = 1 + row.monthlyReturn / 100;
    const existing = yearMap.get(row.year);
    if (!existing) {
      yearMap.set(row.year, {
        year: row.year,
        firstOpening:         row.opening,
        lastClosing:          row.closing,
        totalDepositsYear:    row.deposits,
        totalWithdrawalsYear: row.withdrawals,
        totalGrossPnl:        row.grossPnl,
        totalFeeOwed:         row.feeOwed,
        totalFeePaid:         row.feePaid,
        endTWR:               row.cumulativeTWR,
        annualTWRFactor:      monthFactor,
        annualReturn:         row.monthlyReturn,
      });
    } else {
      existing.lastClosing           = row.closing;
      existing.totalDepositsYear    += row.deposits;
      existing.totalWithdrawalsYear += row.withdrawals;
      existing.totalGrossPnl        += row.grossPnl;
      existing.totalFeeOwed         += row.feeOwed;
      existing.totalFeePaid         += row.feePaid;
      existing.endTWR                = row.cumulativeTWR;
      existing.annualTWRFactor      *= monthFactor;
      existing.annualReturn          = (existing.annualTWRFactor - 1) * 100;
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-4 pb-16">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {session.user.name} · {botState?.symbol ?? "XRPUSDT"} · Isolated Margin · {botState?.leverage ?? 3.5}x
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live / Stale indicator */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${liveConfig.bg} ${liveConfig.ring} ${liveConfig.text}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${liveConfig.dot} ${liveStatus === "live" ? "animate-pulse" : ""}`} />
              {liveConfig.label}
              {ageSeconds !== null && (
                <span className="opacity-60 ml-0.5">
                  · {ageSeconds < 60 ? `${Math.floor(ageSeconds)}s` : `${Math.floor(ageSeconds / 60)}m`} ago
                </span>
              )}
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
              isUptrend
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isUptrend ? "bg-green-500" : "bg-red-500"}`} />
              {isUptrend ? "UPTREND" : "DOWNTREND"}
            </div>
            {session.user.email?.endsWith("@arcusquantfund.com") && (
              <a
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 text-yellow-500 hover:text-yellow-400 text-sm font-medium transition-colors border border-yellow-500/30 rounded-lg"
              >
                Admin
              </a>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 border-b border-gray-800">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-gold text-gold"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {tabLabel[t]}
              {t === "trades" && trades.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400 text-xs">
                  {trades.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ DASHBOARD TAB ══ */}
        {tab === "dashboard" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* LEFT — Bot State */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-white font-bold mb-4">Current Bot State</h2>

                <SectionTitle>Position</SectionTitle>
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    label="Position"
                    value={inPosition ? "LONG" : "No Position"}
                    deltaColor={inPosition ? "positive" : "neutral"}
                  />
                  <MetricCard
                    label="Entry Price"
                    value={botState?.entry_price ? fmt(botState.entry_price, 4, "$") : "N/A"}
                    delta={margin ? `${fmt(((currentPrice! - botState!.entry_price!) / botState!.entry_price!) * 100, 2)}%` : undefined}
                    deltaColor={margin && margin.unrealizedPnl >= 0 ? "positive" : "negative"}
                  />
                  <MetricCard
                    label="Balance"
                    value={botState?.current_amount ? fmt(botState.current_amount, 2, "$") : "N/A"}
                    tooltip="To make funds available for the bot, transfer funds to Isolated Margin (XRP/USDT) on Binance."
                  />
                </div>

                {inPosition && margin && (
                  <>
                    <SectionTitle>Margin Position</SectionTitle>
                    <div className="grid grid-cols-4 gap-3">
                      <MetricCard label="Eff. Position" value={fmt(margin.positionValue, 2, "$")} />
                      <MetricCard label="Leverage" value={`${botState!.leverage}x`} />
                      <MetricCard label="Margin Type" value={botState!.margin_type} />
                      <MetricCard
                        label="Margin Level"
                        value={isFinite(margin.marginLevel) ? fmt(margin.marginLevel, 2) : "∞"}
                        delta={margin.marginStatus}
                        deltaColor={margin.marginStatus === "SAFE" ? "positive" : "negative"}
                      />
                    </div>

                    <SectionTitle>Position Details</SectionTitle>
                    <div className="grid grid-cols-4 gap-3">
                      <MetricCard label="Total Asset" value={fmt(margin.totalAssetValue, 2, "$")} />
                      <MetricCard label="Borrowed" value={fmt(margin.borrowedValue, 2, "$")} />
                      <MetricCard label="Equity" value={fmt(margin.totalEquityValue, 2, "$")} />
                      <MetricCard
                        label="Unrealized PnL"
                        value={fmt(margin.unrealizedPnl, 2, "$")}
                        delta={`${fmt(margin.pnlPct, 1)}%`}
                        deltaColor={margin.unrealizedPnl >= 0 ? "positive" : "negative"}
                      />
                    </div>

                    {margin.marginStatus !== "SAFE" && (
                      <div className="mt-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        ⚠ {margin.marginStatus}: Monitor position closely.
                      </div>
                    )}
                  </>
                )}

                <SectionTitle>Trend Information</SectionTitle>
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    label="Trend"
                    value={isUptrend ? "UPTREND" : "DOWNTREND"}
                    deltaColor={isUptrend ? "positive" : "negative"}
                  />
                  <MetricCard
                    label="Extreme Price"
                    value={botState?.extreme_price ? fmt(botState.extreme_price, 4, "$") : "N/A"}
                  />
                  <MetricCard
                    label="Last DC Price"
                    value={botState?.last_dc_price ? fmt(botState.last_dc_price, 4, "$") : "N/A"}
                  />
                </div>

                {/* ── Account Details ── */}
                <SectionTitle>Account Details</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="BNB Fee Discount"
                    value={botState?.bnb_burn_active === true ? "Active ✓" : botState?.bnb_burn_active === false ? "Inactive" : "—"}
                    delta={botState?.bnb_burn_active === true ? "25% off trading fees" : undefined}
                    deltaColor={botState?.bnb_burn_active === true ? "positive" : "neutral"}
                    tooltip="Binance charges trading commissions in BNB when spotBNBBurn is on — giving a 25% discount vs paying in USDT."
                  />
                  {(() => {
                    let orders: {side: string; price: string; origQty: string; type: string}[] = [];
                    try { orders = JSON.parse(botState?.open_orders_json ?? "[]"); } catch { orders = []; }
                    return (
                      <MetricCard
                        label="Pending Orders"
                        value={orders.length === 0 ? "None" : `${orders.length} order${orders.length > 1 ? "s" : ""}`}
                        delta={orders.length > 0 ? orders.map(o => `${o.side} ${o.origQty} @ $${parseFloat(o.price).toFixed(4)}`).join(", ") : "Bot is flat — no pending orders"}
                        deltaColor={orders.length > 0 ? "positive" : "neutral"}
                      />
                    );
                  })()}
                </div>
              </div>

              {/* RIGHT — Market Overview */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-white font-bold mb-4">Market Overview</h2>

                <SectionTitle>Price</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Current Price"
                    value={currentPrice ? fmt(currentPrice, 4, "$") : "N/A"}
                    delta={priceChange != null ? `${fmt(priceChange, 2)}%` : undefined}
                    deltaColor={priceChange != null ? (priceChange >= 0 ? "positive" : "negative") : "neutral"}
                  />
                  <MetricCard
                    label="VWAP EMA"
                    value={latest?.vwap_ema ? fmt(latest.vwap_ema, 4, "$") : "N/A"}
                  />
                </div>

                {latest && (
                  <>
                    <SectionTitle>24h Stats</SectionTitle>
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard label="Volume" value={latest.volume ? fmt(latest.volume, 0) : "N/A"} />
                      <MetricCard label="Range" value={`$${fmt(latest.low, 4)} – $${fmt(latest.high, 4)}`} />
                      <MetricCard label="Range %" value={`${fmt(((latest.high - latest.low) / latest.low) * 100, 2)}%`} />
                    </div>
                  </>
                )}

                {inPosition && margin && (
                  <>
                    <SectionTitle>Risk Metrics</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                      <MetricCard label="Liquidation Price" value={fmt(margin.liqPrice, 4, "$")} deltaColor="negative" />
                      <MetricCard
                        label="Distance to Liq."
                        value={`${fmt(margin.distToLiq, 2)}%`}
                        deltaColor={margin.distToLiq > 10 ? "positive" : "negative"}
                      />
                      <MetricCard
                        label="Margin Ratio"
                        value={`${fmt(margin.marginRatio, 2)}%`}
                        deltaColor={margin.marginRatio > 50 ? "positive" : "negative"}
                      />
                      <MetricCard label="Collateral" value={fmt(margin.requiredMargin, 2, "$")} />
                    </div>
                  </>
                )}

                {!inPosition && (
                  <>
                    <SectionTitle>Performance Snapshot</SectionTitle>
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard label="Total Trades" value={String(closedTrades.length)} />
                      <MetricCard
                        label="Win Rate"
                        value={winRate != null ? `${winRate.toFixed(1)}%` : "N/A"}
                        deltaColor={winRate != null && winRate >= 50 ? "positive" : "negative"}
                      />
                      <MetricCard
                        label="Total PnL"
                        value={fmt(totalPnl, 2, "$")}
                        deltaColor={totalPnl >= 0 ? "positive" : "negative"}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Price Chart — candlestick matching Streamlit dashboard */}
            <TradingChart
              priceData={priceData}
              trades={trades}
              botState={botState}
              symbol={botState?.symbol ?? "XRPUSDT"}
            />

            {/* Balance Chart */}
            {balanceChartData.length > 1 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-5">Balance Over Time</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={balanceChartData}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={65} tickFormatter={(v) => `$${v.toLocaleString()}`} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }} itemStyle={{ color: "#f8ac07" }} formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString()}`, "Balance"]} />
                    <Line type="monotone" dataKey="balance" stroke="#f8ac07" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* ══ TRADE HISTORY TAB ══ */}
        {tab === "trades" && (
          <>
            <TradeHistoryChart
              priceData={priceData}
              trades={trades}
              symbol={botState?.symbol ?? "XRPUSDT"}
            />

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-bold">Trade History</h2>
                {trades.some(t => t.source === "binance") && (
                  <span className="text-xs text-yellow-500/70 font-mono">sourced from Binance API — FIFO P&L</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500">Orders: <span className="text-white font-medium">{trades.length}</span></span>
                  <span className="text-gray-500">Win Rate: <span className={winRate != null ? pnlClass(winRate - 50) : "text-gray-400"}>{winRate != null ? `${winRate.toFixed(1)}%` : "N/A"}</span></span>
                  <span className="text-gray-500" title="Gross P&L from price movement only. Net equity change (after commissions & interest) is shown in Capital & Returns.">Gross PnL: <span className={pnlClass(totalPnl)}>{fmt(totalPnl, 2, "$")}</span></span>
                </div>
                {trades.length > 0 && (
                  <button
                    onClick={downloadTradesCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
                    title="Download trade history as CSV"
                  >
                    ↓ Export CSV
                  </button>
                )}
              </div>
            </div>

            {trades.length === 0 ? (
              <div className="py-16 text-center text-gray-600">
                <p className="text-lg mb-2">No trade history yet</p>
                <p className="text-sm">Trades will appear here once the bot executes and closes positions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-left text-xs uppercase tracking-wide">
                      <th className="pb-3 pr-4">#</th>
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Side</th>
                      <th className="pb-3 pr-4">Price</th>
                      <th className="pb-3 pr-4">Qty</th>
                      <th className="pb-3 pr-4">Amount</th>
                      <th className="pb-3 pr-4">PnL</th>
                      <th className="pb-3 pr-4 text-gray-400">Price Move <span className="text-gray-600 font-normal">(unleveraged)</span></th>
                      <th className="pb-3 pr-4 text-white">Return <span className="text-gray-400 font-normal">(on margin)</span></th>
                      <th className="pb-3 pr-4">Commission</th>
                      <th className="pb-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...trades].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((t, i) => (
                      <tr key={t.trade_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 pr-4 text-gray-600 text-xs">{trades.length - i}</td>
                        <td className="py-3 pr-4 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(t.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                          <span className="text-gray-600">{new Date(t.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                        </td>
                        <td className={`py-3 pr-4 font-semibold text-xs ${t.side === "BUY" || t.side === "buy" ? "text-green-400" : "text-red-400"}`}>
                          {t.side?.toUpperCase()}
                        </td>
                        <td className="py-3 pr-4 text-gray-300 font-mono text-xs">{fmt(t.price, 4, "$")}</td>
                        <td className="py-3 pr-4 text-gray-400 text-xs">{fmt(t.quantity, 4)}</td>
                        <td className="py-3 pr-4 text-gray-300 text-xs">{fmt(t.amount, 2, "$")}</td>
                        <td className={`py-3 pr-4 font-semibold text-sm ${pnlClass(t.pnl)}`}>
                          {t.pnl != null ? fmt(t.pnl, 2, "$") : "—"}
                        </td>
                        <td className={`py-3 pr-4 text-xs ${pnlClass(t.pnl)}`}>
                          {/* Unleveraged price move = pnl / total_position_value */}
                          {t.pnl != null && t.amount
                            ? `${(t.pnl / t.amount * 100) >= 0 ? "+" : ""}${(t.pnl / t.amount * 100).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className={`py-3 pr-4 text-xs font-semibold ${pnlClass(t.pnl)}`}>
                          {/* Return on margin: use FIFO pnl_percent from DB when available (accurate) */}
                          {t.pnl_percent != null
                            ? `${t.pnl_percent >= 0 ? "+" : ""}${t.pnl_percent.toFixed(2)}%`
                            : t.pnl != null && t.amount
                              ? `${(t.pnl / (t.amount / leverage) * 100) >= 0 ? "+" : ""}${(t.pnl / (t.amount / leverage) * 100).toFixed(2)}%`
                              : "—"}
                        </td>
                        <td className="py-3 pr-4 text-gray-500 text-xs font-mono">
                          {t.commission_usdt != null ? `$${t.commission_usdt.toFixed(4)}` : "—"}
                        </td>
                        <td className="py-3 text-gray-500 text-xs">{t.reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </>
        )}

        {/* ══ PERFORMANCE TAB ══ */}
        {tab === "performance" && (
          <>
            {/* ROI & Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="relative group bg-gray-900 border border-gray-800 rounded-xl p-5 text-center cursor-help">
                <div className={`text-3xl font-bold mb-1 ${twr >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {`${twr >= 0 ? "+" : ""}${twr.toFixed(1)}%`}
                </div>
                <div className="text-white text-sm font-medium">ROI (TWR)</div>
                <div className="text-gray-500 text-xs mt-0.5">
                  Since inception{monthsActive != null ? ` · ${monthsActive} month${monthsActive !== 1 ? "s" : ""}` : ""}
                </div>
                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-800 border border-gray-700 rounded-xl p-4 text-left text-xs text-gray-300 shadow-xl z-50 hidden group-hover:block pointer-events-none">
                  <div className="font-semibold text-white mb-2">Time-Weighted Return (TWR)</div>
                  <div className="space-y-1.5 text-gray-400">
                    <div>Compounds monthly gross P&L over opening balance — the industry-standard fund performance metric.</div>
                    <div className="bg-gray-900 rounded-lg px-3 py-2 font-mono text-gray-200">
                      TWR = ∏(1 + P&L / opening) − 1
                    </div>
                    <div className="border-t border-gray-700 pt-1.5">
                      Unaffected by deposits or withdrawals. Measures how $1 invested at inception has grown.
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className={`text-3xl font-bold mb-1 ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {fmt(totalPnl, 2, "$")}
                </div>
                <div className="text-white text-sm font-medium">Total PnL</div>
                <div className="text-gray-500 text-xs mt-0.5">{closedTrades.length} closed trades</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className={`text-3xl font-bold mb-1 ${winRate != null && winRate >= 50 ? "text-green-400" : "text-red-400"}`}>
                  {winRate != null ? `${winRate.toFixed(1)}%` : "N/A"}
                </div>
                <div className="text-white text-sm font-medium">Win Rate</div>
                <div className="text-gray-500 text-xs mt-0.5">{wins.length}W / {losses.length}L</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className={`text-3xl font-bold mb-1 ${profitFactor >= 1 ? "text-green-400" : "text-red-400"}`}>
                  {isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞"}
                </div>
                <div className="text-white text-sm font-medium">Profit Factor</div>
                <div className="text-gray-500 text-xs mt-0.5">Gross win / gross loss</div>
              </div>
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <MetricCard label="Avg Win" value={avgWin != null ? fmt(avgWin, 2, "$") : "N/A"} deltaColor="positive" />
              <MetricCard label="Avg Loss" value={avgLoss != null ? fmt(avgLoss, 2, "$") : "N/A"} deltaColor="negative" />
              <MetricCard
                label="Best Trade"
                value={bestTrade?.pnl != null ? fmt(bestTrade.pnl, 2, "$") : "N/A"}
                delta={bestTrade ? new Date(bestTrade.timestamp).toLocaleDateString() : undefined}
                deltaColor="positive"
              />
              <MetricCard
                label="Worst Trade"
                value={worstTrade?.pnl != null ? fmt(worstTrade.pnl, 2, "$") : "N/A"}
                delta={worstTrade ? new Date(worstTrade.timestamp).toLocaleDateString() : undefined}
                deltaColor="negative"
              />
              <MetricCard
                label="Avg Trade ROI"
                value={roiPct != null ? `${roiPct >= 0 ? "+" : ""}${roiPct.toFixed(2)}%` : "N/A"}
                delta={`${roiTradeCount} trades`}
                deltaColor={roiPct != null && roiPct >= 0 ? "positive" : "neutral"}
                tooltip={`Total P&L ÷ total margin ever deployed across all ${roiTradeCount} trades. Not a return-on-capital figure — the same capital was redeployed repeatedly.`}
              />
            </div>

            {/* Cumulative PnL chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <h3 className="text-white font-semibold mb-1">Cumulative PnL</h3>
              <p className="text-gray-500 text-xs mb-5">Running total profit/loss across all {closedTrades.length} closed trades</p>
              {cumulativePnlData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={cumulativePnlData} margin={{ left: 10, right: 10 }}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="n" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                      label={{ value: "Trade #", position: "insideBottomRight", offset: -5, fill: "#6b7280", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={65}
                      tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
                      labelFormatter={(n) => `Trade #${n}`}
                      formatter={(v: number | undefined, name: string | undefined) => [`$${(v ?? 0).toFixed(2)}`, name === "cumPnl" ? "Cumulative PnL" : "Trade PnL"] as [string, string]}
                    />
                    <Area type="monotone" dataKey="cumPnl" stroke="#22c55e" strokeWidth={2} fill="url(#pnlGrad)" dot={false} name="cumPnl" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-gray-600 text-sm">No closed trades yet</div>
              )}
            </div>

            {/* Per-trade PnL bars */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <h3 className="text-white font-semibold mb-1">Trade PnL</h3>
              <p className="text-gray-500 text-xs mb-5">
                Last {tradeBars.length} trades — green = profit, red = loss
              </p>
              {tradeBars.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={tradeBars} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="n" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={65}
                      tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
                      labelFormatter={(n) => `Trade #${n}`}
                      formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, "PnL"]}
                    />
                    <Bar dataKey="pnl" name="PnL" radius={[2, 2, 0, 0]}>
                      {tradeBars.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">No closed trades yet</div>
              )}
            </div>

            {/* Balance history */}
            {balanceChartData.length > 1 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-1">Account Balance</h3>
                <p className="text-gray-500 text-xs mb-5">Balance snapshots over time</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={balanceChartData}>
                    <defs>
                      <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f8ac07" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f8ac07" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={65}
                      tickFormatter={(v) => `$${v.toLocaleString()}`} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
                      itemStyle={{ color: "#f8ac07" }}
                      formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString()}`, "Balance"]}
                    />
                    <Area type="monotone" dataKey="balance" stroke="#f8ac07" strokeWidth={2} fill="url(#balGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* ══ CAPITAL & RETURNS TAB ══ */}
        {tab === "capital" && (
          <>
            {/* ── Payable / Receivable Banner ── */}
            {currentSnap && (
              <div className={`rounded-2xl border p-5 mb-6 ${
                currentFeeOutstanding > 0
                  ? "bg-yellow-500/8 border-yellow-500/30"
                  : currentSnap.gross_pnl < 0
                  ? "bg-blue-500/8 border-blue-500/20"
                  : "bg-green-500/8 border-green-500/20"
              }`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className={`text-xs font-bold tracking-widest uppercase mb-1 ${
                      currentFeeOutstanding > 0 ? "text-yellow-400"
                      : currentSnap.gross_pnl < 0 ? "text-blue-400"
                      : "text-green-400"
                    }`}>
                      {currentFeeOutstanding > 0
                        ? "Performance Fee Payable — Action Required"
                        : currentSnap.gross_pnl < 0
                        ? "Loss Month — No Fee Due"
                        : "All Fees Settled ✓"}
                    </div>
                    <div className="text-white text-2xl font-bold mt-1">
                      {currentFeeOutstanding > 0
                        ? `${fmt(currentFeeOutstanding, 2, "$")} USDT owed to Arcus`
                        : currentSnap.gross_pnl < 0
                        ? `${fmt(Math.abs(currentSnap.gross_pnl), 2, "$")} loss carried forward`
                        : "No outstanding balance"}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      {currentFeeOutstanding > 0 && `Fee earned: ${fmt(currentFeeOwed, 2, "$")} · Paid: ${fmt(currentFeePaid, 2, "$")} · Outstanding: ${fmt(currentFeeOutstanding, 2, "$")}`}
                      {currentSnap.gross_pnl < 0 && `This loss will be deducted from next profitable month before any fee applies.`}
                      {currentFeeOutstanding <= 0 && currentSnap.gross_pnl >= 0 && `Last month's performance fee of ${fmt(currentFeeOwed, 2, "$")} has been received.`}
                    </div>
                  </div>
                  {currentFeeOutstanding > 0 && (
                    <div className="bg-black/30 rounded-xl p-4 text-sm shrink-0">
                      <div className="text-yellow-400 font-bold text-xs uppercase tracking-wider mb-2">Pay via:</div>
                      <div className="text-gray-300">Binance UID: <span className="text-white font-mono">131952271</span></div>
                      <div className="text-gray-300">UCB Bank A/C: <span className="text-white font-mono">050 3201 0000 99748</span></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Capital Summary Metrics ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-gray-500 text-xs mb-2">Total Deployed</div>
                <div className="text-white text-xl font-bold">{fmt(totalDeposited, 2, "$")}</div>
                <div className="text-gray-600 text-xs mt-1">initial + all deposits</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-gray-500 text-xs mb-2">Total Withdrawn</div>
                <div className="text-orange-400 text-xl font-bold">{fmt(totalWithdrawn, 2, "$")}</div>
                <div className="text-gray-600 text-xs mt-1">removed from account</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-gray-500 text-xs mb-2">Current Equity</div>
                <div className="text-white text-xl font-bold">{fmt(currentEquity, 2, "$")}</div>
                <div className="text-gray-600 text-xs mt-1">live account balance</div>
              </div>
              <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 text-center`}>
                <div className="text-gray-500 text-xs mb-2">Net P&L</div>
                <div className={`text-xl font-bold ${absolutePnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {absolutePnl >= 0 ? "+" : "−"}{fmt(Math.abs(absolutePnl), 2, "$")}
                </div>
                <div className={`text-xs mt-1 ${absolutePnl >= 0 ? "text-green-500/70" : "text-red-500/70"}`}>
                  {absoluteReturn >= 0 ? "+" : ""}{absoluteReturn.toFixed(2)}% on capital deployed
                </div>
              </div>
            </div>

            {/* TWR + Fee Summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-gray-500 text-xs mb-2">Time-Weighted Return</div>
                <div className={`text-xl font-bold ${twr >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {twr >= 0 ? "+" : ""}{twr.toFixed(2)}%
                </div>
                <div className="text-gray-600 text-xs mt-1">compounded monthly, excl. flows</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-gray-500 text-xs mb-2">Total Fees Owed</div>
                <div className="text-yellow-400 text-xl font-bold">{fmt(totalFeesEarned, 2, "$")}</div>
                <div className="text-gray-600 text-xs mt-1">performance fees (all months)</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-gray-500 text-xs mb-2">Total Fees Paid</div>
                <div className="text-green-400 text-xl font-bold">{fmt(totalFeesPaid, 2, "$")}</div>
                <div className="text-gray-600 text-xs mt-1">confirmed received</div>
              </div>
              <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 text-center`}>
                <div className="text-gray-500 text-xs mb-2">Fees Outstanding</div>
                <div className={`text-xl font-bold ${totalFeesOutstanding > 0 ? "text-yellow-400" : "text-green-400"}`}>
                  {fmt(totalFeesOutstanding, 2, "$")}
                </div>
                <div className="text-gray-600 text-xs mt-1">{totalFeesOutstanding > 0 ? "still payable" : "all settled"}</div>
              </div>
            </div>

            {/* ── Monthly History Table ── */}
            {capRows.length > 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-white font-semibold">Monthly Capital History</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Capital-adjusted P&L per month · TWR compounds gross_pnl / opening_balance each month
                    </p>
                  </div>
                  <button
                    onClick={printCapitalReport}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-xs font-medium transition-colors shrink-0"
                    title="Print or save as PDF"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    Print / Export PDF
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800/60 border-b border-gray-700">
                        {["Month", "Opening", "Deposits", "Withdrawals", "Trading P&L", "Closing", "Monthly %", "Cumul. TWR", "Exch. Fees", "Fee Owed", "Fee Paid", "Status"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-gray-500 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {capRows.map((row, i) => {
                        const isLoss   = row.feeOwed === 0 && row.grossPnl <= 0;
                        const isPaid   = row.feeOwed > 0 && row.feePaid >= row.feeOwed;
                        const isPending = row.feeOwed > 0 && row.feePaid < row.feeOwed;
                        const statusLabel = isLoss ? "LOSS" : isPaid ? "PAID ✓" : isPending ? "PENDING" : "NO FEE";
                        const statusCls   = isLoss ? "bg-gray-700/50 text-gray-500"
                          : isPaid    ? "bg-green-500/20 text-green-400"
                          : isPending ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-gray-700/30 text-gray-500";
                        // Show annual subtotal after the last month of each year
                        const isLastOfYear = i === capRows.length - 1 || capRows[i + 1].year !== row.year;
                        const ann = isLastOfYear ? yearMap.get(row.year) : null;
                        return (
                          <>
                            <tr key={`row-${i}`} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                              <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{row.label}</td>
                              <td className="px-4 py-3 text-gray-300 font-mono text-xs">{fmt(row.opening, 2, "$")}</td>
                              <td className="px-4 py-3 font-mono text-xs">
                                {row.deposits > 0
                                  ? <span className="text-blue-400">+{fmt(row.deposits, 2, "$")}</span>
                                  : <span className="text-gray-600">—</span>}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs">
                                {row.withdrawals > 0
                                  ? <span className="text-orange-400">−{fmt(row.withdrawals, 2, "$")}</span>
                                  : <span className="text-gray-600">—</span>}
                              </td>
                              <td className={`px-4 py-3 font-mono text-xs font-semibold ${row.grossPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {row.grossPnl >= 0 ? "+" : "−"}{fmt(Math.abs(row.grossPnl), 2, "$")}
                              </td>
                              <td className="px-4 py-3 text-gray-300 font-mono text-xs">{fmt(row.closing, 2, "$")}</td>
                              <td className={`px-4 py-3 text-xs font-semibold ${row.monthlyReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {row.monthlyReturn >= 0 ? "+" : ""}{row.monthlyReturn.toFixed(2)}%
                              </td>
                              <td className={`px-4 py-3 text-xs font-semibold ${row.cumulativeTWR >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {row.cumulativeTWR >= 0 ? "+" : ""}{row.cumulativeTWR.toFixed(2)}%
                              </td>
                              <td className="px-4 py-3 text-xs font-mono"
                                  title={`${row.binanceTrades} fills · Interest: $${(row.borrowingInterest ?? 0).toFixed(4)}`}>
                                {(row.exchangeFees + (row.borrowingInterest ?? 0)) > 0
                                  ? <span className="text-orange-300">
                                      −{fmt(row.exchangeFees + (row.borrowingInterest ?? 0), 4, "$")}
                                      {row.borrowingInterest > 0 && (
                                        <span className="text-gray-500 text-[10px] ml-1">(+int)</span>
                                      )}
                                    </span>
                                  : <span className="text-gray-600">—</span>}
                              </td>
                              <td className="px-4 py-3 text-yellow-400 text-xs font-mono">
                                {row.feeOwed > 0 ? fmt(row.feeOwed, 2, "$") : <span className="text-gray-600">—</span>}
                              </td>
                              <td className={`px-4 py-3 text-xs font-mono ${row.feePaid > 0 ? "text-green-400" : "text-gray-600"}`}>
                                {row.feePaid > 0 ? fmt(row.feePaid, 2, "$") : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${statusCls}`}>
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                            {ann && (
                              <tr key={`ann-${row.year}`} className="border-b-2 border-gray-600 bg-gray-800/50">
                                <td className="px-4 py-2.5 text-yellow-400 text-xs font-bold">{row.year} ANNUAL</td>
                                <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{fmt(ann.firstOpening, 2, "$")}</td>
                                <td className="px-4 py-2.5 text-blue-400 text-xs font-mono">
                                  {ann.totalDepositsYear > 0 ? `+${fmt(ann.totalDepositsYear, 2, "$")}` : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-orange-400 text-xs font-mono">
                                  {ann.totalWithdrawalsYear > 0 ? `−${fmt(ann.totalWithdrawalsYear, 2, "$")}` : "—"}
                                </td>
                                <td className={`px-4 py-2.5 text-xs font-bold font-mono ${ann.totalGrossPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {ann.totalGrossPnl >= 0 ? "+" : "−"}{fmt(Math.abs(ann.totalGrossPnl), 2, "$")}
                                </td>
                                <td className="px-4 py-2.5 text-gray-300 text-xs font-mono font-bold">{fmt(ann.lastClosing, 2, "$")}</td>
                                <td className={`px-4 py-2.5 text-xs font-bold ${ann.annualReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {ann.annualReturn >= 0 ? "+" : ""}{ann.annualReturn.toFixed(2)}%
                                </td>
                                <td className={`px-4 py-2.5 text-xs font-bold ${ann.endTWR >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {ann.endTWR >= 0 ? "+" : ""}{ann.endTWR.toFixed(2)}%
                                </td>
                                <td className="px-4 py-2.5 text-orange-300 text-xs font-bold font-mono">
                                  {capRows.filter(r => r.year === ann.year && r.exchangeFees > 0)
                                    .reduce((s, r) => s + r.exchangeFees, 0) > 0
                                    ? `−${fmt(capRows.filter(r => r.year === ann.year).reduce((s, r) => s + r.exchangeFees, 0), 4, "$")}`
                                    : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-yellow-400 text-xs font-bold font-mono">
                                  {ann.totalFeeOwed > 0 ? fmt(ann.totalFeeOwed, 2, "$") : "—"}
                                </td>
                                <td className={`px-4 py-2.5 text-xs font-bold font-mono ${ann.totalFeePaid > 0 ? "text-green-400" : "text-gray-600"}`}>
                                  {ann.totalFeePaid > 0 ? fmt(ann.totalFeePaid, 2, "$") : "—"}
                                </td>
                                <td />
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                    {/* Totals footer */}
                    <tfoot>
                      <tr className="bg-gray-800/60 border-t-2 border-gray-600">
                        <td className="px-4 py-3 text-white font-bold text-sm">ALL TIME</td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{firstSnap ? fmt(firstSnap.opening_balance, 2, "$") : "—"}</td>
                        <td className="px-4 py-3 text-blue-400 text-xs font-mono">+{fmt(totalDeposited - (firstSnap?.opening_balance ?? 0), 2, "$")}</td>
                        <td className="px-4 py-3 text-orange-400 text-xs font-mono">{totalWithdrawn > 0 ? "−" + fmt(totalWithdrawn, 2, "$") : "—"}</td>
                        <td className={`px-4 py-3 text-xs font-bold font-mono ${absolutePnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {absolutePnl >= 0 ? "+" : "−"}{fmt(Math.abs(absolutePnl), 2, "$")}
                        </td>
                        <td className="px-4 py-3 text-white font-bold text-xs font-mono">{fmt(currentEquity, 2, "$")}</td>
                        <td className={`px-4 py-3 text-xs font-bold ${absoluteReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {absoluteReturn >= 0 ? "+" : ""}{absoluteReturn.toFixed(2)}%
                        </td>
                        <td className={`px-4 py-3 text-xs font-bold ${twr >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {twr >= 0 ? "+" : ""}{twr.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-orange-300 text-xs font-bold font-mono">
                          {(() => { const t = capRows.reduce((s, r) => s + r.exchangeFees, 0); return t > 0 ? `−${fmt(t, 4, "$")}` : "—"; })()}
                        </td>
                        <td className="px-4 py-3 text-yellow-400 text-xs font-bold font-mono">{fmt(totalFeesEarned, 2, "$")}</td>
                        <td className="px-4 py-3 text-green-400 text-xs font-bold font-mono">{totalFeesPaid > 0 ? fmt(totalFeesPaid, 2, "$") : "—"}</td>
                        <td className="px-4 py-3">
                          {totalFeesOutstanding > 0 && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400">
                              {fmt(totalFeesOutstanding, 2, "$")} due
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center mb-6">
                <p className="text-gray-500">No monthly reports generated yet.</p>
                <p className="text-gray-600 text-sm mt-1">Data appears here after the first monthly report is sent.</p>
              </div>
            )}

            {/* ── Capital Events ── */}
            {capitalEvents.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h3 className="text-white font-semibold">Capital Movement History</h3>
                  <p className="text-gray-500 text-xs mt-0.5">All deposits and withdrawals recorded on your account</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800/60 border-b border-gray-700">
                        {["Date", "Type", "Amount", "Notes"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-gray-500 text-[11px] font-semibold uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {capitalEvents.map((ev, i) => {
                        const isDeposit = ev.event_type === "DEPOSIT";
                        return (
                          <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                            <td className="px-5 py-3 text-gray-400 text-sm">
                              {new Date(ev.occurred_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${isDeposit ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"}`}>
                                {ev.event_type}
                              </span>
                            </td>
                            <td className={`px-5 py-3 font-mono font-semibold ${isDeposit ? "text-blue-400" : "text-orange-400"}`}>
                              {isDeposit ? "+" : "−"}{fmt(ev.amount, 2, "$")}
                            </td>
                            <td className="px-5 py-3 text-gray-500 text-xs">{ev.notes ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Accounting methodology note ── */}
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
              <div><span className="text-blue-400 font-semibold">Trading P&L</span> = (closing − opening) − net new capital. Strips deposits/withdrawals so only bot-generated profit is shown.</div>
              <div><span className="text-blue-400 font-semibold">Time-Weighted Return (TWR)</span> = compounded product of monthly returns (gross_pnl ÷ opening_balance). Not affected by deposits or withdrawals. The standard for fund performance measurement.</div>
              <div><span className="text-blue-400 font-semibold">Net P&L</span> = current equity − net capital deployed. Absolute dollar gain/loss on your invested capital.</div>
              <div><span className="text-blue-400 font-semibold">Performance Fee</span> = 50% of net profit per profitable month. Loss months carry forward and are deducted before any fee applies.</div>
            </div>
          </>
        )}

        {botState?.updated_at && (
          <p className="text-gray-700 text-xs text-center mt-6">
            Last sync: {new Date(botState.updated_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
