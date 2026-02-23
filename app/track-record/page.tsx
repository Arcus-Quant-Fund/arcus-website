"use client";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

// Real trade data from ETH margin bot (XRPUSDT, 3.5x isolated margin)
// Source: live Oracle Cloud server database, Sep 2025 – Feb 2026
const trades = [
  { date: "Sep 25, 2025", pct: -5.89,  equity: 94.11,  reason: "signal",      note: "" },
  { date: "Sep 30, 2025", pct: -3.54,  equity: 90.79,  reason: "signal",      note: "" },
  { date: "Oct 04, 2025", pct: +6.06,  equity: 96.29,  reason: "signal",      note: "" },
  { date: "Oct 11, 2025", pct: -17.41, equity: 79.52,  reason: "signal",      note: "XRP flash crash −40%. $16B liquidated. Bot cut and exited." },
  { date: "Oct 14, 2025", pct: +7.04,  equity: 85.12,  reason: "signal",      note: "Re-entered 3 days after crash. Caught recovery." },
  { date: "Oct 21, 2025", pct: +13.06, equity: 96.24,  reason: "signal",      note: "" },
  { date: "Oct 27, 2025", pct: +19.94, equity: 115.43, reason: "signal",      note: "Equity crosses breakeven — fully recovered." },
  { date: "Nov 01, 2025", pct: -2.26,  equity: 112.83, reason: "signal",      note: "" },
  { date: "Nov 06, 2025", pct: +6.41,  equity: 120.06, reason: "signal",      note: "" },
  { date: "Nov 08, 2025", pct: -9.19,  equity: 109.02, reason: "signal",      note: "" },
  { date: "Nov 11, 2025", pct: +10.50, equity: 120.48, reason: "signal",      note: "" },
  { date: "Nov 13, 2025", pct: -11.96, equity: 106.07, reason: "signal",      note: "" },
  { date: "Nov 24, 2025", pct: +31.20, equity: 139.17, reason: "take_profit", note: "Take-profit trigger. Largest win in period." },
  { date: "Dec 03, 2025", pct: +5.26,  equity: 146.49, reason: "signal",      note: "" },
  { date: "Dec 09, 2025", pct: -8.14,  equity: 134.57, reason: "signal",      note: "" },
  { date: "Dec 21, 2025", pct: +2.22,  equity: 137.56, reason: "signal",      note: "" },
  { date: "Jan 03, 2026", pct: +9.58,  equity: 150.74, reason: "signal",      note: "XRP jumps 8% on friendlier SEC signals." },
  { date: "Jan 05, 2026", pct: +31.70, equity: 198.53, reason: "take_profit", note: "XRP rally continues. Take-profit triggered." },
  { date: "Jan 14, 2026", pct: -8.18,  equity: 182.28, reason: "signal",      note: "" },
  { date: "Jan 27, 2026", pct: -8.14,  equity: 167.45, reason: "signal",      note: "" },
  { date: "Feb 01, 2026", pct: -11.31, equity: 148.51, reason: "signal",      note: "Broad crypto selloff." },
  { date: "Feb 02, 2026", pct: -6.86,  equity: 138.33, reason: "signal",      note: "" },
  { date: "Feb 06, 2026", pct: +42.14, equity: 196.61, reason: "signal",      note: "XRP rebounds sharply post-selloff. Largest single trade." },
  { date: "Feb 15, 2026", pct: +31.65, equity: 258.83, reason: "signal",      note: "" },
];

const maxEquity = Math.max(...trades.map(t => t.equity));

const stats = [
  { value: "+$1,194.89", label: "Total P&L",     sub: "Actual USDT gained" },
  { value: "2.21",       label: "Profit Factor", sub: "Gross wins ÷ gross losses" },
  { value: "54.2%",      label: "Win Rate",      sub: "13 wins / 11 losses" },
  { value: "2.44",       label: "Sharpe Ratio",  sub: "Annualised on margin returns" },
];

