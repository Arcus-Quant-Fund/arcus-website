import Link from "next/link";
import { ArrowRight, Shield, Lock, TrendingUp, BookOpen } from "lucide-react";

export default function DAppPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6">
      <div className="max-w-4xl mx-auto">

        {/* Hero */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="px-3 py-1 rounded-full border text-xs font-medium bg-amber-500/10 text-amber-400 border-amber-500/20">
              In Development
            </span>
            <span className="px-3 py-1 rounded-full border text-xs font-medium bg-blue-500/10 text-blue-400 border-blue-500/20">
              DeFi Protocol
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
            <span className="gradient-text">Baraka</span>
          </h1>
          <p className="text-xl text-gray-300 font-medium mb-5">
            The world&apos;s first Shariah-compliant perpetual futures protocol.
          </p>
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
            Premium-only funding. Zero interest by design. Mathematically proven spot convergence.
            Built for the 1.8 billion Muslims and $3 trillion Islamic finance industry that today
            has no access to perpetual futures markets.
          </p>
        </div>

        {/* Three pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {[
            {
              icon: <Shield size={20} className="text-gold" />,
              title: "Riba-Free by Design",
              desc: "The interest parameter ι is hardcoded to zero. There is no interest term. There is no rate floor. The protocol cannot collect riba — it is structurally impossible.",
            },
            {
              icon: <Lock size={20} className="text-gold" />,
              title: "Transparent by Default",
              desc: "All funding logic lives on-chain. Every formula, every parameter, every fatwa document stored as an IPFS hash. No opaque mechanics, no hidden fees.",
            },
            {
              icon: <TrendingUp size={20} className="text-gold" />,
              title: "Controlled Leverage",
              desc: "Maximum 5× leverage enforced by the ShariahGuard contract. Maysir is mitigated by design. The Shariah board multisig controls this limit — token holders cannot override it.",
            },
          ].map((p) => (
            <div key={p.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                {p.icon}
              </div>
              <h3 className="text-white font-semibold mb-2">{p.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* The Problem */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <h2 className="text-white font-bold text-xl mb-4">The Problem</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            Every major centralised exchange — Binance, Bybit, OKX, dYdX — embeds a fixed interest
            parameter in their perpetual futures funding formula:{" "}
            <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">I = 0.01%/8h</code>.
            This is predetermined, non-conditional interest — textbook riba under Islamic law.
          </p>
          <p className="text-gray-400 leading-relaxed">
            1.8 billion Muslims and a $3 trillion Islamic finance industry have no access to
            perpetual futures markets as a result. Islamic institutions — sovereign wealth funds,
            takaful operators, Islamic banks — cannot participate. This is not a fringe issue.
            It is a structural exclusion of the world&apos;s largest faith-based financial community
            from the fastest-growing derivative market in history.
          </p>
        </div>

        {/* The Solution */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <h2 className="text-white font-bold text-xl mb-4">The Solution</h2>
          <p className="text-gray-400 leading-relaxed mb-5">
            Ackerer, Hugonnier & Jermann (2024) proved mathematically that perpetual futures
            converge to spot price using only the premium term — no interest required.
            When ι = 0 and funding rates are symmetric,{" "}
            <strong className="text-white">f_t = x_t exactly.</strong>
          </p>

          <div className="bg-gray-800/60 rounded-xl p-5 mb-5 space-y-4">
            <div>
              <div className="text-gray-500 text-xs mb-1.5">CEX formula — riba-bearing:</div>
              <code className="text-red-400 text-sm">
                F = P + clamp(I − P, −0.05%, +0.05%) &nbsp;← I = 0.01%/8h is riba
              </code>
            </div>
            <div className="border-t border-gray-700 pt-4">
              <div className="text-gray-500 text-xs mb-1.5">Baraka formula — riba-free:</div>
              <code className="text-green-400 text-sm">
                F = P = (mark_price − index_price) / index_price
              </code>
              <div className="text-gray-600 text-xs mt-2">
                No I. No floor. Bilateral and conditional on the market.
              </div>
            </div>
          </div>

          <p className="text-gray-400 leading-relaxed">
            Ahmed, Bhuyan & Islam (2026) — our own research — applies this proof to Islamic
            finance law, categorising every existing perpetual futures funding formula across
            the riba / gharar / maysir taxonomy and demonstrating that a premium-only DEX
            perpetual satisfies all three requirements. Baraka is the implementation of that proof.
          </p>
        </div>

        {/* Protocol Architecture */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <h2 className="text-white font-bold text-xl mb-1">Protocol Architecture</h2>
          <p className="text-gray-500 text-sm mb-6">Four core contracts. Each enforces one compliance layer.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: "FundingEngine",
                badge: "Core",
                desc: "Implements F = P with no interest term. The formula is immutable post-audit. ι=0 is not a setting — it is the structural absence of any interest variable.",
              },
              {
                name: "ShariahGuard",
                badge: "Compliance",
                desc: "Enforces 5× leverage cap and Shariah-approved asset whitelist. Controlled by a 3-of-5 scholar multisig. Token holder DAO cannot override Shariah parameters.",
              },
              {
                name: "OracleAdapter",
                badge: "Price",
                desc: "Weighted median of Chainlink (40%), Pyth (40%), Redstone (20%). Requires 2-of-3 agreement within 0.5% tolerance. 30-minute TWAP prevents flash manipulation.",
              },
              {
                name: "PositionManager",
                badge: "Trading",
                desc: "Validates every position against ShariahGuard before execution. Funding flows P2P — the protocol takes zero cut of funding payments (ujrah only from trading fees).",
              },
            ].map((c) => (
              <div key={c.name} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-mono font-semibold text-sm">{c.name}.sol</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                    {c.badge}
                  </span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Markets */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <h2 className="text-white font-bold text-xl mb-1">Markets</h2>
          <p className="text-gray-500 text-sm mb-6">
            Assets selected for strongest Shariah case first. Meme coins and haram-underlying
            assets are excluded permanently by the ShariahGuard contract.
          </p>
          <div className="space-y-6">
            {[
              {
                phase: "Phase 1 — MVP",
                badgeText: "Launch",
                badgeColor: "green",
                markets: [
                  { name: "Gold", token: "PAXG", note: "1 token = 1 troy oz physically allocated. Full redemption rights." },
                  { name: "Silver", token: "XAUT", note: "Physical backing. Constructive qabdh via redemption." },
                  { name: "Ethereum", token: "ETH", note: "Productive asset — staking yield, utility network." },
                ],
              },
              {
                phase: "Phase 2 — Post-fatwa",
                badgeText: "Planned",
                badgeColor: "blue",
                markets: [
                  { name: "Halal Equity Index", token: "DJIM", note: "Dow Jones Islamic Market Index — Shariah-screened stocks." },
                  { name: "Real Estate Token", token: "RWA", note: "Tokenised Shariah-compliant property. Legal title = qabdh." },
                  { name: "Commodities", token: "Various", note: "Wheat, palm oil — halal production chains." },
                ],
              },
            ].map((p) => (
              <div key={p.phase}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-white text-sm font-semibold">{p.phase}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${
                    p.badgeColor === "green"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}>
                    {p.badgeText}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {p.markets.map((m) => (
                    <div key={m.name} className="bg-gray-800/40 rounded-lg p-3">
                      <div className="text-white text-sm font-medium mb-0.5">{m.name}</div>
                      <div className="text-gold text-xs mb-1">{m.token}</div>
                      <div className="text-gray-500 text-xs leading-relaxed">{m.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Governance */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <h2 className="text-white font-bold text-xl mb-4">Dual-Track Governance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-blue-400 text-sm font-semibold mb-2">Technical Track</div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Token holder DAO vote (51% quorum) with 7-day timelock. Controls protocol
                upgrades, fee parameters, and technical changes.
              </p>
            </div>
            <div>
              <div className="text-gold text-sm font-semibold mb-2">Shariah Track</div>
              <p className="text-gray-400 text-sm leading-relaxed">
                3-of-5 AAOIFI-certified scholar multisig. Controls asset listing, leverage
                limits, and compliance parameters. Cannot be overridden by token holders.
                Annual re-certification required.
              </p>
            </div>
          </div>
        </div>

        {/* Roadmap */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <h2 className="text-white font-bold text-xl mb-5">Roadmap</h2>
          <div className="space-y-4">
            {[
              {
                phase: "01",
                timeline: "Months 1–4",
                label: "Foundation",
                items: [
                  "Smart contracts on Arbitrum (FundingEngine, ShariahGuard, PositionManager)",
                  "Oracle integration: Chainlink + Pyth for gold, ETH",
                  "Internal security audit and whitepaper",
                  "Approach AAOIFI-certified scholars for preliminary review",
                ],
              },
              {
                phase: "02",
                timeline: "Months 4–7",
                label: "Shariah Certification",
                items: [
                  "Submit full protocol documentation to Shariah board",
                  "Receive written fatwa on funding formula, leverage limits, and asset list",
                  "Publish fatwa IPFS hash immutably on-chain",
                  "External audit (Certik / OpenZeppelin) + public testnet",
                ],
              },
              {
                phase: "03",
                timeline: "Months 7–10",
                label: "Mainnet Launch",
                items: [
                  "Live on Arbitrum: ETH-USDC, PAXG-USDC, XAUT-USDC",
                  "Bug bounty programme",
                  "Institutional Islamic finance outreach",
                ],
              },
              {
                phase: "04",
                timeline: "Months 10–18",
                label: "Growth & Migration",
                items: [
                  "Add halal equity index markets",
                  "Target $10M TVL, apply for SC Malaysia registration",
                  "Begin Cosmos SDK sovereign chain development",
                  "Publish empirical follow-up paper on protocol performance",
                ],
              },
            ].map((r) => (
              <div key={r.phase} className="flex gap-4">
                <div className="text-right w-28 flex-shrink-0 pt-1">
                  <div className="text-gray-600 text-xs">{r.timeline}</div>
                </div>
                <div className="relative pl-5 border-l border-gray-800 pb-4 last:pb-0">
                  <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-amber-400/30 border border-amber-500/40" />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-600 text-xs font-mono">{r.phase}</span>
                    <span className="text-white font-semibold text-sm">{r.label}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {r.items.map((item) => (
                      <li key={item} className="text-gray-500 text-xs flex items-start gap-2">
                        <span className="text-gray-700 mt-0.5 flex-shrink-0">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Research foundation */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <BookOpen size={20} className="text-gold" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg mb-2">Built on Peer-Reviewed Research</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">
                Baraka is the implementation layer of published academic research. The theoretical
                foundation — spot convergence at ι=0 — is from Ackerer, Hugonnier & Jermann (2024)
                in <em>Mathematical Finance</em>. The Islamic finance application is from Ahmed, Bhuyan & Islam (2026),
                which provides the first systematic taxonomy of perpetual futures funding formulas
                under Shariah law.
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                The paper provides the academic legitimacy. Baraka provides the implementation.
                Together: <span className="text-white font-medium">proof → product.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Market size */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {[
            { value: "1.8B", label: "Muslims globally", sub: "Largest underserved demographic in capital markets" },
            { value: "$3T+", label: "Islamic finance AUM", sub: "Growing 15–20% annually" },
            { value: "0", label: "Shariah-certified perps", sub: "No compliant protocol exists today" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-gold mb-1">{s.value}</div>
              <div className="text-white text-sm font-medium mb-0.5">{s.label}</div>
              <div className="text-gray-500 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gold/10 border border-gold/20 rounded-2xl p-8 text-center mb-16">
          <h3 className="text-2xl font-bold text-white mb-3">Follow the Build</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Baraka is in active development. If you are an Islamic finance institution,
            Shariah scholar, DeFi developer, or accredited investor — we want to hear from you.
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
