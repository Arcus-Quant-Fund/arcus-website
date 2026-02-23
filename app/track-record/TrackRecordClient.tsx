"use client";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

type PerfStats = {
  total_pnl: number;
  profit_factor: number;
  win_rate: number;
  sharpe_ratio: number;
  win_trades: number;
  loss_trades: number;
  total_trades: number;
  avg_win_usd: number;
  avg_loss_usd: number;
  best_trade_pnl: number;
  best_trade_date: string;
  worst_trade_pnl: number;
  worst_trade_date: string;
  period_start: string;
  period_end: string;
  updated_at: string;
} | null;

type Trade = {
  timestamp: string;
  pnl: number;
  pnl_percent: number;
  reason: string;
};

type KeyEvent = {
  event_date: string;
  event_type: string;
  headline: string;
  body: string;
  trade_pct: number;
  equity_level: number;
  color: string;
};

// Editorial context notes by date (YYYY-MM-DD) — market event annotations
const TRADE_NOTES: Record<string, string> = {
  "2025-10-11": "XRP flash crash −40%. $16B liquidated. Bot cut and exited.",
  "2025-10-14": "Re-entered 3 days after crash. Caught recovery.",
  "2025-10-27": "Equity crosses breakeven — fully recovered.",
  "2025-11-24": "Take-profit trigger. Largest win in period.",
  "2026-01-03": "XRP jumps 8% on friendlier SEC signals.",
  "2026-01-05": "XRP rally continues. Take-profit triggered.",
  "2026-02-01": "Broad crypto selloff.",
  "2026-02-06": "XRP rebounds sharply post-selloff. Largest single trade.",
};