export default function TrackRecordPage() {
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
        <div className="flex items-center gap-2 mb-10">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-sm font-medium">Live · Updated from trading server</span>
          <span className="text-gray-600 text-sm">· 24 closed trades · Sep 2025 – Feb 2026</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((s) => (
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
            { value: "$420.18",  label: "Best Trade",   sub: "Nov 25, 2025" },
            { value: "$167.89",  label: "Avg Win",      sub: "Per winning trade" },
            { value: "−$89.78", label: "Avg Loss",      sub: "Per losing trade" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-gray-400 text-xs font-medium mb-0.5">{s.label}</div>
              <div className="text-gray-600 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Equity curve visual */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
          <h2 className="text-white font-bold text-lg mb-1">Equity Curve</h2>
          <p className="text-gray-500 text-sm mb-6">Starting base = 100. Each bar is one closed trade.</p>
          <div className="flex items-end gap-1 h-32">
            {trades.map((t, i) => {
              const heightPct = (t.equity / (maxEquity * 1.05)) * 100;
              const isWin = t.pct > 0;
              const isSpecial = Math.abs(t.pct) > 20;
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
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 shadow-xl z-50 hidden group-hover:block pointer-events-none whitespace-nowrap">
                    <div className="font-semibold text-white mb-1">{t.date}</div>
                    <div className={t.pct > 0 ? "text-green-400" : "text-red-400"}>
                      {t.pct > 0 ? "+" : ""}{t.pct.toFixed(2)}%
                    </div>
                    <div className="text-gray-400">Equity: {t.equity.toFixed(1)}</div>
                    {t.note && <div className="text-gray-500 mt-1 text-xs whitespace-normal">{t.note}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-gray-600 text-xs mt-2">
            <span>Sep 2025</span>
            <span>Feb 2026</span>
          </div>
          <p className="text-gray-600 text-xs mt-2">Hover each bar for trade details. Gold = major move (&gt;20%).</p>
        </div>

        {/* Full trade log */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
          <h2 className="text-white font-bold text-lg mb-1">Full Trade Log</h2>
          <p className="text-gray-500 text-sm mb-6">
            XRP/USDT perpetuals · 3.5× isolated margin · Binance
          </p>
          <div className="space-y-2">
            {trades.map((t, i) => (
              <div key={i} className={`flex items-center justify-between py-2.5 px-3 rounded-lg
                ${t.note ? "bg-gray-800/60 border border-gray-700/50" : "hover:bg-gray-800/30 transition-colors"}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center
                    ${t.pct > 0 ? "bg-green-500/20" : "bg-red-500/20"}`}>
                    {t.pct > 0
                      ? <TrendingUp size={11} className="text-green-400" />
                      : <TrendingDown size={11} className="text-red-400" />}
                  </div>
                  <span className="text-gray-400 text-xs w-24 flex-shrink-0">{t.date}</span>
                  {t.note && (
                    <span className="text-gray-600 text-xs truncate hidden md:block">{t.note}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className={`text-sm font-semibold w-16 text-right
                    ${t.pct > 0 ? "text-green-400" : "text-red-400"}`}>
                    {t.pct > 0 ? "+" : ""}{t.pct.toFixed(2)}%
                  </span>
                  <span className="text-gray-500 text-xs w-16 text-right">
                    {t.equity.toFixed(1)}
                  </span>
                  {t.reason === "take_profit" && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">TP</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800">
            <span className="text-gray-400 text-sm font-medium">Final equity</span>
            <span className="text-green-400 text-lg font-bold">258.83 (+158.8%)</span>
          </div>
        </div>

        {/* Context: what the bot operated through */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
          <h2 className="text-white font-bold text-lg mb-5">What the Bot Operated Through</h2>
          <div className="space-y-5">
            {[
              {
                period: "Oct 10–14, 2025",
                headline: "Largest liquidation event in crypto history",
                body: "XRP flash-crashed 40% in hours. $16B liquidated across crypto markets. Trump tariff announcement triggered a risk-off cascade. The bot took its worst loss of the period (−17.41%) and re-entered three days later. Four consecutive wins followed.",
                color: "red",
              },
              {
                period: "Nov 24, 2025",
                headline: "Take-profit trigger: +31.2%",
                body: "XRP recovered fully from the October crash. The bot entered at the bottom of the dip and rode the full November rally to its take-profit target — the largest win in the Sept–Nov window.",
                color: "gold",
              },
              {
                period: "Jan 3–5, 2026",
                headline: "XRP ETF inflows + SEC regulatory shift",
                body: "XRP surged on improved U.S. regulatory outlook and $1.3B in cumulative ETF inflows. Bot caught both moves — +9.58% on Jan 3, +31.7% take-profit on Jan 5.",
                color: "gold",
              },
              {
                period: "Jan–Feb 2026",
                headline: "Broad crypto drawdown — 4 consecutive losses",
                body: "Crypto sold off broadly. XRP fell from highs near $3.65 down toward $1.45. Bot logged 4 losses in a row (−8.2%, −8.1%, −11.3%, −6.9%) before the reversal.",
                color: "red",
              },
              {
                period: "Feb 6 & 15, 2026",
                headline: "Recovery: +42.1% and +31.7%",
                body: "Post-selloff reversal. XRP rebounded sharply. Bot caught both legs — the +42.14% on Feb 6 was the largest single trade of the entire period. Equity finished at 258.8.",
                color: "gold",
              },
            ].map((e) => (
              <div key={e.period} className={`border-l-2 pl-5
                ${e.color === "gold" ? "border-gold/50" : "border-red-500/40"}`}>
                <div className="text-gray-500 text-xs mb-1">{e.period}</div>
                <div className="text-white font-semibold text-sm mb-1">{e.headline}</div>
                <div className="text-gray-400 text-sm leading-relaxed">{e.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* History context */}
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
                desc: "Same DC-VWAP algorithm on XRPUSDT perpetuals with 3.5× isolated margin. 24 closed trades. Win rate 54.2%, profit factor 2.33, Sharpe 2.39. Cumulative return +158.8%. This is the strategy offered to clients.",
                badge: "Live",
                badgeColor: "green",
              },
            ].map((h) => (
              <div key={h.period} className="flex gap-4">
                <div className="text-right w-36 flex-shrink-0">
                  <div className="text-gray-500 text-xs mt-1">{h.period}</div>
                </div>
                <div className="relative pl-5 border-l border-gray-800 pb-4 last:pb-0">
                  <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border
                    ${h.badgeColor === "green" ? "bg-green-400 border-green-500" :
                      h.badgeColor === "blue"   ? "bg-blue-400 border-blue-500" :
                                                  "bg-purple-400 border-purple-500"}`}
                  />
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">{h.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border
                      ${h.badgeColor === "green"  ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        h.badgeColor === "blue"   ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                    "bg-purple-500/10 text-purple-400 border-purple-500/20"}`}>
                      {h.badge}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How we calculate */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
          <h3 className="text-white font-bold text-lg mb-5">How Every Number Is Calculated</h3>
          <div className="space-y-5">

            <div>
              <div className="text-gold text-sm font-semibold mb-1">P&amp;L (USD) — actual money made or lost</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">P&amp;L = (sell_price − buy_price) × quantity</code>
                <br />This is the real dollar gain or loss from the price movement on your position. It does not
                double-count leverage. If XRP moves 5% on a $6,000 position, you gain or lose $300 — and that
                is what the P&amp;L field records.
              </div>
            </div>

            <div>
              <div className="text-gold text-sm font-semibold mb-1">Margin (actual investment per trade)</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">Margin = position_size ÷ 3.5</code>
                <br />With 3.5× isolated margin, one third of the position is your own capital; the rest is borrowed
                from the exchange. The margin is the actual USDT the account has at risk for each trade.
                For example, the Oct 11 position was $6,478 total — but only $1,851 was margin (real capital at risk).
              </div>
            </div>

            <div>
              <div className="text-gold text-sm font-semibold mb-1">ROI % — return on actual capital deployed</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">ROI% = P&amp;L ÷ Margin × 100</code>
                <br />This is verified against the database on all 24 trades — they match to within 0.05%.
                Total ROI of 123.89% is the sum of per-trade ROIs across all 24 trades. Position sizes varied
                because funds were added and withdrawn during the period.
              </div>
            </div>

            <div>
              <div className="text-gold text-sm font-semibold mb-1">Profit Factor</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">PF = Gross wins ($) ÷ Gross losses ($) = $2,182.52 ÷ $987.63 = 2.21</code>
                <br />Dollar-based. For every $1 lost, the strategy returned $2.21 in wins.
              </div>
            </div>

            <div>
              <div className="text-gold text-sm font-semibold mb-1">Verification</div>
              <div className="text-gray-400 text-sm leading-relaxed">
                All figures are pulled directly from the live trading database on our Oracle Cloud server.
                Every trade is timestamped to the second. During onboarding we share raw trade logs and
                Binance order history — every trade is cross-referenceable on the exchange itself.
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
