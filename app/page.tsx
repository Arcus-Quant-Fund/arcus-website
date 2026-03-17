import Link from "next/link";
import { TrendingUp, Shield, BarChart2, ArrowRight, Zap, Lock } from "lucide-react";


const stats = [
  { label: "AUM (Pilot)", value: "$50k+", sub: "Live client capital" },
  { label: "Live Trading", value: "18+ mo", sub: "Continuous uptime" },
  { label: "Sharpe Ratio", value: "3.36", sub: "Annualised, live" },
  { label: "Fee Model", value: "Perf. Only", sub: "35% on net profits" },
];

const features = [
  {
    icon: <TrendingUp className="text-gold" size={20} />,
    title: "Algorithmic Precision",
    desc: "Fully systematic strategies — no emotional decisions. Every trade is rules-based and back-tested.",
  },
  {
    icon: <Shield className="text-gold" size={20} />,
    title: "Risk-First Approach",
    desc: "Strict position sizing, stop-losses, and drawdown limits protect capital in all market conditions.",
  },
  {
    icon: <BarChart2 className="text-gold" size={20} />,
    title: "Transparent Reporting",
    desc: "Real-time dashboard. View your balance, P&L, open positions, and full trade history anytime.",
  },
  {
    icon: <Zap className="text-gold" size={20} />,
    title: "24/7 Execution",
    desc: "Bots run around the clock across crypto and equity markets. No missed opportunities.",
  },
  {
    icon: <Lock className="text-gold" size={20} />,
    title: "Your Funds, Your Control",
    desc: "Capital stays in your own brokerage account. We trade via API — you retain full custody.",
  },
  {
    icon: <ArrowRight className="text-gold" size={20} />,
    title: "Performance Fee Only",
    desc: "We only make money when you do. No management fees. No monthly charges.",
  },
];

const steps = [
  { n: "01", title: "Sign Up Online", desc: "Fill in your details, review agreements, and submit your Binance API keys — all self-service." },
  { n: "02", title: "Instant API Validation", desc: "Our system verifies your Binance permissions in real time. Instant feedback if anything needs adjusting." },
  { n: "03", title: "Bot Activated", desc: "Once approved, your trading bot is deployed automatically. Dashboard credentials emailed to you." },
  { n: "04", title: "Trade & Monitor", desc: "Watch every trade, position, and P&L in real time on your private dashboard." },
  { n: "05", title: "Monthly Reports", desc: "Detailed performance report every month. Performance fee (35%) charged on net profits only." },
];

