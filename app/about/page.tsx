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

            {/* Dr. Bhuyan */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-20 h-20 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl font-bold text-gold">
                  RB
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Dr. Rafiq Bhuyan</h2>
                  <p className="text-gold text-sm font-medium mb-4">Co-Founder &amp; Strategic Advisor · Academic Finance</p>

                  {/* Titles & Affiliations */}
                  <p className="text-gray-400 leading-relaxed mb-4">
                    Adjunct Professor of Economics and Finance at{" "}
                    <span className="text-white">Monarch Business School Switzerland</span>{" "}
                    and, concurrently, Associate Professor at{" "}
                    <span className="text-white">Alabama A&amp;M University, USA</span>.
                  </p>

                  {/* Education */}
                  <p className="text-gray-400 leading-relaxed mb-4">
                    <span className="text-white font-medium">Education:</span>{" "}
                    PhD in Economics, Concordia University (Montreal, Canada) ·
                    MS in Finance, University of Illinois ·
                    Master &amp; Bachelor of Commerce, University of Dhaka, Bangladesh.
                  </p>

                  {/* Research */}
                  <p className="text-gray-400 leading-relaxed mb-4">
                    <span className="text-white font-medium">Research:</span>{" "}
                    Author of 80+ peer-reviewed journal articles in finance, economics,
                    entrepreneurship finance, micro-finance, and financial accounting.
                    Fulbright Scholar. Twice recipient of the{" "}
                    <span className="text-white">Outstanding Researcher Award</span> from California State University.
                  </p>

                  {/* Academic career */}
                  <p className="text-gray-400 leading-relaxed mb-4">
                    <span className="text-white font-medium">Academic career:</span>{" "}
                    Former full-time positions as{" "}
                    <span className="text-white">Purcell Chair Professor</span> at Le Moyne College (New York),
                    the American University in Kuwait, and California State University.
                    Former adjunct positions at UC Riverside, Northeastern University,
                    the University of Southern California, and UC Davis.
                  </p>

                  {/* Fund role */}
                  <p className="text-gray-400 leading-relaxed">
                    Extensive live trading experience in stocks and options while managing a private fund.
                    Brings institutional academic credibility, a global research network, and traditional
                    finance infrastructure expertise to Arcus — leading the fund&apos;s Dubai and US LLC
                    formation.
                  </p>
                </div>
              </div>
            </div>

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
            { icon: <BookOpen className="text-gold" size={20} />, title: "80+ Research Papers", desc: "Strategic Advisor's published academic output in finance and economics." },
            { icon: <Award className="text-gold" size={20} />, title: "Fulbright Scholar", desc: "Academic credentials and institutional finance experience behind every strategy." },
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
            <p>
              Alongside the fund, we are building <strong className="text-white">Baraka</strong> — a
              Shariah-compliant perpetual futures DeFi protocol with zero interest hardcoded by design.
              Built on peer-reviewed mathematical research, Baraka targets the 1.8 billion Muslims and
              $3 trillion Islamic finance industry that today has no access to perpetual futures markets.{" "}
              <Link href="/dapp" className="text-gold hover:text-gold-dark transition-colors">
                Learn more →
              </Link>
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
