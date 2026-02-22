import Link from "next/link";
import { TrendingUp, Shield, BarChart2, ArrowRight, Zap, Lock } from "lucide-react";

const stats = [
  { label: "AUM (Pilot)", value: "$50k+" },
  { label: "Live Trading", value: "18+ mo" },
  { label: "Sharpe Ratio", value: "3.36" },
  { label: "Fee Model", value: "Perf. Only" },
];

const features = [
  {
    icon: <TrendingUp className="text-gold" size={24} />,
    title: "Algorithmic Precision",
    desc: "Fully systematic strategies — no emotional decisions. Every trade is rules-based and back-tested.",
  },
  {
    icon: <Shield className="text-gold" size={24} />,
    title: "Risk-First Approach",
    desc: "Strict position sizing, stop-losses, and drawdown limits protect capital in all market conditions.",
  },
  {
    icon: <BarChart2 className="text-gold" size={24} />,
    title: "Transparent Reporting",
    desc: "Real-time dashboard. View your balance, P&L, open positions, and full trade history anytime.",
  },
  {
    icon: <Zap className="text-gold" size={24} />,
    title: "24/7 Execution",
    desc: "Bots run around the clock across crypto and equity markets. No missed opportunities.",
  },
  {
    icon: <Lock className="text-gold" size={24} />,
    title: "Your Funds, Your Control",
    desc: "Capital stays in your own brokerage account. We trade via API — you retain full custody.",
  },
  {
    icon: <ArrowRight className="text-gold" size={24} />,
    title: "Performance Fee Only",
    desc: "We only make money when you do. No management fees. No monthly charges.",
  },
];

const steps = [
  { n: "01", title: "Schedule a Call", desc: "Book a 30-minute intro call. We discuss your goals, risk appetite, and account size." },
  { n: "02", title: "Sign Agreements", desc: "NDA and pilot agreement signed. You open your own brokerage/exchange account." },
  { n: "03", title: "API Access", desc: "You grant trade-only API access. We never touch withdrawals." },
  { n: "04", title: "Bot Goes Live", desc: "Strategy deployed. You get dashboard access to track every trade in real time." },
  { n: "05", title: "Monthly Reports", desc: "Detailed performance report every month. Performance fee charged on profits only." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-gold-light text-sm mb-8">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            Live trading — pilot phase active
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Systematic Returns.<br />
            <span className="gradient-text">Algorithmic Edge.</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Arcus Quant Fund deploys data-driven trading bots across crypto and equity markets.
            Your capital stays in your account — we provide the alpha.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="px-8 py-4 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight size={18} />
            </Link>
            <Link
              href="/how-it-works"
              className="px-8 py-4 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-xl transition-colors"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-gray-500 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-4">Why Arcus</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Built by a quant researcher. Designed for serious capital.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gold/30 transition-colors">
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works preview */}
      <section className="px-6 pb-24 bg-gray-950/50">
        <div className="max-w-3xl mx-auto py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-gray-400">From intro call to live trading in under a week.</p>
          </div>
          <div className="flex flex-col gap-6">
            {steps.map((s, i) => (
              <div key={s.n} className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold font-bold text-sm">
                  {s.n}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors"
            >
              Schedule Your Call <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
