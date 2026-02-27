import Link from "next/link";
import { ArrowRight, Shield, Lock, TrendingUp, BookOpen, Activity, FlaskConical, ExternalLink } from "lucide-react";

export default function DAppPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6">
      <div className="max-w-4xl mx-auto">

        {/* Hero */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="px-3 py-1 rounded-full border text-xs font-medium bg-green-500/10 text-green-400 border-green-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Testnet Live — Arbitrum Sepolia
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
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed mb-8">
            Premium-only funding. Zero interest by design. Mathematically proven spot convergence.
            Built for the 1.8 billion Muslims and $3 trillion Islamic finance industry that today
            has no access to perpetual futures markets.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://baraka.arcusquantfund.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors"
            >
              Launch Trading App <ExternalLink size={16} />
            </a>
            <a
              href="https://baraka.arcusquantfund.com/transparency"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 border border-gray-700 hover:border-gold/50 text-gray-300 hover:text-white font-semibold rounded-xl transition-colors"
            >
              View Proof <ArrowRight size={16} />
            </a>
          </div>
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
                desc: "Dual Chainlink feeds (60/40 weighted), 0.5% deviation tolerance, 30-min TWAP, ±20% circuit breaker. Exposes getKappaSignal(): live κ-convergence rate, premium, and 4-tier risk regime (NORMAL / ELEVATED / HIGH / CRITICAL). KappaAlert emitted on-chain when basis enters HIGH or CRITICAL.",
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
                timeline: "Complete ✓",
                label: "Foundation",
                done: true,
                items: [
                  "9 contracts deployed + verified · v2/v3 redeployed Feb 27 (OracleAdapter v2, CollateralVault v2, LiquidationEngine v2, PositionManager v3)",
                  "On-chain smoke test verified: BRKX tier3 fee split (375k/375k tUSDC-wei each leg), κ-regime=0 · all 6 assertions pass · ONCHAIN EXECUTION COMPLETE",
                  "93/93 tests passing (unit + integration + fee + kappa + fuzz, 1000 runs each) · Slither: 0 HIGH, 0 MEDIUM",
                  "κ-convergence risk signal live: OracleAdapter.getKappaSignal() · 4-tier regime (NORMAL/ELEVATED/HIGH/CRITICAL) · KappaAlert event",
                  "BRKX fee tier display live in OrderPanel: useBrkxTier hook (hold-based tier badge, fee estimate row, next-tier upgrade indicator) · useKappaSignal hook (regime colour badge)",
                  "Integrated 4-layer simulation: cadCAD + RL + Game Theory + Mechanism Design · 0/5 insolvency",
                  "3 academic papers: ι=0 perpetuals · credit equivalence · κ-Rate monetary alternative + Appendix A (stochastic κ CIR-type SDE, closed-form κ-bond pricing) — Ahmed, Bhuyan & Islam 2026",
                  "BRKX governance token: hold-based fee tiers (5→2.5 bps), 100M supply, ERC20Votes+Permit",
                  "Trading frontend live — baraka.arcusquantfund.com",
                  "The Graph subgraph live — all events indexed on Arbitrum Sepolia",
                  "Full codebase public on GitHub — github.com/Arcus-Quant-Fund/BarakaDapp",
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
                  <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full ${(r as {done?:boolean}).done ? "bg-green-400/60 border border-green-400" : "bg-amber-400/30 border border-amber-500/40"}`} />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-600 text-xs font-mono">{r.phase}</span>
                    <span className="text-white font-semibold text-sm">{r.label}</span>
                    {(r as {done?:boolean}).done && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Live</span>
                    )}
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
                in <em>Mathematical Finance</em>. Our own research programme has produced three papers
                validating the protocol from complementary angles.
              </p>
              <div className="space-y-2 mb-3">
                {[
                  { n: "Paper I", title: "Shariah-Compliant Perpetual Futures: ι=0 as the No-Riba Condition", desc: "First taxonomy of all existing perpetual funding formulas under riba / gharar / maysir. Proves ι=0 is the unique compliant parameterisation." },
                  { n: "Paper II", title: "Random Stopping Time Equivalence and the κ-Rate in Islamic Finance", desc: "Shows Ackerer's random stopping time θ_t is mathematically equivalent to a credit event τ, replacing r with κ (no-riba convergence intensity). Foundation for sukuk, takaful, and iCDS." },
                  { n: "Paper III", title: "The κ-Rate: A Riba-Free Monetary Alternative Derived from Perpetual Contract Theory", desc: "Proposes κ as the first rigorous, observable, riba-free alternative to r (Wicksell's natural rate minus riba). Constructs the κ-yield curve κ(T) = 1/T — the Islamic analog of CIR. Appendix A: stochastic κ dynamics — CIR-κ SDE (dκ = α(κ̄−κ)dt + σ√κ dW), closed-form κ-bond pricing (Riccati ODEs), stochastic yield curve (normal/inverted/flat regimes). Applications: sukuk benchmark, takaful pricing, Islamic monetary policy signalling." },
                ].map((p) => (
                  <div key={p.n} className="bg-gray-800/40 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gold text-xs font-mono font-semibold">{p.n}</span>
                      <span className="text-white text-xs font-medium">{p.title}</span>
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Three papers. Three validation layers. <span className="text-white font-medium">Proof → simulation → product.</span>
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

        {/* Live Contracts */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Activity size={16} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Live on Arbitrum Sepolia</h2>
              <p className="text-gray-500 text-xs">Deployed Feb 2026 · v2/v3 redeployed Feb 27 2026 · All 9 contracts verified on Arbiscan · <a href="https://github.com/Arcus-Quant-Fund/BarakaDapp" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-400 transition-colors">View Source ↗</a></p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
            {[
              { name: "OracleAdapter v2",   addr: "0x86C475d9943ABC61870C6F19A7e743B134e1b563" },
              { name: "ShariahGuard",      addr: "0x26d4db76a95DBf945ac14127a23Cd4861DA42e69" },
              { name: "FundingEngine",     addr: "0x459BE882BC8736e92AA4589D1b143e775b114b38" },
              { name: "InsuranceFund",     addr: "0x7B440af63D5fa5592E53310ce914A21513C1a716" },
              { name: "CollateralVault v2", addr: "0x0e9e32e4e061Db57eE5d3309A986423A5ad3227E" },
              { name: "LiquidationEngine v2", addr: "0x17D9399C7e17690bE23544E379907eC1AB6b7E07" },
              { name: "PositionManager v3", addr: "0x035E38fd8b34486530A4Cd60cE9D840e1a0A124a" },
              { name: "GovernanceModule",  addr: "0x8c987818dffcD00c000Fe161BFbbD414B0529341" },
              { name: "BRKXToken",         addr: "0xD3f7E29cAC5b618fAB44Dd8a64C4CC335C154A32" },
            ].map((c) => (
              <a
                key={c.name}
                href={`https://sepolia.arbiscan.io/address/${c.addr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 hover:border-green-500/30 hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-white text-xs font-mono font-medium">{c.name}.sol</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-xs font-mono hidden md:block">
                    {c.addr.slice(0, 6)}...{c.addr.slice(-4)}
                  </span>
                  <ExternalLink size={11} className="text-gray-600 group-hover:text-green-400 transition-colors" />
                </div>
              </a>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Chain: Arbitrum Sepolia (421614)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Compiler: Solidity 0.8.24
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Deploy cost: ~$0.01 (L2)
            </span>
          </div>
        </div>

        {/* Simulation & Economic Verification */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FlaskConical size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl mb-1">Economic Simulation Framework</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Before deploying a single contract, we built a full economic simulation system to verify
                protocol safety across thousands of price scenarios. No changes can be made post-deploy —
                so we tested everything first.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              {
                title: "cadCAD Monte Carlo",
                badge: "System Dynamics",
                badgeColor: "purple",
                result: "0% insolvency · 20 runs × 720 steps",
                desc: "Full state machine simulation of the protocol over 30 days. Every funding payment, liquidation, and collateral move tracked across 20 parallel Monte Carlo runs.",
              },
              {
                title: "Game Theory",
                badge: "Nash Equilibrium",
                badgeColor: "blue",
                result: "ι=0 net transfer < 1% of total",
                desc: "Proves ι=0 is the unique Shariah-compliant Nash Equilibrium. With any ι > 0, longs face a systematic positive transfer to the protocol — textbook riba. With ι=0, net transfer ≈ zero.",
              },
              {
                title: "Reinforcement Learning",
                badge: "Agent Modelling",
                badgeColor: "amber",
                result: "PPO agent · Nash leverage 2.72× / 3.28×",
                desc: "A Proximal Policy Optimisation agent learns to trade within Baraka's constraints. Trained agents converge to sub-maximal leverage (2.72× long / 3.28× short) well inside the 5× Shariah cap.",
              },
              {
                title: "Stress Tests",
                badge: "5 Scenarios",
                badgeColor: "red",
                result: "Protocol survives all scenarios",
                desc: "Flash crash (−40%), 48h max funding spiral, oracle attack (+20% mark), 60-day bear market, cascade liquidation. Insurance fund survives all. ι=0 never violated in any scenario.",
              },
              {
                title: "Integrated IES",
                badge: "4-Layer Closed Loop",
                badgeColor: "green",
                result: "5 episodes · 0/5 insolvency · MD converged",
                desc: "All four layers running simultaneously: cadCAD state machine feeds RL agent every step, Game Theory solves Nash every 50 steps, Mechanism Design re-optimises parameters at episode boundary. ι=0 net transfer ≈ $0 across all 3,600 simulation steps.",
              },
            ].map((s) => (
              <div key={s.title} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-semibold text-sm">{s.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${
                    s.badgeColor === "purple" ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : s.badgeColor === "blue"   ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : s.badgeColor === "amber"  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : s.badgeColor === "green"  ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {s.badge}
                  </span>
                </div>
                <div className="text-green-400 text-xs font-mono mb-2">{s.result}</div>
                <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4">
            <div className="text-gray-500 text-xs mb-3 font-medium uppercase tracking-wide">Mechanism Design — Parameter Optimisation</div>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              Using <code className="text-gray-300 bg-gray-800 px-1 py-0.5 rounded text-xs">scipy.optimize.differential_evolution</code>,
              we searched the full parameter space for Pareto-optimal protocol settings.
              Result: Baraka&apos;s current parameters (±75bps cap, 2% maintenance margin, 1% liquidation penalty, 50% insurance split)
              sit inside the Pareto-optimal region for solvency + fairness.
            </p>
            <div className="flex flex-wrap gap-4 text-xs">
              {[
                { param: "Max funding rate", value: "±75 bps/hr", status: "optimal" },
                { param: "Maintenance margin", value: "2%", status: "optimal" },
                { param: "Liquidation penalty", value: "1%", status: "optimal" },
                { param: "Insurance split", value: "50 / 50", status: "optimal" },
                { param: "Max leverage", value: "5× (fixed)", status: "shariah" },
                { param: "Interest (ι)", value: "0 (fixed)", status: "shariah" },
              ].map((p) => (
                <div key={p.param} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.status === "shariah" ? "bg-gold" : "bg-green-400"}`} />
                  <span className="text-gray-500">{p.param}:</span>
                  <span className="text-white font-mono">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gold/10 border border-gold/20 rounded-2xl p-8 text-center mb-16">
          <h3 className="text-2xl font-bold text-white mb-3">Ready to Trade — Testnet Live</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Try the world&apos;s first Shariah-compliant perpetual futures interface on Arbitrum Sepolia.
            No real funds needed — connect your wallet and explore.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="https://baraka.arcusquantfund.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors"
            >
              Launch Trading App <ExternalLink size={18} />
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 border border-gold/30 hover:border-gold text-gold font-semibold rounded-xl transition-colors"
            >
              Get in Touch <ArrowRight size={18} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
