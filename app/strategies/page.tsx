import Link from "next/link";
import { ArrowRight, TrendingUp, Activity, BarChart2, Globe, Repeat2, Newspaper, Zap, Layers, Brain } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Revalidate every 60 seconds — matches sync script interval
export const revalidate = 60;

async function getDCVWAPStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
  const { data } = await supabase
    .from("performance_stats")
    .select("sharpe_ratio, profit_factor, win_rate, total_trades, period_start")
    .eq("client_id", "eth")
    .single();
  return data;
}

export default async function StrategiesPage() {
  const liveStats = await getDCVWAPStats();

  const sharpe      = liveStats?.sharpe_ratio  ?? 2.44;
  const pf          = liveStats?.profit_factor ?? 2.21;
  const winRate     = liveStats?.win_rate      ?? 54.2;
  const totalTrades = liveStats?.total_trades  ?? 24;
  const liveSince   = liveStats?.period_start
    ? new Date(liveStats.period_start + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Sep 2025";

  const strategies = [
  {
    icon: <TrendingUp size={24} className="text-gold" />,
    name: "DC-VWAP Trend Follower",
    market: "Crypto Perpetual Futures",
    exchange: "Binance · Bybit",
    type: "Trend Following",
    timeframe: "Intraday",
    status: "Live",
    description:
      "Directional Change (DC) algorithm combined with VWAP and EMA filters. Captures momentum moves in high-liquidity crypto pairs across 24/7 markets. Designed to cut losers fast and let winners run — low win rate, high profit factor. Runs continuously on cloud infrastructure with no human intervention.",
    metrics: [
      { label: "Sharpe Ratio", value: sharpe.toFixed(2) },
      { label: "Profit Factor", value: pf.toFixed(2) },
      { label: "Win Rate", value: `${winRate.toFixed(1)}%` },
      { label: "Live Since", value: liveSince },
    ],
    note: `${totalTrades} closed trades · XRP/USDT perpetuals · 3.5× isolated margin · Binance. Full trade log on Track Record page.`,
  },
  {
    icon: <Activity size={24} className="text-gold" />,
    name: "OI-Directional Options Flow",
    market: "US Equity Options",
    exchange: "Interactive Brokers",
    type: "Directional Momentum",
    timeframe: "Daily",
    status: "Research",
    description:
      "Based on peer-reviewed academic research on open interest as a hidden trend signal. Identifies directional bias from option OI distribution and trades the underlying equity. Strong long bias aligned with structural equity drift. Designed for clients on Interactive Brokers with options access.",
    metrics: [
      { label: "Long Bias", value: "73%" },
      { label: "Basis", value: "OI Signal" },
      { label: "Universe", value: "S&P 500" },
      { label: "Holding", value: "1-5 days" },
    ],
    note: "Based on peer-reviewed academic research. Paper under review. Deployment via Interactive Brokers API.",
  },
  {
    icon: <BarChart2 size={24} className="text-gold" />,
    name: "DSE Multi-Bot System",
    market: "Bangladesh Equities",
    exchange: "Dhaka Stock Exchange",
    type: "Systematic Intraday",
    timeframe: "Intraday",
    status: "Origin",
    description:
      "Where our systematic trading began. We built and deployed 25+ simultaneous intraday bots on the Dhaka Stock Exchange — a market with no broker API, T+2 settlement, no short selling, and a 20-year structural decline. We automated execution through browser-level technology and validated strategies across 400+ DSE-listed stocks and 10+ years of historical data. The system made money in one of the hardest possible environments. That proof of concept drove our expansion into global, more liquid markets.",
    metrics: [
      { label: "Concurrent Bots", value: "25+" },
      { label: "Universe", value: "400+ stocks" },
      { label: "Backtest", value: "10+ yrs" },
      { label: "Market Bias", value: "20yr decline" },
    ],
    note: "Our origin system. Demonstrated strategy robustness in an illiquid, API-free market before expansion to global assets.",
  },
];

const statusColor: Record<string, string> = {
  Live: "bg-green-500/10 text-green-400 border-green-500/20",
  Research: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Development: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Origin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Coming Soon": "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const comingSoon = [
  {
    icon: <Repeat2 size={20} className="text-gold" />,
    name: "Mean Reversion Bot",
    desc: "Fades overextended moves back to statistical equilibrium. Uses z-score deviation from rolling mean to time counter-trend entries in high-liquidity pairs.",
  },
  {
    icon: <Newspaper size={20} className="text-gold" />,
    name: "Market News Bot",
    desc: "Ingests real-time financial news feeds and executes on sentiment signals before price fully adjusts. NLP-driven with configurable asset universe.",
  },
  {
    icon: <Zap size={20} className="text-gold" />,
    name: "Flash Crash Detector",
    desc: "Detects flash crashes in real time using abnormal price velocity and liquidity vacuum signals. Once the crash is confirmed, enters a high-leverage long position to capture the sharp recovery move as price snaps back.",
  },
  {
    icon: <Layers size={20} className="text-gold" />,
    name: "Multi-Timeframe Bot",
    desc: "Requires trend alignment across 4h, 1h, and 15m before entry. Reduces false positives significantly — only trades when all timeframe signals agree.",
  },
  {
    icon: <Brain size={20} className="text-gold" />,
    name: "Regime Detection System",
    desc: "Classifies market state as trending, mean-reverting, or high-volatility using hidden Markov models. Routes order flow to the appropriate sub-strategy for the current regime.",
  },
];

const platforms = [
  { name: "Binance", type: "Crypto", supports: ["Spot", "Perpetuals", "Margin"] },
  { name: "Bybit", type: "Crypto", supports: ["Spot", "Perpetuals", "Margin"] },
  { name: "Coinbase", type: "Crypto", supports: ["Spot", "Advanced Trade"] },
  { name: "Interactive Brokers", type: "Equities & Options", supports: ["Stocks", "Options", "Futures", "Forex"] },
  { name: "Alpaca", type: "US Equities", supports: ["Stocks", "Crypto"] },
  { name: "MT4 / MT5", type: "Forex & CFDs", supports: ["Forex", "Commodities", "Indices"] },
];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Our <span className="gradient-text">Strategies</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Every strategy is developed through rigorous backtesting and walk-forward validation before
            touching real capital. We started in one of the world&apos;s hardest markets — and expanded from there.
          </p>
        </div>

        {/* Evolution callout */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-10">
          <h2 className="text-white font-bold text-lg mb-3">Built in a Hard Market First</h2>
          <p className="text-gray-400 leading-relaxed">
            Our systematic trading began on the Dhaka Stock Exchange — a market that has been in structural
            decline for over 20 years, with no short selling, T+2 settlement delays, and no broker API
            access. We built automation layer by layer. The bots worked even there.
          </p>
          <p className="text-gray-400 leading-relaxed mt-3">
            That proof of concept gave us the conviction to expand into more liquid, better-capitalised
            global markets — crypto perpetuals, US equities, options, and beyond. Today our systems are
            <strong className="text-white"> broker-agnostic</strong>: deployable on any institutional platform that
            offers leverage, margin, and proper API access.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mb-10">
          <p className="text-yellow-500/80 text-sm">
            <strong>Disclaimer:</strong> Sharpe and Profit Factor figures for DC-VWAP are from live trading. Other metrics are from backtests and research.
            Past performance does not guarantee future results. Trading involves significant risk of loss.
          </p>
        </div>

        {/* Strategy cards */}
        <div className="flex flex-col gap-8 mb-16">
          {strategies.map((s) => (
            <div key={s.name} className="bg-gray-900 border border-gray-800 rounded-2xl p-7 hover:border-gold/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                    {s.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{s.name}</h3>
                    <p className="text-gray-500 text-sm">{s.market} · {s.exchange}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full border text-xs font-medium ${statusColor[s.status]}`}>
                  {s.status}
                </span>
              </div>

              <p className="text-gray-400 leading-relaxed mb-6">{s.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {s.metrics.map((m) => (
                  <div key={m.label} className="bg-gray-800/60 rounded-lg p-3 text-center">
                    <div className="text-white font-bold text-sm mb-0.5">{m.value}</div>
                    <div className="text-gray-500 text-xs">{m.label}</div>
                  </div>
                ))}
              </div>

              <p className="text-gray-600 text-xs">{s.note}</p>
            </div>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-white font-bold text-xl">In Development</h2>
            <span className="px-2.5 py-0.5 rounded-full border text-xs font-medium bg-amber-500/10 text-amber-400 border-amber-500/20">
              Coming Soon
            </span>
          </div>
          <p className="text-gray-500 text-sm mb-6">
            Strategies currently in research and backtesting. Each goes through the same full validation cycle before any live capital is deployed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comingSoon.map((s) => (
              <div key={s.name} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-amber-500/20 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                    {s.icon}
                  </div>
                  <span className="text-white font-semibold text-sm">{s.name}</span>
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bespoke / Broker-Agnostic section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Globe size={24} className="text-gold" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Bespoke Client Configurations</h2>
              <p className="text-gray-500 text-sm">Broker-agnostic · Built around your platform</p>
            </div>
          </div>

          <p className="text-gray-400 leading-relaxed mb-6">
            Our strategies are not locked to a single exchange. If your broker supports the instruments
            our system requires — leverage, margin, derivatives, and API access — we can configure a
            bespoke bot for your account. We work across institutional platforms covering crypto,
            equities, options, forex, commodities, and indices.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {platforms.map((p) => (
              <div key={p.name} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gold/20 transition-colors">
                <div className="text-white font-semibold text-sm mb-1">{p.name}</div>
                <div className="text-gray-500 text-xs mb-2">{p.type}</div>
                <div className="flex flex-wrap gap-1">
                  {p.supports.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-gray-600 text-xs mt-4">
            Don&apos;t see your platform? Contact us — if it has a proper trading API with leverage and margin support, we can likely configure it.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gold/10 border border-gold/20 rounded-2xl p-8 text-center mb-16">
          <h3 className="text-2xl font-bold text-white mb-3">Want a Bespoke Setup?</h3>
          <p className="text-gray-400 mb-6">
            Tell us your broker and capital size. We&apos;ll let you know if we can configure a strategy for your account.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors"
          >
            Get in Touch <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
