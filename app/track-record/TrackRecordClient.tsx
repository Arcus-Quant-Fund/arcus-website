"use client";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import TradeHistoryChart from "@/components/TradeHistoryChart";

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
  pnl_percent: number | null;
  reason: string;
  trade_id: string | null;
};

type ChartTrade = {
  trade_id: string;
  timestamp: string;
  side: string;
  price: number;
  pnl: number | null;
  amount: number | null;
};


const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(ts: string) {
  const d = new Date(ts.includes("T") ? ts : ts.replace(" ", "T") + "Z");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function formatUpdated(iso: string) {
  const d = new Date(iso);
  const date = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `Updated ${date} at ${h12}:${m} ${ampm} UTC`;
}

export default function TrackRecordClient({
  stats,
  trades,
  allTrades,
}: {
  stats: PerfStats;
  trades: Trade[];
  allTrades: ChartTrade[];
}) {
  // Build equity curve from live trade data.
  // pnl_percent from sqlite records = price_return% × leverage = margin ROI%.
  // The bot stores this correctly; we compound it directly.
  const LEVERAGE = 3.5;
  let equity = 100;
  const enrichedTrades = trades.map((t) => {
    const marginPct = t.pnl_percent ?? 0;
    equity = equity * (1 + marginPct / 100);
    // Strip "bnb_" prefix to expose the raw Binance order ID for verification
    const orderId = t.trade_id?.startsWith("bnb_")
      ? t.trade_id.slice(4)
      : (t.trade_id ?? null);
    return {
      ...t,
      marginPct,
      equity: Math.round(equity * 10000) / 10000,
      date: formatDate(t.timestamp),
      orderId,
    };
  });

  const maxEquity = Math.max(...enrichedTrades.map((t) => t.equity), 100);
  const lastEquity = enrichedTrades.at(-1)?.equity ?? 100;

  // Live stats — zero fallbacks so missing data is visible, not masked by stale numbers
  const totalPnl    = stats?.total_pnl      ?? 0;
  const pf          = stats?.profit_factor  ?? 0;
  const winRate     = stats?.win_rate       ?? 0;
  const sharpe      = stats?.sharpe_ratio   ?? 0;
  const winTrades   = stats?.win_trades     ?? 0;
  const lossTrades  = stats?.loss_trades    ?? 0;
  const avgWin      = stats?.avg_win_usd    ?? 0;
  const avgLoss     = stats?.avg_loss_usd   ?? 0;
  const bestPnl     = stats?.best_trade_pnl ?? 0;
  const bestDate    = stats?.best_trade_date ?? "—";

  // Derive count and period from live trade data — avoids stale performance_stats cache
  const totalTrades = trades.length > 0 ? trades.length : (stats?.total_trades ?? 0);
  const periodStart = trades.length > 0
    ? (() => { const d = new Date(trades[0].timestamp); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; })()
    : (stats?.period_start ?? "—");
  const periodEnd = trades.length > 0
    ? (() => { const d = new Date(trades[trades.length - 1].timestamp); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; })()
    : (stats?.period_end ?? "Feb 2026");

  const updatedStr = stats?.updated_at
    ? formatUpdated(stats.updated_at)
    : "synced from trading server";

  const displayTrades = enrichedTrades.length > 0 ? enrichedTrades : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-grid pt-24 px-6 relative overflow-hidden">
      <div className="glow-orb-gold" style={{ top: "-200px", right: "-100px" }} />
      <div className="glow-orb-blue" style={{ bottom: "400px", left: "-200px" }} />
      <div className="max-w-3xl mx-auto relative">

        {/* Header */}
        <div className="mb-12 animate-in">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
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
        <div className="animate-in grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
            <div className="text-2xl font-bold text-gold mb-1">{(lastEquity - 100) >= 0 ? "+" : ""}{(lastEquity - 100).toFixed(1)}%</div>
            <div className="text-white text-sm font-medium mb-0.5">Strategy Return</div>
            <div className="text-gray-500 text-xs">Compounded per-trade · 3.5× margin · Sep 2025</div>
          </div>

          {[
            { value: pf.toFixed(2),            label: "Profit Factor", sub: "Gross wins ÷ gross losses" },
            { value: `${winRate.toFixed(1)}%`, label: "Win Rate",      sub: `${winTrades}W / ${lossTrades}L` },
            { value: sharpe.toFixed(2),         label: "Sharpe Ratio",  sub: "Annualised on margin returns" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-gold mb-1">{s.value}</div>
              <div className="text-white text-sm font-medium mb-0.5">{s.label}</div>
              <div className="text-gray-500 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>


        {/* Alpha callout */}
        <div className="animate-in bg-gold/5 border border-gold/20 rounded-2xl p-6 mb-10">
          <p className="text-white font-semibold text-base mb-2">
            The bot made money in a falling market.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            This period included a −40% XRP flash crash in October 2025 — one of the largest
            single-asset liquidation events in crypto history — and multiple sustained selloffs
            through early 2026. The strategy absorbed those drawdowns, recovered, and compounded
            to a new equity high. Generating positive returns when the underlying asset falls is
            the definition of alpha.
          </p>
        </div>

        {/* Equity curve */}
        {displayTrades && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
            <h2 className="text-white font-bold text-lg mb-1">Equity Curve</h2>
            <p className="text-gray-500 text-sm mb-6">
              Normalized index starting at 100. Each bar = one closed trade. Height = running compound of per-trade margin returns (3.5× leverage).
            </p>
            <div className="flex items-end gap-1 h-32">
              {displayTrades.map((t, i) => {
                const heightPct = (t.equity / (maxEquity * 1.05)) * 100;
                const isWin = t.marginPct > 0;
                const isSpecial = Math.abs(t.marginPct) > 20;
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
                      <div className={t.marginPct > 0 ? "text-green-400" : "text-red-400"}>
                        {t.marginPct > 0 ? "+" : ""}{t.marginPct.toFixed(2)}%
                      </div>
                      <div className="text-gray-400">Equity: {t.equity.toFixed(1)}</div>
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

        {/* 4h chart with all trade markers */}
        {allTrades.length > 0 && (
          <div className="mb-10">
            <TradeHistoryChart
              priceData={[]}
              trades={allTrades}
              symbol="XRPUSDT"
            />
            {/* Context note */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-4 space-y-3">
              <p className="text-gray-400 text-sm leading-relaxed">
                <span className="text-white font-semibold">Asset selection.</span>{" "}
                XRP/USDT is our primary alpha pair — it produced the best results
                across our backtests and optimisation runs. You can request a
                different asset, but understand this is the configuration we have
                the most confidence in.
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                <span className="text-white font-semibold">Why only one asset?</span>{" "}
                Finding a reliable edge requires serious compute, time, and patience —
                backtests, walk-forward validation, parameter optimisation, Monte Carlo
                simulation, and then a live run to confirm the edge holds in real market
                conditions. Each asset is its own full cycle. With a small team we do
                one properly rather than many superficially.
              </p>
              <p className="text-gray-500 text-xs border-t border-gray-800 pt-3">
                Individual client performance is confidential and not shown publicly.
                The track record above reflects our own trading capital deployed
                under the same strategy and parameters offered to clients.
              </p>
            </div>
          </div>
        )}

        {/* Full trade log */}
        {displayTrades && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
            <h2 className="text-white font-bold text-lg mb-1">Full Trade Log</h2>
            <p className="text-gray-500 text-sm mb-4">
              XRP/USDT perpetuals · 3.5× isolated margin · Binance
            </p>
            {/* Column headers */}
            <div className="flex items-center justify-between px-3 pb-2 border-b border-gray-800 mb-1">
              <span className="text-gray-600 text-xs w-24 flex-shrink-0">Date</span>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-gray-600 text-xs w-16 text-right">Price %</span>
                <span className="text-gray-600 text-xs w-20 text-right">Margin %</span>
                <span className="text-gray-600 text-xs w-14 text-right">Equity</span>
                <span className="text-gray-600 text-xs w-28 text-right">Order ID</span>
              </div>
            </div>
            <div className="space-y-1">
              {displayTrades.map((t, i) => {
                const unlevPct = t.marginPct / LEVERAGE;
                return (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center ${
                      t.marginPct > 0 ? "bg-green-500/20" : "bg-red-500/20"
                    }`}>
                      {t.marginPct > 0
                        ? <TrendingUp size={11} className="text-green-400" />
                        : <TrendingDown size={11} className="text-red-400" />}
                    </div>
                    <span className="text-gray-400 text-xs w-24 flex-shrink-0">{t.date}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={`text-xs w-16 text-right ${
                      unlevPct > 0 ? "text-green-500/80" : "text-red-500/80"
                    }`}>
                      {unlevPct > 0 ? "+" : ""}{unlevPct.toFixed(2)}%
                    </span>
                    <span className={`text-sm font-semibold w-20 text-right ${
                      t.marginPct > 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {t.marginPct > 0 ? "+" : ""}{t.marginPct.toFixed(2)}%
                    </span>
                    <span className="text-gray-500 text-xs w-14 text-right">
                      {t.equity.toFixed(1)}
                    </span>
                    <span className="text-gray-600 text-[10px] w-28 text-right font-mono truncate" title={t.orderId ?? ""}>
                      {t.orderId
                        ? <a
                            href={`https://www.binance.com/en/my/orders/exchange/tradeorder`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-gray-400 transition-colors"
                            title={`Binance Order ID: ${t.orderId}`}
                          >
                            #{t.orderId.slice(-8)}
                          </a>
                        : <span className="text-gray-700">—</span>}
                    </span>
                  </div>
                </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800">
              <div>
                <div className="text-gray-400 text-sm font-medium">Equity index (base 100)</div>
                <div className="text-gray-600 text-xs mt-0.5">Compounding all trades since Sep 2025</div>
              </div>
              <span className="text-green-400 text-lg font-bold">
                {lastEquity.toFixed(2)}{" "}
                <span className="text-sm text-green-400/70">(+{(lastEquity - 100).toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        )}

        {/* Strategy history timeline */}
        <div className="animate-in bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
          <h2 className="text-white font-black text-lg mb-5">Strategy History</h2>
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
                desc: "149 closed trades on XRP/USDT spot (no leverage). Win rate 43%, profit factor 1.57, avg win +4.32%, avg loss −2.08%. Compounded positively across 10 months through bull, bear, and sideways conditions — validating the DC-VWAP edge before scaling to leveraged perpetuals.",
                badge: "Completed",
                badgeColor: "blue",
              },
              {
                period: "Sep 2025 – Present",
                label: "XRP/USDT Margin Strategy",
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
        <div className="animate-in bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
          <h3 className="text-white font-black text-lg mb-5">How Every Number Is Calculated</h3>
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
              <div className="text-gold text-sm font-semibold mb-1">Margin ROI % — return on capital per trade</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">Margin ROI% = P&amp;L ÷ Margin × 100</code>
                <br />Return on the actual USDT at risk (margin), not the full position size. This is the &quot;Margin %&quot; column in the trade log. The &quot;Price %&quot; column divides by 3.5× to show the unleveraged XRP price move.
              </div>
            </div>
            <div>
              <div className="text-gold text-sm font-semibold mb-1">Strategy Return (+{(lastEquity - 100).toFixed(1)}%) — how the equity index is built</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">index = 100 × ∏(1 + margin_roi_i / 100)</code>
                <br />A normalized index starting at 100 in Sep 2025. Each trade&apos;s margin return is compounded onto the running total — equivalent to asking &quot;if you had reinvested all margin profits into each subsequent trade, what would $100 have grown to?&quot; Every number comes from the live trade log above. Position sizes in the real account varied; the index assumes full reinvestment.
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
        <div className="animate-in bg-gold/10 border border-gold/20 rounded-2xl p-8 text-center mb-16">
          <h3 className="text-2xl font-black text-white mb-3">Apply for Access</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Standard minimum $6,000. Or start with just $1,000 on our 7-month Pilot Programme — verify our returns with real capital before committing more. We deploy on your Binance account via trade-only API. Your capital stays in your account at all times.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-black font-semibold rounded-xl transition-all hover:shadow-[0_6px_24px_rgba(248,172,7,0.35)] hover:-translate-y-0.5"
          >
            Get in Touch <ArrowRight size={18} />
          </Link>
        </div>

      </div>
    </div>
  );
}
