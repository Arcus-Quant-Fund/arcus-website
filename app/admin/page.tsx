import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import MonthSelector from "./MonthSelector";

// Any @arcusquantfund.com address can access the admin panel
const ADMIN_DOMAIN = "@arcusquantfund.com";
const OPERATING_COSTS_USD = 5000; // servers, AI subs, domain, email — update when costs change

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = {
  id: string;
  name: string;
  email: string;
  bot_id: string | null;
  initial_capital: number;
};

type BotState = {
  client_id: string; // bot_id text (eth / eth2 / eth4)
  symbol: string;
  position: string | null;
  entry_price: number | null;
  current_amount: number;
  leverage: number;
  updated_at: string;
  liq_price: number | null;
};

type MonthlySnap = {
  client_id: string;
  opening_balance: number;
  closing_balance: number;
  gross_pnl: number;
  net_pnl: number;
  performance_fee: number;
  fee_paid: number | null;
  total_trades: number;
  total_deposits: number;
  total_withdrawals: number;
  win_rate: number;
  profit_factor: number | null;
};

type CapitalEvent = {
  id: string;
  client_id: string;
  event_type: string;
  amount: number;
  notes: string | null;
  occurred_at: string;
  recorded_by: string | null;
};

type AuditEntry = {
  id: string;
  client_id: string | null;
  event_type: string;
  amount: number | null;
  description: string | null;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number, decimals = 2): string {
  return `$${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function fmtSigned(val: number): string {
  return `${val >= 0 ? "+" : "−"}${fmt(val)}`;
}

function fmtPct(val: number): string {
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}

function pnlCls(val: number): string {
  return val > 0 ? "text-green-400" : val < 0 ? "text-red-400" : "text-gray-400";
}

function ageLabel(updatedAt: string): { label: string; cls: string } {
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const mins  = ageMs / 60_000;
  if (mins < 5)   return { label: "LIVE",    cls: "bg-green-500/15 text-green-400 border-green-500/30" };
  if (mins < 15)  return { label: "DELAYED", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" };
  return             { label: "OFFLINE",  cls: "bg-red-500/15 text-red-400 border-red-500/30" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email?.endsWith(ADMIN_DOMAIN)) redirect("/dashboard");

  const supabase = createServiceClient();

  // ── Month selection ──
  const now = new Date();
  const defaultYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();

  // Current calendar month (for MTD section — shows P&L even when month isn't over)
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentMonthStart = new Date(currentYear, currentMonth - 1, 1).toISOString();
  const currentMonthEnd   = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999).toISOString();
  const currentMonthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  let year  = defaultYear;
  let month = defaultMonth;
  if (searchParams.period) {
    const parts = searchParams.period.split("-");
    if (parts.length === 2) {
      year  = parseInt(parts[0]);
      month = parseInt(parts[1]);
    }
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long", year: "numeric",
  });

  // Build last-12 month list for selector
  const recentMonths: { year: number; month: number; label: string }[] = [];
  let sy = now.getFullYear();
  let sm = now.getMonth() === 0 ? 12 : now.getMonth();
  if (now.getMonth() === 0) sy--;
  for (let i = 0; i < 12; i++) {
    recentMonths.push({ year: sy, month: sm, label: new Date(sy, sm - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" }) });
    sm--; if (sm === 0) { sm = 12; sy--; }
  }

  // ── Data fetches (parallel) ──
  const [
    { data: clientRows },
    { data: snapRows },
    { data: botRows },
    { data: capitalRows },
    { data: auditRows },
    { data: allSnapRows },
    { data: prevMonthSnapRows },
    { data: currentMonthCapRows },
    { data: monthStartBalRows },
  ] = await Promise.all([
    supabase.from("clients").select("id, name, email, bot_id, initial_capital").eq("is_active", true),
    supabase.from("monthly_snapshots").select("client_id, opening_balance, closing_balance, gross_pnl, net_pnl, performance_fee, fee_paid, total_trades, total_deposits, total_withdrawals, win_rate, profit_factor").eq("year", year).eq("month", month),
    supabase.from("bot_state").select("client_id, symbol, position, entry_price, current_amount, leverage, updated_at, liq_price"),
    supabase.from("capital_events").select("id, client_id, event_type, amount, notes, occurred_at, recorded_by").order("occurred_at", { ascending: false }).limit(20),
    supabase.from("audit_log").select("id, client_id, event_type, amount, description, created_at").order("created_at", { ascending: false }).limit(15),
    // All-time snapshots for fee tracker + continuity check
    supabase.from("monthly_snapshots")
      .select("client_id, year, month, opening_balance, closing_balance, gross_pnl, performance_fee, fee_paid")
      .order("year", { ascending: true })
      .order("month", { ascending: true }),
    // Previous month's closing balances (= this month's MTD opening)
    supabase.from("monthly_snapshots")
      .select("client_id, closing_balance")
      .eq("year", defaultYear)
      .eq("month", defaultMonth),
    // Capital events this calendar month (for MTD net-capital adjustment)
    supabase.from("capital_events")
      .select("client_id, event_type, amount")
      .gte("occurred_at", currentMonthStart)
      .lte("occurred_at", currentMonthEnd),
    // First balance_history record of current month per client (fallback opening for new clients)
    supabase.from("balance_history")
      .select("client_id, balance, recorded_at")
      .gte("recorded_at", currentMonthStart)
      .order("recorded_at", { ascending: true }),
  ]);

  const clients     = (clientRows ?? []) as Client[];
  const snaps       = (snapRows ?? []) as MonthlySnap[];
  const botStates   = (botRows ?? []) as BotState[];
  const capEvents   = (capitalRows ?? []) as CapitalEvent[];
  const auditLog    = (auditRows ?? []) as AuditEntry[];

  type AllSnap = {
    client_id: string;
    year: number;
    month: number;
    opening_balance: number;
    closing_balance: number;
    gross_pnl: number;
    performance_fee: number;
    fee_paid: number | null;
  };
  const allSnaps = (allSnapRows ?? []) as AllSnap[];

  // ── Lookup maps ──
  const clientById  = new Map(clients.map(c => [c.id, c]));
  const botStateMap = new Map(botStates.map(b => [b.client_id, b]));
  const snapByClient = new Map(snaps.map(s => [s.client_id, s]));

  // ── Aggregates ──
  const totalAUM        = snaps.reduce((s, r) => s + r.closing_balance, 0);
  const totalOpenAUM    = snaps.reduce((s, r) => s + r.opening_balance, 0);
  const totalFeesEarned = snaps.reduce((s, r) => s + r.performance_fee, 0);
  const totalFeesPaid   = snaps.reduce((s, r) => s + (r.fee_paid ?? 0), 0);
  const totalGrossPnl   = snaps.reduce((s, r) => s + r.gross_pnl, 0);
  const totalTrades     = snaps.reduce((s, r) => s + r.total_trades, 0);
  const totalDeposits   = snaps.reduce((s, r) => s + r.total_deposits, 0);
  const totalWithdrawals = snaps.reduce((s, r) => s + r.total_withdrawals, 0);
  const avgROI          = totalOpenAUM > 0 ? (totalGrossPnl / totalOpenAUM) * 100 : 0;
  const netIncome       = totalFeesEarned - OPERATING_COSTS_USD;
  const feesOutstanding = totalFeesEarned - totalFeesPaid;

  // Live AUM from bot_state (more current than monthly snapshot)
  const liveAUM = clients.reduce((s, c) => {
    const bs = c.bot_id ? botStateMap.get(c.bot_id) : null;
    return s + (bs?.current_amount ?? 0);
  }, 0);

  const hasSnaps = snaps.length > 0;

  // ── All-time outstanding fees ──────────────────────────────────────────────
  // Show every month (all clients) that has a performance fee > 0.
  // Sorted: oldest first so admin can see which are longest overdue.
  const feeRows = allSnaps
    .filter(s => s.performance_fee > 0)
    .map(s => {
      const client    = clientById.get(s.client_id);
      const feePaid   = s.fee_paid ?? 0;
      const outstanding = s.performance_fee - feePaid;
      const isFullyPaid = outstanding <= 0.01;
      const periodLabel = new Date(s.year, s.month - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
      return { client, periodLabel, fee: s.performance_fee, paid: feePaid, outstanding, isFullyPaid };
    });
  const allTimeFeesEarned     = feeRows.reduce((s, r) => s + r.fee, 0);
  const allTimeFeesPaid       = feeRows.reduce((s, r) => s + r.paid, 0);
  const allTimeOutstanding    = allTimeFeesEarned - allTimeFeesPaid;

  // ── Month-to-month balance continuity check ────────────────────────────────
  // For each client, check that each month's opening_balance == prior month's closing_balance.
  // Mismatches indicate a potential data integrity issue.
  type ContinuityIssue = {
    clientName: string;
    period: string;
    expected: number;   // previous month's closing
    actual: number;     // this month's opening
    delta: number;
  };
  const continuityIssues: ContinuityIssue[] = [];

  // Group by client_id
  const snapsByClient = new Map<string, AllSnap[]>();
  for (const s of allSnaps) {
    if (!snapsByClient.has(s.client_id)) snapsByClient.set(s.client_id, []);
    snapsByClient.get(s.client_id)!.push(s);
  }
  for (const [cid, cSnaps] of snapsByClient) {
    const sorted = [...cSnaps].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      // Only check consecutive calendar months
      const prevDate = new Date(prev.year, prev.month - 1, 1);
      const currDate = new Date(curr.year, curr.month - 1, 1);
      const monthDiff = (currDate.getFullYear() - prevDate.getFullYear()) * 12 +
        (currDate.getMonth() - prevDate.getMonth());
      if (monthDiff === 1) {
        const delta = Math.abs(curr.opening_balance - prev.closing_balance);
        if (delta > 0.01) {
          const c = clientById.get(cid);
          continuityIssues.push({
            clientName: c?.name ?? cid.slice(0, 8),
            period: new Date(curr.year, curr.month - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" }),
            expected: prev.closing_balance,
            actual: curr.opening_balance,
            delta,
          });
        }
      }
    }
  }

  // ── Live Month-to-Date (MTD) data ─────────────────────────────────────────
  // Opening balance = last monthly_snapshot's closing (= end of previous month).
  // Current equity = live from bot_state.
  // MTD P&L = (current_equity - opening) - net_capital_this_month
  //   This is the same Modified Dietz formula the monthly report uses.

  type PrevSnap = { client_id: string; closing_balance: number };
  type CurCapEv = { client_id: string; event_type: string; amount: number };

  const prevSnaps    = (prevMonthSnapRows ?? []) as PrevSnap[];
  const curCapEvents = (currentMonthCapRows ?? []) as CurCapEv[];

  const prevClosingByClient = new Map(prevSnaps.map(s => [s.client_id, s.closing_balance]));

  // Fallback opening: first balance_history record this month per client
  // Used when no prior month snapshot exists (new clients who joined this month or last month)
  type MonthStartBal = { client_id: string; balance: number };
  const monthStartBalanceByClient = new Map<string, number>();
  for (const r of ((monthStartBalRows ?? []) as MonthStartBal[])) {
    if (!monthStartBalanceByClient.has(r.client_id)) {
      monthStartBalanceByClient.set(r.client_id, r.balance);
    }
  }

  type MTDRow = {
    name: string;
    opening: number;
    currentEquity: number;
    depositsThisMonth: number;
    withdrawalsThisMonth: number;
    mtdPnl: number;
    mtdPct: number | null; // null when opening=0 (new client, no prior snapshot)
    hasMissingCapEvents: boolean; // flag when P&L drop is larger than trades can explain
    botStatus: string;
    botStatusCls: string;
  };

  const mtdRows: MTDRow[] = clients.map(c => {
    const bot     = c.bot_id ? botStateMap.get(c.bot_id) : null;
    // Opening: prefer prev month snapshot → fallback to first balance record this month
    const opening = prevClosingByClient.get(c.id)
      ?? monthStartBalanceByClient.get(c.id)
      ?? 0;
    const curEquity = bot?.current_amount ?? opening;

    const clientCapEvs = curCapEvents.filter(e => e.client_id === c.id);
    const deposits    = clientCapEvs.filter(e => e.event_type === "DEPOSIT").reduce((s, e) => s + e.amount, 0);
    const withdrawals = clientCapEvs.filter(e => e.event_type === "WITHDRAWAL").reduce((s, e) => s + e.amount, 0);
    const netCapital  = deposits - withdrawals;

    const mtdPnl = (curEquity - opening) - netCapital;
    // Null when no opening baseline — % is meaningless; shows "—" in UI
    const mtdPct = opening > 0 ? (mtdPnl / opening) * 100 : null;
    // Flag if MTD loss exceeds 30% of opening with no corresponding large recorded withdrawal
    // (suggests capital outflows missing from capital_events)
    const hasMissingCapEvents = opening > 0 && mtdPnl < -opening * 0.30 && Math.abs(netCapital) < Math.abs(mtdPnl) * 0.5;

    const age = bot ? ageLabel(bot.updated_at) : null;
    return {
      name:               c.name,
      opening,
      currentEquity:      curEquity,
      depositsThisMonth:  deposits,
      withdrawalsThisMonth: withdrawals,
      mtdPnl,
      mtdPct,
      hasMissingCapEvents,
      botStatus:    age?.label ?? "NO BOT",
      botStatusCls: age?.cls   ?? "bg-gray-700/40 text-gray-500 border-gray-600",
    };
  });

  const mtdTotalOpening   = mtdRows.reduce((s, r) => s + r.opening, 0);
  const mtdTotalEquity    = mtdRows.reduce((s, r) => s + r.currentEquity, 0);
  const mtdTotalPnl       = mtdRows.reduce((s, r) => s + r.mtdPnl, 0);
  // Only include clients with a known opening in the % denominator
  const mtdOpeningWithData = mtdRows.filter(r => r.opening > 0).reduce((s, r) => s + r.opening, 0);
  const mtdTotalPct        = mtdOpeningWithData > 0 ? (mtdTotalPnl / mtdOpeningWithData) * 100 : null;
  const hasMissingCapEventsAny = mtdRows.some(r => r.hasMissingCapEvents);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-4 pb-20">
      <div className="max-w-6xl mx-auto">

        {/* ══ HEADER ══ */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">Fund Administration</h1>
              <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase">
                Admin Only
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              Arcus Quant Fund · {session.user.email} · Reporting period: {monthLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-sm">Period:</span>
            <MonthSelector months={recentMonths} current={`${year}-${month}`} />
          </div>
        </div>

        {/* ══ LIVE AUM BANNER ══ */}
        <div className="bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20 rounded-2xl px-6 py-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-1">Live AUM (real-time from bots)</div>
            <div className="text-white text-3xl font-bold">{fmt(liveAUM)}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs mb-1">vs. Month-end snapshot</div>
            <div className="text-gray-300 text-xl font-semibold">{hasSnaps ? fmt(totalAUM) : "—"}</div>
            {hasSnaps && (
              <div className={`text-xs mt-0.5 ${pnlCls(liveAUM - totalAUM)}`}>
                {fmtSigned(liveAUM - totalAUM)} since {monthLabel} close
              </div>
            )}
          </div>
        </div>

        {/* ══ DATA INTEGRITY WARNING ══ */}
        {hasMissingCapEventsAny && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-5 py-3 mb-4 flex items-start gap-3">
            <span className="text-orange-400 text-lg mt-0.5">⚠</span>
            <div>
              <p className="text-orange-400 text-sm font-semibold">Possible missing capital events</p>
              <p className="text-orange-300/70 text-xs mt-0.5">
                One or more clients show a MTD P&amp;L drop larger than recorded capital withdrawals can explain.
                This typically means a withdrawal (ROLL_OUT) was not captured in <code className="text-orange-300">capital_events</code>.
                Re-run the backfill script on Oracle or add a manual capital event to correct the MTD figure.
              </p>
            </div>
          </div>
        )}

        {/* ══ LIVE MONTH-TO-DATE ══ */}
        <div className="bg-gray-800/40 border border-gray-700 rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-green-400 text-xs font-bold tracking-widest uppercase">
                Live Month-to-Date — {currentMonthLabel}
              </h2>
              <p className="text-gray-600 text-xs mt-0.5">
                Real-time P&L since month start · opening = last month-end close · P&L = (equity − opening) − net capital movements
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Fund MTD P&L</div>
              <div className={`text-xl font-bold ${pnlCls(mtdTotalPnl)}`}>
                {fmtSigned(mtdTotalPnl)}
              </div>
              <div className={`text-xs ${mtdTotalPct !== null ? pnlCls(mtdTotalPct) : "text-gray-500"}`}>
                {mtdTotalPct !== null ? `${fmtPct(mtdTotalPct)} on opening AUM` : "— on opening AUM"}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/60 border-b border-gray-700">
                  {["Client", "Month Opening", "Current Equity", "MTD Deposits", "MTD P&L", "MTD %", "Bot"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-gray-500 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mtdRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-700/40 hover:bg-gray-700/15 transition-colors">
                    <td className="px-4 py-3 text-white text-sm font-semibold">{row.name}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm font-mono">{fmt(row.opening)}</td>
                    <td className="px-4 py-3 text-white text-sm font-bold font-mono">{fmt(row.currentEquity)}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.depositsThisMonth > 0
                        ? <span className="text-blue-400 font-mono">+{fmt(row.depositsThisMonth)}</span>
                        : row.withdrawalsThisMonth > 0
                        ? <span className="text-orange-400 font-mono">−{fmt(row.withdrawalsThisMonth)}</span>
                        : <span className="text-gray-600">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-sm font-bold font-mono ${pnlCls(row.mtdPnl)}`}>
                      {fmtSigned(row.mtdPnl)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold ${row.mtdPct !== null ? pnlCls(row.mtdPct) : "text-gray-500"}`}>
                      {row.mtdPct !== null ? fmtPct(row.mtdPct) : "—"}
                      {row.hasMissingCapEvents && (
                        <span className="ml-1.5 text-orange-400 text-[10px] font-bold" title="Large P&L drop not explained by recorded capital events — possible missing withdrawals">⚠</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block border text-[10px] font-bold px-2 py-0.5 rounded-full ${row.botStatusCls}`}>
                        {row.botStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-900/50 border-t-2 border-gray-600">
                  <td className="px-4 py-3 text-white text-sm font-bold">FUND TOTAL</td>
                  <td className="px-4 py-3 text-gray-400 text-sm font-mono font-bold">{fmt(mtdTotalOpening)}</td>
                  <td className="px-4 py-3 text-white text-sm font-bold font-mono">{fmt(mtdTotalEquity)}</td>
                  <td />
                  <td className={`px-4 py-3 text-sm font-bold font-mono ${pnlCls(mtdTotalPnl)}`}>{fmtSigned(mtdTotalPnl)}</td>
                  <td className={`px-4 py-3 text-sm font-bold ${mtdTotalPct !== null ? pnlCls(mtdTotalPct) : "text-gray-500"}`}>
                    {mtdTotalPct !== null ? fmtPct(mtdTotalPct) : "—"}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ══ METRICS GRID ══ */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Month-End AUM",   val: hasSnaps ? fmt(totalAUM) : "—",        sub: `${snaps.length} clients`,             color: "text-white" },
            { label: "Fund P&L",        val: hasSnaps ? fmtSigned(totalGrossPnl) : "—",  sub: hasSnaps ? fmtPct(avgROI) + " avg ROI" : "",  color: pnlCls(totalGrossPnl) },
            { label: "Fees Earned",     val: hasSnaps ? fmt(totalFeesEarned) : "—", sub: "performance fees",                    color: "text-yellow-400" },
            { label: "Fees Collected",  val: hasSnaps ? fmt(totalFeesPaid) : "—",   sub: "received",                            color: "text-green-400" },
            { label: "Outstanding",     val: hasSnaps ? fmt(feesOutstanding) : "—", sub: feesOutstanding > 0 ? "to collect" : "all clear", color: feesOutstanding > 0 ? "text-yellow-400" : "text-green-400" },
            { label: "Net Income",      val: hasSnaps ? fmtSigned(netIncome) : "—", sub: `after $${(OPERATING_COSTS_USD / 1000).toFixed(0)}k costs`, color: pnlCls(netIncome) },
          ].map((card) => (
            <div key={card.label} className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-4">
              <div className="text-gray-500 text-[11px] mb-1.5">{card.label}</div>
              <div className={`text-base font-bold ${card.color}`}>{card.val}</div>
              <div className="text-gray-600 text-[11px] mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* ══ INCOME STATEMENT ══ */}
          <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-5">
              Income Statement — {monthLabel}
            </h2>
            {hasSnaps ? (
              <>
                <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-3">Revenue</div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Performance Fees Earned</span>
                    <span className="text-green-400 font-semibold">+{fmt(totalFeesEarned)}</span>
                  </div>
                  {totalDeposits > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Client Deposits (this month)</span>
                      <span className="text-blue-400">{fmt(totalDeposits)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-700 pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-gray-300">Gross Revenue</span>
                    <span className="text-white">{fmt(totalFeesEarned)}</span>
                  </div>
                </div>

                <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-3">Operating Expenses</div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Servers, AI, Domain &amp; Email</span>
                    <span className="text-red-400 font-semibold">−{fmt(OPERATING_COSTS_USD)}</span>
                  </div>
                </div>

                <div className="border-t-2 border-gray-600 pt-3 flex justify-between items-center">
                  <span className="text-white font-bold">Net Income to Arcus</span>
                  <span className={`text-xl font-bold ${pnlCls(netIncome)}`}>{fmtSigned(netIncome)}</span>
                </div>

                <div className="mt-5 border-t border-gray-700/50 pt-4">
                  <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-3">Fee Collection</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Earned</span>
                      <span className="text-yellow-400 font-semibold">{fmt(totalFeesEarned)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Collected</span>
                      <span className="text-green-400 font-semibold">{fmt(totalFeesPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-gray-700 pt-2">
                      <span className="text-gray-300">Outstanding</span>
                      <span className={feesOutstanding > 0 ? "text-yellow-400" : "text-green-400"}>{fmt(feesOutstanding)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-sm">No snapshot data for {monthLabel}.</p>
            )}
          </div>

          {/* ══ FUND STATS ══ */}
          <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-5">
              Fund Stats — {monthLabel}
            </h2>
            {hasSnaps ? (
              <div className="space-y-3">
                {[
                  { label: "Opening AUM",       val: fmt(totalOpenAUM) },
                  { label: "Closing AUM",        val: fmt(totalAUM) },
                  { label: "Total Fund P&L",     val: fmtSigned(totalGrossPnl), cls: pnlCls(totalGrossPnl) },
                  { label: "Average ROI",        val: fmtPct(avgROI),           cls: pnlCls(avgROI) },
                  { label: "Total Trades",       val: String(totalTrades) },
                  { label: "Net Capital In",     val: fmtSigned(totalDeposits - totalWithdrawals), cls: pnlCls(totalDeposits - totalWithdrawals) },
                  { label: "Active Clients",     val: String(snaps.length) },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-gray-700/40">
                    <span className="text-gray-400 text-sm">{row.label}</span>
                    <span className={`text-sm font-semibold ${row.cls ?? "text-white"}`}>{row.val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">No snapshot data for {monthLabel}.</p>
            )}
          </div>
        </div>

        {/* ══ BOT HEALTH + CLIENT TABLE ══ */}
        <div className="bg-gray-800/40 border border-gray-700 rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-yellow-400 text-xs font-bold tracking-widest uppercase">
              Client Status &amp; Bot Health
            </h2>
            <span className="text-gray-600 text-xs">Live bot data · monthly snapshot data</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900/60 border-b border-gray-700">
                  {["Client", "Live Equity", "Bot", "Position", "Liq Distance", "Month P&L", "Month ROI", "Fee Earned", "Fee Paid", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-gray-500 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const bot   = c.bot_id ? botStateMap.get(c.bot_id) : null;
                  const snap  = snapByClient.get(c.id);
                  const age   = bot ? ageLabel(bot.updated_at) : null;
                  const liveEq = bot?.current_amount ?? null;

                  // Liquidation distance
                  let liqDistLabel = "—";
                  let liqDistCls   = "text-gray-500";
                  if (bot?.liq_price && bot.position === "long" && liveEq != null && bot.entry_price) {
                    const currentApprox = bot.entry_price; // best proxy without current_price in this view
                    const dist = ((currentApprox - bot.liq_price) / currentApprox) * 100;
                    liqDistLabel = `${dist.toFixed(1)}%`;
                    liqDistCls   = dist < 5 ? "text-red-400 font-bold" : dist < 10 ? "text-yellow-400" : "text-green-400";
                  }

                  const snap_pnl = snap?.gross_pnl ?? null;
                  const snap_roi = snap && snap.opening_balance > 0 ? (snap.gross_pnl / snap.opening_balance) * 100 : null;
                  const feePaid  = snap?.fee_paid ?? 0;
                  const isLoss   = snap ? snap.performance_fee === 0 : null;
                  const isPaid   = snap ? (!isLoss && feePaid >= snap.performance_fee) : null;

                  const statusLabel = isLoss === null ? "—" : isLoss ? "LOSS MONTH" : isPaid ? "PAID ✓" : "PENDING";
                  const statusCls   =
                    isLoss === null ? "bg-gray-700/40 text-gray-500"
                    : isLoss        ? "bg-gray-700/60 text-gray-400"
                    : isPaid        ? "bg-green-500/20 text-green-400"
                    :                 "bg-yellow-500/20 text-yellow-400";

                  return (
                    <tr key={c.id} className="border-b border-gray-700/40 hover:bg-gray-700/15 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white text-sm font-semibold">{c.name}</div>
                        <div className="text-gray-600 text-xs">{c.email}</div>
                      </td>
                      <td className="px-4 py-3 text-white text-sm font-mono font-semibold">
                        {liveEq != null ? fmt(liveEq) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {age ? (
                          <span className={`inline-block border text-[10px] font-bold px-2 py-0.5 rounded-full ${age.cls}`}>
                            {age.label}
                          </span>
                        ) : <span className="text-gray-600 text-xs">no bot</span>}
                      </td>
                      <td className="px-4 py-3">
                        {bot ? (
                          <span className={`text-xs font-semibold ${bot.position === "long" ? "text-green-400" : "text-gray-500"}`}>
                            {bot.position === "long" ? `LONG · ${bot.symbol}` : "FLAT"}
                          </span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-sm ${liqDistCls}`}>{liqDistLabel}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${snap_pnl != null ? pnlCls(snap_pnl) : "text-gray-600"}`}>
                        {snap_pnl != null ? fmtSigned(snap_pnl) : "—"}
                      </td>
                      <td className={`px-4 py-3 text-sm ${snap_roi != null ? pnlCls(snap_roi) : "text-gray-600"}`}>
                        {snap_roi != null ? fmtPct(snap_roi) : "—"}
                      </td>
                      <td className="px-4 py-3 text-yellow-400 text-sm font-semibold">
                        {snap ? fmt(snap.performance_fee) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${feePaid > 0 ? "text-green-400" : "text-gray-600"}`}>
                        {snap ? fmt(feePaid) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${statusCls}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Totals row */}
                {hasSnaps && (
                  <tr className="bg-gray-900/50 border-t-2 border-gray-600">
                    <td className="px-4 py-3 text-white text-sm font-bold">TOTAL</td>
                    <td className="px-4 py-3 text-white text-sm font-bold font-mono">{fmt(liveAUM)}</td>
                    <td colSpan={3} />
                    <td className={`px-4 py-3 text-sm font-bold ${pnlCls(totalGrossPnl)}`}>{fmtSigned(totalGrossPnl)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${pnlCls(avgROI)}`}>{fmtPct(avgROI)}</td>
                    <td className="px-4 py-3 text-yellow-400 text-sm font-bold">{fmt(totalFeesEarned)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${totalFeesPaid > 0 ? "text-green-400" : "text-gray-600"}`}>{fmt(totalFeesPaid)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* ══ RECENT CAPITAL EVENTS ══ */}
          <div className="bg-gray-800/40 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-yellow-400 text-xs font-bold tracking-widest uppercase">
                Recent Capital Events
              </h2>
            </div>
            {capEvents.length > 0 ? (
              <div className="divide-y divide-gray-700/40">
                {capEvents.map((ev) => {
                  const c = clientById.get(ev.client_id);
                  const isDeposit = ev.event_type === "DEPOSIT";
                  return (
                    <div key={ev.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDeposit ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"}`}>
                            {ev.event_type}
                          </span>
                          <span className="text-white text-sm font-medium">{c?.name ?? ev.client_id.slice(0, 8)}</span>
                        </div>
                        <div className="text-gray-600 text-xs mt-0.5 truncate">{ev.notes ?? "—"}</div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className={`text-sm font-bold ${isDeposit ? "text-blue-400" : "text-orange-400"}`}>
                          {isDeposit ? "+" : "−"}{fmt(ev.amount)}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {new Date(ev.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-6 text-gray-600 text-sm">No capital events yet.</p>
            )}
          </div>

          {/* ══ AUDIT LOG ══ */}
          <div className="bg-gray-800/40 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-yellow-400 text-xs font-bold tracking-widest uppercase">
                Audit Log — Last 15 Events
              </h2>
            </div>
            {auditLog.length > 0 ? (
              <div className="divide-y divide-gray-700/40">
                {auditLog.map((entry) => {
                  const c = entry.client_id ? clientById.get(entry.client_id) : null;
                  const typeColors: Record<string, string> = {
                    REPORT_SENT:       "bg-purple-500/20 text-purple-400",
                    BALANCE_SNAPSHOT:  "bg-blue-500/20 text-blue-400",
                    DEPOSIT:           "bg-green-500/20 text-green-400",
                    WITHDRAWAL:        "bg-orange-500/20 text-orange-400",
                    FEE:               "bg-yellow-500/20 text-yellow-400",
                    RATE_FETCH:        "bg-gray-500/20 text-gray-400",
                  };
                  const typeCls = typeColors[entry.event_type] ?? "bg-gray-600/20 text-gray-400";
                  return (
                    <div key={entry.id} className="px-5 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${typeCls}`}>
                            {entry.event_type}
                          </span>
                          {c && <span className="text-gray-400 text-xs">{c.name}</span>}
                        </div>
                        <p className="text-gray-500 text-xs truncate max-w-xs">{entry.description ?? "—"}</p>
                      </div>
                      <div className="text-gray-600 text-xs whitespace-nowrap shrink-0">
                        {new Date(entry.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-6 text-gray-600 text-sm">No audit entries yet.</p>
            )}
          </div>
        </div>

        {/* ══ QUICK ACTIONS ══ */}
        <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-6 mb-6">
          <h2 className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Trigger Monthly Report",
                desc:  "Send emails to all clients",
                href:  `/api/cron/monthly-report`,
                cls:   "border-yellow-500/30 hover:border-yellow-500/60 hover:bg-yellow-500/5",
                icon:  "📧",
              },
              {
                label: "Trigger Daily Snapshot",
                desc:  "Force balance + rate capture",
                href:  `/api/cron/daily-snapshot`,
                cls:   "border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5",
                icon:  "📸",
              },
              {
                label: "Record Capital Event",
                desc:  "Log deposit / withdrawal",
                href:  `/api/admin/capital-event`,
                cls:   "border-green-500/30 hover:border-green-500/60 hover:bg-green-500/5",
                icon:  "💸",
              },
              {
                label: "Mark Fee Paid",
                desc:  "Confirm performance fee received",
                href:  `/api/admin/fee-paid`,
                cls:   "border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5",
                icon:  "✅",
              },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`block border rounded-xl p-4 transition-all cursor-pointer ${action.cls}`}
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <div className="text-white text-sm font-semibold">{action.label}</div>
                <div className="text-gray-600 text-xs mt-0.5">{action.desc}</div>
              </a>
            ))}
          </div>
        </div>

        {/* ══ ALL-TIME FEE TRACKER ══ */}
        <div className="bg-gray-800/40 border border-gray-700 rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-yellow-400 text-xs font-bold tracking-widest uppercase">
                All-Time Fee Tracker
              </h2>
              <p className="text-gray-600 text-xs mt-0.5">Every month with a performance fee — across all clients and all periods</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Total Outstanding</div>
              <div className={`text-lg font-bold ${allTimeOutstanding > 0.01 ? "text-yellow-400" : "text-green-400"}`}>
                {allTimeOutstanding > 0.01 ? `$${allTimeOutstanding.toFixed(2)}` : "All Clear ✓"}
              </div>
            </div>
          </div>
          {feeRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900/60 border-b border-gray-700">
                    {["Client", "Period", "Fee Earned", "Fee Paid", "Outstanding", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-gray-500 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feeRows.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-700/40 hover:bg-gray-700/15 transition-colors ${!row.isFullyPaid ? "bg-yellow-500/3" : ""}`}>
                      <td className="px-4 py-3 text-white text-sm font-semibold">{row.client?.name ?? "Unknown"}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{row.periodLabel}</td>
                      <td className="px-4 py-3 text-yellow-400 text-sm font-semibold">{fmt(row.fee)}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${row.paid > 0 ? "text-green-400" : "text-gray-600"}`}>{fmt(row.paid)}</td>
                      <td className={`px-4 py-3 text-sm font-bold ${row.isFullyPaid ? "text-gray-600" : "text-yellow-400"}`}>
                        {row.isFullyPaid ? "—" : fmt(row.outstanding)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${
                          row.isFullyPaid ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {row.isFullyPaid ? "PAID ✓" : "PENDING"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Totals */}
                  <tr className="bg-gray-900/50 border-t-2 border-gray-600">
                    <td className="px-4 py-3 text-white text-sm font-bold" colSpan={2}>ALL TIME TOTAL</td>
                    <td className="px-4 py-3 text-yellow-400 text-sm font-bold">{fmt(allTimeFeesEarned)}</td>
                    <td className="px-4 py-3 text-green-400 text-sm font-bold">{fmt(allTimeFeesPaid)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${allTimeOutstanding > 0.01 ? "text-yellow-400" : "text-green-400"}`}>
                      {allTimeOutstanding > 0.01 ? fmt(allTimeOutstanding) : "—"}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-6 text-gray-600 text-sm">No performance fees have been invoiced yet.</p>
          )}
        </div>

        {/* ══ ACCOUNTING INTEGRITY CHECK ══ */}
        <div className="bg-gray-800/40 border border-gray-700 rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-yellow-400 text-xs font-bold tracking-widest uppercase">
                Accounting Integrity Check
              </h2>
              <p className="text-gray-600 text-xs mt-0.5">
                Verifies each month&apos;s opening balance equals the prior month&apos;s closing balance
              </p>
            </div>
            <div>
              {continuityIssues.length === 0 ? (
                <span className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full">
                  ✓ All periods reconciled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full">
                  ⚠ {continuityIssues.length} issue{continuityIssues.length !== 1 ? "s" : ""} found
                </span>
              )}
            </div>
          </div>
          {continuityIssues.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900/60 border-b border-gray-700">
                    {["Client", "Period", "Expected Opening", "Actual Opening", "Gap", "Likely Cause"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-gray-500 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {continuityIssues.map((issue, i) => (
                    <tr key={i} className="border-b border-gray-700/40 bg-red-500/5">
                      <td className="px-4 py-3 text-white text-sm font-semibold">{issue.clientName}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{issue.period}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm font-mono">{fmt(issue.expected)}</td>
                      <td className="px-4 py-3 text-red-400 text-sm font-mono font-bold">{fmt(issue.actual)}</td>
                      <td className="px-4 py-3 text-red-400 text-sm font-bold">{fmt(issue.delta)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {issue.delta > 100
                          ? "Large gap — likely a missed deposit/withdrawal in capital_events"
                          : "Small gap — check if balance_history has duplicate/missing snapshots"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-5 text-gray-500 text-sm">
              <p>All {allSnaps.length} monthly snapshots are sequentially consistent.</p>
              <p className="text-gray-600 text-xs mt-1">
                This check runs against Supabase data only. For Binance API reconciliation, use{" "}
                <code className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">GET /api/admin/capital-event?email=client@...</code>
                {" "}and compare against Binance transfer history.
              </p>
            </div>
          )}
        </div>

        {/* ══ CONSTANTS NOTE ══ */}
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 text-sm text-gray-500">
          <span className="text-blue-400 font-semibold">Operating costs</span> are hardcoded at{" "}
          <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">{fmt(OPERATING_COSTS_USD)}/month</code>.
          Update <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">OPERATING_COSTS_USD</code>{" "}
          in <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">app/admin/page.tsx</code> when costs change.
          Access is restricted to <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">@arcusquantfund.com</code> accounts.
        </div>

      </div>
    </div>
  );
}
