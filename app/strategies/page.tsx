import Link from "next/link";
import { ArrowRight, TrendingUp, Activity, BarChart2 } from "lucide-react";

const strategies = [
  {
    icon: <TrendingUp size={24} className="text-gold" />,
    name: "DC-VWAP Trend Follower",
    market: "Crypto Perpetual Futures",
    exchange: "Binance / Bybit",
    type: "Trend Following",
    timeframe: "Intraday",
    status: "Live",
    description:
      "Directional Change (DC) algorithm combined with VWAP and EMA filters. Captures momentum moves in high-liquidity crypto pairs. Designed to cut losers fast and let winners run — low win rate but high profit factor.",
    metrics: [
      { label: "Sharpe Ratio", value: "3.36" },
      { label: "Profit Factor", value: "1.77" },
      { label: "Win Rate", value: "38%" },
      { label: "Live Since", value: "18+ mo" },
    ],
    note: "Live on XRP/USDT with isolated margin. 1,017+ trades logged over 90-day window.",
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
      "Based on peer-reviewed academic research on open interest as a hidden trend signal. Identifies directional bias from option OI distribution and trades the underlying. Strong long bias (73%) aligned with equity drift.",
    metrics: [
      { label: "Long Bias", value: "73%" },
      { label: "Basis", value: "OI Signal" },
      { label: "Universe", value: "S&P 500" },
      { label: "Holding", value: "1-5 days" },
    ],
    note: "Based on peer-reviewed academic research. Paper under review.",
  },
  {
    icon: <BarChart2 size={24} className="text-gold" />,
    name: "Quant Equity Screener",
    market: "Bangladesh DSE",
    exchange: "Dhaka Stock Exchange",
    type: "Factor Investing",
    timeframe: "Weekly",
    status: "Development",
    description:
      "Multi-factor quantitative screener for DSE equities. Combines momentum, value, and quality factors to rank stocks. Designed as a systematic approach to an inefficient emerging market.",
    metrics: [
      { label: "Universe", value: "DSE All" },
      { label: "Factors", value: "3+" },
      { label: "Rebalance", value: "Weekly" },
      { label: "Approach", value: "Long Only" },
    ],
    note: "In development. Not yet live.",
  },
];

const statusColor: Record<string, string> = {
  Live: "bg-green-500/10 text-green-400 border-green-500/20",
  Research: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Development: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export default function StrategiesPage() {
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
            touching real capital.
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

        {/* CTA */}
        <div className="bg-gold/10 border border-gold/20 rounded-2xl p-8 text-center mb-16">
          <h3 className="text-2xl font-bold text-white mb-3">Want to Know More?</h3>
          <p className="text-gray-400 mb-6">
            We share detailed strategy documentation with serious investors during the onboarding call.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors"
          >
            Schedule a Call <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
