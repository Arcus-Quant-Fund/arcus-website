import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

export default function TrackRecordPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Track <span className="gradient-text">Record</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Verified performance data from live trading.
          </p>
        </div>

        {/* Current status */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-10 text-center">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Clock className="text-gold" size={28} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Building the Track Record</h2>
          <p className="text-gray-400 leading-relaxed max-w-lg mx-auto mb-6">
            We have 18+ months of live trading history. We are currently accumulating 6 months of
            clean, third-party-verifiable performance data on our pilot account before publishing
            detailed results.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold-light text-sm">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            Pilot active — publishing Q3 2026
          </div>
        </div>

        {/* Live performance metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { value: "3.36", label: "Sharpe Ratio", sub: "Live trading" },
            { value: "1.77", label: "Profit Factor", sub: "Live trading" },
            { value: "1,017+", label: "Trades (90-day)", sub: "XRP/USDT" },
            { value: "18+ mo", label: "Live History", sub: "Real capital" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-gold mb-1">{s.value}</div>
              <div className="text-white text-sm font-medium mb-0.5">{s.label}</div>
              <div className="text-gray-500 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* What we have */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {[
            { value: "18+", label: "Months Live Trading", sub: "Real capital, live markets" },
            { value: "$50k+", label: "Pilot AUM", sub: "Active pilot account" },
            { value: "Q3 2026", label: "Full Data Release", sub: "6-month verified period" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-gold mb-1">{s.value}</div>
              <div className="text-white text-sm font-medium mb-1">{s.label}</div>
              <div className="text-gray-500 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Transparency note */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-14">
          <h3 className="text-white font-bold text-lg mb-4">Why We Wait to Publish</h3>
          <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
            <p>
              Any fund can cherry-pick 2-3 good months. We are waiting for a full 6-month window of
              clean data from a single consistent strategy deployment before publishing performance metrics.
            </p>
            <p>
              This gives prospective clients a statistically meaningful sample — enough to evaluate
              the strategy's behavior across different market conditions.
            </p>
            <p>
              During your onboarding call, we share raw trade logs and account statements directly.
              No aggregated or doctored numbers.
            </p>
          </div>
        </div>

        {/* Client dashboard preview */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-14">
          <h3 className="text-white font-bold text-lg mb-2">Client Dashboard (Live)</h3>
          <p className="text-gray-400 text-sm mb-6">
            Active clients can monitor their account in real time. No need to log into the exchange.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Balance", value: "—" },
              { label: "Total P&L", value: "—" },
              { label: "Monthly P&L", value: "—" },
              { label: "Win Rate", value: "—" },
            ].map((m) => (
              <div key={m.label} className="bg-gray-800/60 rounded-lg p-4 text-center">
                <div className="text-white font-bold text-xl mb-0.5">{m.value}</div>
                <div className="text-gray-500 text-xs">{m.label}</div>
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-xs mt-3">Live data shown to authenticated clients only.</p>
        </div>

        {/* CTA */}
        <div className="text-center mb-20">
          <p className="text-gray-400 mb-4">
            Interested in joining as a pilot client? We review applications individually.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors"
          >
            Apply for Pilot Access <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