const tickerItems = [
  { label: "XRP/USDT", value: "+652%", green: true },
  { label: "Sharpe Ratio", value: "7.9", gold: true },
  { label: "Max Drawdown", value: "1.57%" },
  { label: "Profit Factor", value: "5.1×", gold: true },
  { label: "SHIB/USDT", value: "Calmar 7.92", green: true },
  { label: "SOL/USDT", value: "Calmar 3.90", green: true },
  { label: "Bot Uptime", value: "99.97%" },
  { label: "Trade Log", value: "100% Transparent" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-grid overflow-x-hidden relative">
      {/* Ambient orbs */}
      <div className="glow-orb-gold pointer-events-none" style={{ top: "-100px", right: "-100px" }} />
      <div className="glow-orb-blue pointer-events-none" style={{ bottom: "200px", left: "-150px" }} />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="pt-40 pb-24 px-6 relative">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="animate-in">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-gold/8 border border-gold/20 text-sm font-medium text-gold mb-8">
              <span className="live-dot" />
              Live trading — pilot phase active
            </div>

            <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6">
              Systematic<br />
              Returns.<br />
              <span className="gradient-text">Algorithmic</span><br />
              Edge.
            </h1>

            <p className="text-lg text-gray-400 max-w-md mb-10 leading-relaxed">
              Arcus Quant Fund deploys data-driven trading bots across crypto and equity markets.
              Your capital stays in your account — we provide the alpha.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gold hover:bg-gold-dark text-black font-semibold rounded-xl transition-all hover:shadow-[0_6px_24px_rgba(248,172,7,0.35)] hover:-translate-y-0.5"
              >
                Get Started <ArrowRight size={17} />
              </Link>
              <Link
                href="/track-record"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-xl transition-colors"
              >
                View Track Record
              </Link>
            </div>
          </div>

          {/* Right — animated chart visual */}
          <div className="hidden lg:block animate-in animate-delay-2">
            <div className="relative">
              {/* Glow behind chart */}
              <div className="absolute inset-0 bg-gold/5 rounded-3xl blur-2xl" />
              <div className="relative bg-gray-900/60 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm">
                {/* Chart header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-gray-500 font-medium">XRP/USDT · Live Strategy</div>
                    <div className="text-2xl font-bold text-white mt-0.5">Equity Index</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Return</div>
                    <div className="text-xl font-bold text-green-400">+138%+</div>
                  </div>
                </div>
                {/* SVG chart */}
                <svg viewBox="0 0 480 160" className="w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f8ac07" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#f8ac07" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 140 C30 138 60 136 90 132 C120 128 150 130 180 122 C210 114 240 118 270 108 C300 98 330 88 360 72 C390 58 420 46 450 32 C465 25 472 22 480 18 L480 160 L0 160 Z"
                    fill="url(#heroGrad)"
                  />
                  <path
                    d="M0 140 C30 138 60 136 90 132 C120 128 150 130 180 122 C210 114 240 118 270 108 C300 98 330 88 360 72 C390 58 420 46 450 32 C465 25 472 22 480 18"
                    stroke="#f8ac07"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* End dot */}
                  <circle cx="480" cy="18" r="4" fill="#f8ac07" />
                  <circle cx="480" cy="18" r="8" fill="#f8ac07" opacity="0.3" />
                </svg>
                {/* Mini stats row */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: "Sharpe", value: "3.36" },
                    { label: "Win Rate", value: "54.2%" },
                    { label: "Profit Factor", value: "2.21×" },
                  ].map((m) => (
                    <div key={m.label} className="bg-gray-800/50 rounded-xl p-3 text-center">
                      <div className="text-white font-bold text-sm">{m.value}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ────────────────────────────────────────────────── */}
      <div className="border-y border-gray-800/60 py-4 overflow-hidden">
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 flex-shrink-0 whitespace-nowrap">
              <span className="text-gray-600 text-sm font-medium">{item.label}</span>
              <span className={`text-sm font-bold ${
                item.green ? "text-green-400" : item.gold ? "text-gold" : "text-gray-300"
              }`}>{item.value}</span>
              <span className="text-gray-800 mx-4">·</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────────── */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-800/40 rounded-2xl overflow-hidden border border-gray-800/60">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`animate-in animate-delay-${i + 1} bg-gray-900/50 hover:bg-gray-900/80 transition-colors p-7 text-center group`}
            >
              <div className="text-3xl font-black text-white mb-1 group-hover:text-gold transition-colors">
                {s.value}
              </div>
              <div className="text-sm font-semibold text-gray-300 mb-0.5">{s.label}</div>
              <div className="text-xs text-gray-600">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 animate-in">
            <div className="text-xs font-semibold tracking-widest uppercase text-gold mb-3">Why Arcus</div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
              Built by a Quant.<br />
              <span className="gradient-text">Designed for Capital.</span>
            </h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Institutional-grade infrastructure accessible to serious investors.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`animate-in animate-delay-${(i % 3) + 1} group bg-gray-900/60 border border-gray-800 rounded-2xl p-6 hover:border-gold/25 hover:-translate-y-1 transition-all duration-300 cursor-default`}
              >
                <div className="w-10 h-10 rounded-xl bg-gold/8 border border-gold/15 flex items-center justify-center mb-4 group-hover:bg-gold/12 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold mb-2 text-sm">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14 animate-in">
            <div className="text-xs font-semibold tracking-widest uppercase text-gold mb-3">Process</div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
              Live in Under 24 Hours
            </h2>
            <p className="text-gray-400">Self-service signup to live trading — fully guided, fully automated.</p>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-6 bottom-6 w-px bg-gradient-to-b from-gold/40 via-gray-800 to-transparent hidden md:block" />

            <div className="flex flex-col gap-5">
              {steps.map((s, i) => (
                <div
                  key={s.n}
                  className={`animate-in animate-delay-${i + 1} flex gap-5 items-start group`}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 border border-gold/30 group-hover:border-gold/60 group-hover:bg-gold/8 flex items-center justify-center text-gold font-bold text-xs transition-all relative z-10">
                    {s.n}
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 group-hover:border-gray-700 rounded-2xl p-5 flex-1 transition-colors">
                    <h3 className="text-white font-semibold text-sm mb-1">{s.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-black font-semibold rounded-xl transition-all hover:shadow-[0_6px_24px_rgba(248,172,7,0.35)] hover:-translate-y-0.5"
            >
              Start Now <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl border border-gold/15 bg-gradient-to-br from-gold/5 via-transparent to-brand-blue/5 p-12 text-center overflow-hidden animate-in">
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="text-xs font-semibold tracking-widest uppercase text-gold mb-4">Ready?</div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
                Your Capital.<br />
                <span className="gradient-text">Our Algorithm.</span>
              </h2>
              <p className="text-gray-400 max-w-md mx-auto mb-8">
                Start with $1,000 on our Pilot Programme — verify real returns before committing more.
                Performance fee only. Your funds stay in your account.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-gold hover:bg-gold-dark text-black font-semibold rounded-xl transition-all hover:shadow-[0_6px_24px_rgba(248,172,7,0.35)]"
                >
                  Apply to Invest <ArrowRight size={17} />
                </Link>
                <Link
                  href="/track-record"
                  className="inline-flex items-center gap-2 px-7 py-3.5 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-xl transition-colors"
                >
                  View Track Record
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