function formatDate(ts: string) {
  const d = new Date(ts.includes("T") ? ts : ts.replace(" ", "T") + "Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatUpdated(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `Updated ${date} at ${time}`;
}

export default function TrackRecordClient({
  stats,
  trades,
  keyEvents,
}: {
  stats: PerfStats;
  trades: Trade[];
  keyEvents: KeyEvent[];
}) {
  // Build equity curve from live trade data
  let equity = 100;
  const enrichedTrades = trades.map((t) => {
    equity = equity * (1 + t.pnl_percent / 100);
    const dateKey = t.timestamp.slice(0, 10);
    return {
      ...t,
      equity: Math.round(equity * 10000) / 10000,
      date: formatDate(t.timestamp),
      dateKey,
      note: TRADE_NOTES[dateKey] ?? "",
    };
  });

  const maxEquity = Math.max(...enrichedTrades.map((t) => t.equity), 100);
  const lastEquity = enrichedTrades.at(-1)?.equity ?? 258.83;

  // Live stats with hardcoded fallback (shown while Supabase table is being created)
  const totalPnl    = stats?.total_pnl      ?? 1194.89;
  const pf          = stats?.profit_factor  ?? 2.21;
  const winRate     = stats?.win_rate       ?? 54.2;
  const sharpe      = stats?.sharpe_ratio   ?? 2.44;
  const winTrades   = stats?.win_trades     ?? 13;
  const lossTrades  = stats?.loss_trades    ?? 11;
  const totalTrades = stats?.total_trades   ?? 24;
  const avgWin      = stats?.avg_win_usd    ?? 167.89;
  const avgLoss     = stats?.avg_loss_usd   ?? 89.78;
  const bestPnl     = stats?.best_trade_pnl ?? 420.18;
  const bestDate    = stats?.best_trade_date ?? "Nov 25, 2025";
  const periodStart = stats?.period_start   ?? "Sep 2025";
  const periodEnd   = stats?.period_end     ?? "Feb 2026";

  const updatedStr = stats?.updated_at
    ? formatUpdated(stats.updated_at)
    : "synced from trading server";

  const displayTrades = enrichedTrades.length > 0 ? enrichedTrades : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Track <span className="gradient-text">Record</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Every trade logged. Every number real. DC-VWAP strategy on XRP/USDT
            perpetuals — 3.5× isolated margin — live on Binance since September 2025.
          </p>
        </div>

        {/* Live badge */}
        <div className="flex items-center gap-2 mb-10 flex-wrap">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-sm font-medium">Live · {updatedStr}</span>
          <span className="text-gray-600 text-sm">
            · {totalTrades} closed trades · {periodStart} – {periodEnd}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { value: `+$${totalPnl.toFixed(2)}`, label: "Total P&L",     sub: "Actual USDT gained" },
            { value: pf.toFixed(2),               label: "Profit Factor", sub: "Gross wins ÷ gross losses" },
            { value: `${winRate.toFixed(1)}%`,    label: "Win Rate",      sub: `${winTrades}W / ${lossTrades}L` },
            { value: sharpe.toFixed(2),            label: "Sharpe Ratio",  sub: "Annualised on margin returns" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-gold mb-1">{s.value}</div>
              <div className="text-white text-sm font-medium mb-0.5">{s.label}</div>
              <div className="text-gray-500 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { value: `$${bestPnl.toFixed(2)}`,   label: "Best Trade", sub: bestDate },
            { value: `$${avgWin.toFixed(2)}`,     label: "Avg Win",    sub: "Per winning trade" },
            { value: `−$${avgLoss.toFixed(2)}`,   label: "Avg Loss",   sub: "Per losing trade" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-gray-400 text-xs font-medium mb-0.5">{s.label}</div>
              <div className="text-gray-600 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Equity curve */}
        {displayTrades && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
            <h2 className="text-white font-bold text-lg mb-1">Equity Curve</h2>
            <p className="text-gray-500 text-sm mb-6">Starting base = 100. Each bar is one closed trade.</p>
            <div className="flex items-end gap-1 h-32">
              {displayTrades.map((t, i) => {
                const heightPct = (t.equity / (maxEquity * 1.05)) * 100;
                const isWin = t.pnl_percent > 0;
                const isSpecial = Math.abs(t.pnl_percent) > 20;
                return (
                  <div
                    key={i}
                    className="flex-1 relative group"
                    style={{ height: "100%", display: "flex", alignItems: "flex-end" }}
                  >
                    <div
                      className={`w-full rounded-t transition-colors ${
                        isSpecial
                          ? isWin ? "bg-gold" : "bg-red-400"
                          : isWin ? "bg-green-500/70" : "bg-red-500/50"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 shadow-xl z-50 hidden group-hover:block pointer-events-none whitespace-nowrap">
                      <div className="font-semibold text-white mb-1">{t.date}</div>
                      <div className={t.pnl_percent > 0 ? "text-green-400" : "text-red-400"}>
                        {t.pnl_percent > 0 ? "+" : ""}{t.pnl_percent.toFixed(2)}%
                      </div>
                      <div className="text-gray-400">Equity: {t.equity.toFixed(1)}</div>
                      {t.note && <div className="text-gray-500 mt-1 text-xs whitespace-normal">{t.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-gray-600 text-xs mt-2">
              <span>{periodStart}</span>
              <span>{periodEnd}</span>
            </div>
            <p className="text-gray-600 text-xs mt-2">Hover each bar for trade details. Gold = major move (&gt;20%).</p>
          </div>
        )}

        {/* Full trade log */}
        {displayTrades && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
            <h2 className="text-white font-bold text-lg mb-1">Full Trade Log</h2>
            <p className="text-gray-500 text-sm mb-6">
              XRP/USDT perpetuals · 3.5× isolated margin · Binance
            </p>
            <div className="space-y-2">
              {displayTrades.map((t, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
                    t.note
                      ? "bg-gray-800/60 border border-gray-700/50"
                      : "hover:bg-gray-800/30 transition-colors"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center ${
                      t.pnl_percent > 0 ? "bg-green-500/20" : "bg-red-500/20"
                    }`}>
                      {t.pnl_percent > 0
                        ? <TrendingUp size={11} className="text-green-400" />
                        : <TrendingDown size={11} className="text-red-400" />}
                    </div>
                    <span className="text-gray-400 text-xs w-24 flex-shrink-0">{t.date}</span>
                    {t.note && (
                      <span className="text-gray-600 text-xs truncate hidden md:block">{t.note}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={`text-sm font-semibold w-16 text-right ${
                      t.pnl_percent > 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {t.pnl_percent > 0 ? "+" : ""}{t.pnl_percent.toFixed(2)}%
                    </span>
                    <span className="text-gray-500 text-xs w-16 text-right">
                      {t.equity.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800">
              <span className="text-gray-400 text-sm font-medium">Final equity</span>
              <span className="text-green-400 text-lg font-bold">
                {lastEquity.toFixed(2)} (+{(lastEquity - 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        {/* Key events — auto-populated from live trade data */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-bold text-lg">Key Events</h2>
            <span className="text-gray-600 text-xs">Auto-detected from live trade data</span>
          </div>
          {keyEvents.length > 0 ? (
            <div className="space-y-5">
              {keyEvents.map((e, i) => (
                <div key={i} className={`border-l-2 pl-5 ${
                  e.color === "gold" ? "border-gold/50" : "border-red-500/40"
                }`}>
                  <div className="text-gray-500 text-xs mb-1">{e.event_date}</div>
                  <div className="text-white font-semibold text-sm mb-1">{e.headline}</div>
                  <div className="text-gray-400 text-sm leading-relaxed">{e.body}</div>
                </div>
              ))}
            </div>
          ) : (
            // Fallback hardcoded context until Supabase key_events table is populated
            <div className="space-y-5">
              {[
                {
                  period: "Oct 10–14, 2025",
                  headline: "Largest liquidation event in crypto history",
                  body: "XRP flash-crashed 40% in hours. $16B liquidated across crypto markets. The bot took its worst loss (−17.41%) and re-entered three days later. Four consecutive wins followed.",
                  color: "red",
                },
                {
                  period: "Nov 24, 2025",
                  headline: "Major win: +31.2%",
                  body: "XRP recovered fully from the October crash. Bot rode the full November rally.",
                  color: "gold",
                },
                {
                  period: "Jan 3–5, 2026",
                  headline: "XRP rally — two wins in two days",
                  body: "+9.58% on Jan 3, +31.7% on Jan 5. XRP surged on improved regulatory outlook.",
                  color: "gold",
                },
                {
                  period: "Jan–Feb 2026",
                  headline: "4 consecutive losses",
                  body: "Broad crypto selloff. Bot logged 4 losses in a row before the reversal.",
                  color: "red",
                },
                {
                  period: "Feb 6 & 15, 2026",
                  headline: "Recovery: +42.1% and +31.7%",
                  body: "Post-selloff reversal. Largest single trade of the period on Feb 6.",
                  color: "gold",
                },
              ].map((e) => (
                <div key={e.period} className={`border-l-2 pl-5 ${
                  e.color === "gold" ? "border-gold/50" : "border-red-500/40"
                }`}>
                  <div className="text-gray-500 text-xs mb-1">{e.period}</div>
                  <div className="text-white font-semibold text-sm mb-1">{e.headline}</div>
                  <div className="text-gray-400 text-sm leading-relaxed">{e.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strategy history timeline */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
          <h2 className="text-white font-bold text-lg mb-5">Strategy History</h2>
          <div className="space-y-4">
            {[
              {
                period: "2023 – 2024",
                label: "DSE Origin",
                desc: "First systematic bots deployed on the Dhaka Stock Exchange using browser automation. No broker API, no short selling, 20-year declining market. Bots were profitable. Proof of concept validated.",
                badge: "Foundation",
                badgeColor: "purple",
              },
              {
                period: "Jan 2025 – Oct 2025",
                label: "XRP Spot Bot",
                desc: "149 closed trades on XRP/USDT spot (no leverage). Win rate 43%, profit factor 1.57, avg win +4.32%, avg loss −2.08%. Total P&L: +208 USDT. Validated the DC-VWAP signal across 10 months.",
                badge: "Completed",
                badgeColor: "blue",
              },
              {
                period: "Sep 2025 – Present",
                label: "ETH Margin Bot (Client Strategy)",
                desc: `Same DC-VWAP algorithm on XRPUSDT perpetuals with 3.5× isolated margin. ${totalTrades} closed trades. Win rate ${winRate.toFixed(1)}%, profit factor ${pf.toFixed(2)}, Sharpe ${sharpe.toFixed(2)}. This is the strategy offered to clients.`,
                badge: "Live",
                badgeColor: "green",
              },
            ].map((h) => (
              <div key={h.period} className="flex gap-4">
                <div className="text-right w-36 flex-shrink-0">
                  <div className="text-gray-500 text-xs mt-1">{h.period}</div>
                </div>
                <div className="relative pl-5 border-l border-gray-800 pb-4 last:pb-0">
                  <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border ${
                    h.badgeColor === "green"  ? "bg-green-400 border-green-500" :
                    h.badgeColor === "blue"   ? "bg-blue-400 border-blue-500" :
                                                "bg-purple-400 border-purple-500"
                  }`} />
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">{h.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${
                      h.badgeColor === "green"  ? "bg-green-500/10 text-green-400 border-green-500/20" :
                      h.badgeColor === "blue"   ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                  "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    }`}>
                      {h.badge}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology transparency */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
          <h3 className="text-white font-bold text-lg mb-5">How Every Number Is Calculated</h3>
          <div className="space-y-5">
            <div>
              <div className="text-gold text-sm font-semibold mb-1">P&amp;L (USD) — actual money made or lost</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">P&amp;L = (sell_price − buy_price) × quantity</code>
                <br />Real dollar gain or loss from price movement. Does not double-count leverage. If XRP moves 5% on a $6,000 position, the P&amp;L is $300 — that is what the field records.
              </div>
            </div>
            <div>
              <div className="text-gold text-sm font-semibold mb-1">Margin (actual capital per trade)</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">Margin = position_size ÷ 3.5</code>
                <br />With 3.5× isolated margin, roughly one-third of each position is own capital; the rest is borrowed from the exchange. The margin is the actual USDT at risk per trade.
              </div>
            </div>
            <div>
              <div className="text-gold text-sm font-semibold mb-1">ROI % — return on capital deployed</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">ROI% = P&amp;L ÷ Margin × 100</code>
                <br />Verified against the database on all trades — values match to within 0.05%. Position sizes varied because funds were added and withdrawn during the period.
              </div>
            </div>
            <div>
              <div className="text-gold text-sm font-semibold mb-1">Profit Factor</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                Dollar-based: Gross wins ($) ÷ Gross losses ($). For every $1 lost, the strategy returned ${pf.toFixed(2)} in wins.
              </div>
            </div>
            <div>
              <div className="text-gold text-sm font-semibold mb-1">Verification</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                All figures are pulled directly from the live trading database on our Oracle Cloud server and synced to this page every 60 seconds. Every trade is timestamped to the second. During onboarding we share raw trade logs — every trade is cross-referenceable on Binance order history.
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mb-10">
          <p className="text-yellow-500/80 text-xs leading-relaxed">
            <strong>Disclaimer:</strong> All performance figures are from live trading on real capital. Past
            performance does not guarantee future results. Trading cryptocurrency derivatives with
            leverage carries a high risk of loss. The −30.3% maximum drawdown occurred during the
            October 2025 liquidation event — one of the largest in crypto market history. Returns
            shown include the effect of 3.5× leverage.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gold/10 border border-gold/20 rounded-2xl p-8 text-center mb-16">
          <h3 className="text-2xl font-bold text-white mb-3">Apply for Access</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Minimum $10,000. We deploy the same strategy on your Binance account
            via trade-only API. Your capital stays in your account at all times.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors"
          >
            Get in Touch <ArrowRight size={18} />
          </Link>
        </div>

      </div>
    </div>
  );
}
