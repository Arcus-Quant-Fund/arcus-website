import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, TrendingUp, Award, Users } from "lucide-react";


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
            A quant-driven trading operation built on research, automation, and systematic execution —
            led by a team combining computational finance and decades of academic and investment expertise.
          </p>
        </div>

        {/* Team */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <Users size={18} className="text-gold" />
            <h2 className="text-white font-bold text-lg">The Team</h2>
          </div>

          <div className="flex flex-col gap-6">

            {/* Shehzad */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden">
                  <Image src="/founder.jpg" alt="Shehzad Ahmed" width={80} height={80} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Shehzad Ahmed</h2>
                  <p className="text-gold text-sm font-medium mb-4">Founder & CEO · Computational Finance</p>
                  <p className="text-gray-400 leading-relaxed mb-4">
                    Finance major with a Computer Science Engineering minor specialising in Big Data &
                    High-Performance Computing (IUB). Builds and operates fully automated trading
                    systems — strategy research, backtesting, execution engines, cloud infrastructure,
                    and client dashboard.
                  </p>
                  <p className="text-gray-400 leading-relaxed mb-4">
                    18+ months of live systematic trading across crypto perpetual futures and equity
                    markets. Industry experience spans audit, asset management, quantitative research,
                    and decentralised finance — providing a full-stack understanding of how capital
                    is deployed, risk is managed, and performance is verified across both traditional
                    and on-chain markets.
                  </p>
                </div>
              </div>
            </div>

            {/* Dr. Bhuyan — commented out pending permission
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-20 h-20 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl font-bold text-gold">
                  RB
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Dr. Rafiqul Bhuyan</h2>
                  <p className="text-gold text-sm font-medium mb-4">Co-Founder & Strategic Advisor · Academic Finance</p>
                  <p className="text-gray-400 leading-relaxed mb-4">
                    Associate Professor of Finance & Economics at A&M University Alabama and Adjunct Professor
                    at Independent University Bangladesh. PhD in Economics, Concordia University (Montreal).
                    MS Finance, University of Illinois. Author of 80+ peer-reviewed journal articles in
                    finance, economics, and entrepreneurship. Fulbright Scholar. Twice recipient of
                    the Outstanding Researcher Award, California State University.
                  </p>
                  <p className="text-gray-400 leading-relaxed">
                    Brings decades of academic research, institutional finance expertise, and private fund
                    management experience to the venture. Former Purcell Chair Professor at Le Moyne College
                    (New York) and faculty at USC, UC Davis, UC Riverside, Northeastern University, and
                    the American University of Kuwait.
                  </p>
                </div>
              </div>
            </div>
            */}

            {/* Jahidul */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-20 h-20 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl font-bold text-gold">
                  JIB
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-1">Md. Jahidul Islam Bhuiya</h2>
                  <p className="text-gold text-sm font-medium mb-4">Software Engineer</p>
                  <p className="text-gray-400 leading-relaxed">
                    Software engineer responsible for the technical infrastructure supporting
                    Arcus operations — system development, tooling, and engineering execution.
                    Ensures the technology layer runs reliably so research and trading systems
                    can operate without interruption.
                  </p>
                </div>
              </div>
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
            // Commented out pending Dr. Bhuyan permission
            // { icon: <BookOpen className="text-gold" size={20} />, title: "80+ Research Papers", desc: "Co-founder's published academic output in finance and economics." },
            // { icon: <Award className="text-gold" size={20} />, title: "Fulbright Scholar", desc: "Academic credentials that back every strategy we deploy." },
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
              Arcus Quant Fund manages client capital through algorithmic trading strategies across
              cryptocurrency perpetual futures, equity, and options markets. Every strategy is
              developed through rigorous backtesting, walk-forward validation, and Monte Carlo
              simulation before deployment with real capital.
            </p>
            <p>
              Our systems are broker-agnostic — configurable across Binance, Bybit, Interactive
              Brokers, Coinbase, Alpaca, and MT4/MT5 platforms. If a client&apos;s broker supports
              leverage, margin, and API access, we can build a bespoke configuration for their account.
            </p>
            <p>
              We operate on a performance-fee-only model — we earn nothing unless your account grows.
              Capital stays in your own brokerage or exchange account at all times; we access it only
              through trade-execution API keys with no withdrawal permissions.
            </p>
            <p>
              Currently in active growth phase with live capital deployed across client accounts.
              Targeting registration in Dubai and the United States to support global operations.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gold/10 border border-gold/20 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Interested in Working Together?</h3>
          <p className="text-gray-400 mb-6">We&apos;re selectively onboarding new clients. Minimum account size applies.</p>
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
