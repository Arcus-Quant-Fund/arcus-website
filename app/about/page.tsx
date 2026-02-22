import Link from "next/link";
import { ArrowRight, BookOpen, TrendingUp, Award } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            About <span className="gradient-text">Arcus</span>
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed max-w-2xl">
            A quant-driven trading operation built on research, automation, and systematic execution.
          </p>
        </div>

        {/* Founder section */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-10">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gold flex items-center justify-center text-white font-bold text-2xl">
              S
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Shehzad Ahmed</h2>
              <p className="text-gold text-sm font-medium mb-4">Founder & Fund Manager</p>
              <p className="text-gray-400 leading-relaxed mb-4">
                Quantitative researcher and algorithmic trader with 18+ months of live trading experience across
                crypto and equity markets. Builds and deploys fully automated trading systems grounded in
                statistical research and robust risk management.
              </p>
              <p className="text-gray-400 leading-relaxed">
                Background in quantitative finance research spanning crypto derivatives and market microstructure.
                Focused on building institutional-grade strategies grounded in statistical rigor and
                academic literature.
              </p>
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {[
            {
              icon: <TrendingUp className="text-gold" size={20} />,
              title: "18+ Months Live",
              desc: "Real capital deployed in live markets — not just backtests.",
            },
            {
              icon: <BookOpen className="text-gold" size={20} />,
              title: "Research-Backed",
              desc: "Strategies rooted in peer-reviewed academic research.",
            },
            {
              icon: <Award className="text-gold" size={20} />,
              title: "Quant Research",
              desc: "Strategies grounded in academic finance literature and statistical analysis.",
            },
          ].map((c) => (
            <div key={c.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="mb-3">{c.icon}</div>
              <h3 className="text-white font-semibold mb-1">{c.title}</h3>
              <p className="text-gray-400 text-sm">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* What we do */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">What Arcus Does</h2>
          <div className="space-y-4 text-gray-400 leading-relaxed">
            <p>
              Arcus Quant Fund manages client capital through algorithmic trading strategies across cryptocurrency
              perpetual futures and equity markets. Every strategy is developed through rigorous backtesting,
              walk-forward validation, and Monte Carlo simulation before deployment with real capital.
            </p>
            <p>
              We operate on a performance-fee-only model — we earn nothing unless your account grows. Capital
              stays in your own brokerage or exchange account at all times; we access it only through
              trade-execution API keys that have no withdrawal permissions.
            </p>
            <p>
              Currently in pilot phase with live capital deployed, targeting $150-200k AUM across
              3-5 clients by mid-2026.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gold/10 border border-gold/20 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Interested in Working Together?</h3>
          <p className="text-gray-400 mb-6">We're selectively onboarding new clients. Minimum account size applies.</p>
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
