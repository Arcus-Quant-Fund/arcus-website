import Link from "next/link";
import { ArrowRight, Shield, Lock, TrendingUp, BookOpen, Activity, FlaskConical, ExternalLink, Layers, Globe, DollarSign, Zap, Target, TrendingDown, Users, Building2 } from "lucide-react";

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
            <span className="px-3 py-1 rounded-full border text-xs font-medium bg-gold/10 text-gold border-gold/20">
              13 Contracts Deployed
            </span>
            <span className="px-3 py-1 rounded-full border text-xs font-medium bg-blue-500/10 text-blue-400 border-blue-500/20">
              177/177 Tests Passing
            </span>
            <span className="px-3 py-1 rounded-full border text-xs font-medium bg-purple-500/10 text-purple-400 border-purple-500/20">
              3 Peer-Reviewed Papers
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
            <span className="gradient-text">Baraka</span>
          </h1>
          <p className="text-xl text-gray-300 font-medium mb-5">
            The world&apos;s first Shariah-compliant perpetual futures protocol — and a full Islamic financial system.
          </p>
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed mb-8">
            Zero interest by mathematical proof. A four-layer product stack: perpetuals, everlasting options,
            perpetual sukuk, mutual takaful insurance, and Islamic credit default swaps — all priced without riba.
            Built for 1.8 billion Muslims and a $3 trillion Islamic finance industry that today has no access
            to modern derivative markets.
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
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 border border-gray-700 hover:border-gold/50 text-gray-300 hover:text-white font-semibold rounded-xl transition-colors"
            >
              Investor Enquiries <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Progress Summary — How Far We've Come */}
        <div className="bg-gray-900 border border-green-500/20 rounded-2xl p-7 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h2 className="text-white font-bold text-lg">Where We Are Today — February 2026</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { value: "13", label: "Contracts", sub: "Deployed + verified on Arbitrum Sepolia" },
              { value: "177", label: "Tests Passing", sub: "Unit + integration + fuzz, 1000 runs" },
              { value: "8", label: "Live App Routes", sub: "Trade, Markets, Sukuk, Takaful, Credit, Dashboard..." },
              { value: "3", label: "Research Papers", sub: "Ahmed, Bhuyan & Islam 2026" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-0.5">{s.value}</div>
                <div className="text-white text-xs font-semibold mb-0.5">{s.label}</div>
                <div className="text-gray-600 text-xs leading-snug">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { done: true, text: "Core protocol (9 contracts): FundingEngine, ShariahGuard, OracleAdapter, CollateralVault, PositionManager, LiquidationEngine, InsuranceFund, GovernanceModule, BRKXToken" },
              { done: true, text: "Product stack (4 contracts): EverlastingOption pricing engine + TakafulPool (L3 insurance) + PerpetualSukuk (L2 capital market) + iCDS (L4 credit derivative)" },
              { done: true, text: "Fatwa on-chain: ShariahGuard.fatwaIPFS[USDC] = QmVztQvWd5QkD5euhiUb2ycwr2SHL928Y2AC9rnWCMn7c2 (Pinata IPFS, registered Feb 28 2026)" },
              { done: true, text: "Full-stack frontend at baraka.arcusquantfund.com — 8 pages: Trade, Markets, Sukuk, Takaful, Credit, Dashboard, Transparency, Home" },
              { done: true, text: "The Graph subgraph v0.0.2 — all 7 data sources indexed, L2/L3/L4 events tracked" },
              { done: true, text: "3 academic papers, integrated 4-layer simulation (cadCAD + RL + Game Theory + Mechanism Design), 0/5 insolvency across all runs" },
              { done: false, text: "Formal fatwa from AAOIFI-certified scholar board (replacing testnet placeholder)" },
              { done: false, text: "External smart contract audit (Certik / OpenZeppelin)" },
              { done: false, text: "Mainnet launch on Arbitrum One, institutional outreach, first real TVL" },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3">
                <span className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold ${item.done ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-gray-800 text-gray-600 border border-gray-700"}`}>
                  {item.done ? "✓" : "·"}
                </span>
                <span className={`text-xs leading-relaxed ${item.done ? "text-gray-300" : "text-gray-600"}`}>{item.text}</span>
              </div>
            ))}
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
              desc: "All 13 contracts verified on Arbiscan. Every formula, every parameter, every fatwa stored as an IPFS hash in ShariahGuard.fatwaIPFS. No opaque mechanics, no hidden fees.",
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
          <p className="text-gray-400 leading-relaxed mb-4">
            1.8 billion Muslims and a $3 trillion Islamic finance industry have no access to
            perpetual futures markets as a result. Islamic institutions — sovereign wealth funds,
            takaful operators, Islamic banks — cannot participate. This is not a fringe issue.
            It is a structural exclusion of the world&apos;s largest faith-based financial community
            from the fastest-growing derivative market in history.
          </p>
          <p className="text-gray-400 leading-relaxed">
            The problem extends far beyond perpetuals. Islamic finance lacks on-chain instruments for
            capital markets (sukuk bonds), insurance (takaful), and credit protection (CDS). Every
            conventional financial product that involves interest must be rebuilt from first principles
            to be permissible under Shariah law. <strong className="text-white">Nobody has done this on-chain. Until now.</strong>
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

          <p className="text-gray-400 leading-relaxed mb-4">
            Ahmed, Bhuyan & Islam (2026) applies this proof to Islamic finance law, and then extends it further.
            Paper II proves that Ackerer&apos;s random stopping time θ_t is mathematically equivalent to a
            credit event — meaning the same κ-rate that prices perpetuals can price sukuk coupon streams,
            takaful premiums, and credit default swaps. <strong className="text-white">One parameter. Four products. Zero riba.</strong>
          </p>
          <p className="text-gray-400 leading-relaxed">
            This is what makes Baraka unique: it is not just a compliance wrapper around conventional
            DeFi. It is a theoretically new framework for Islamic finance — the first rigorous,
            on-chain, riba-free alternative to the entire conventional derivatives ecosystem.
          </p>
        </div>

        {/* What We've Built — Layer by Layer */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <Layers size={20} className="text-gold" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl mb-1">The Full Product Stack</h2>
              <p className="text-gray-500 text-sm">13 contracts across 4 layers — a complete Islamic financial system on-chain.</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                layer: "Layer 1 — Core Protocol",
                color: "green",
                status: "Live on Arbitrum Sepolia",
                contracts: [
                  { name: "FundingEngine", desc: "F = (mark−index)/index with ι=0. Symmetric ±75bps circuit breaker. No interest term." },
                  { name: "ShariahGuard", desc: "5× leverage cap (immutable constant). AAOIFI asset whitelist. fatwaIPFS registry — links every approved token to its Pinata IPFS fatwa CID." },
                  { name: "OracleAdapter v2", desc: "Dual Chainlink feeds (60/40 weighted), κ-convergence signal, 4-tier risk regime (NORMAL → ELEVATED → HIGH → CRITICAL), KappaAlert event." },
                  { name: "PositionManager v3", desc: "Open/close isolated margin positions. BRKX hold-based fee tiers (2.5–5bps). ShariahGuard validates every open." },
                  { name: "CollateralVault v2", desc: "USDC/PAXG/XAUT custody. No rehypothecation. 24h cooldown. chargeFromFree() for fee collection." },
                  { name: "LiquidationEngine v2", desc: "2% maintenance margin. 1% liquidation penalty split 50/50 between InsuranceFund and liquidator." },
                  { name: "InsuranceFund", desc: "Protocol solvency backstop. Receives 50% of liquidation penalties + 50% of BRKX trading fees. No yield on idle capital." },
                  { name: "GovernanceModule", desc: "48h timelock. BRKX token voting. Shariah board veto cannot be overridden by DAO." },
                  { name: "BRKXToken", desc: "100M fixed supply. ERC20Votes+Permit. Hold-based fee tiers — no lock-up required. Governance rights." },
                ],
              },
              {
                layer: "Layer 1.5 — Pricing Engine",
                color: "gold",
                status: "Live on Arbitrum Sepolia",
                contracts: [
                  { name: "EverlastingOption", desc: "Implements Ackerer (2024) Proposition 6 at ι=0: Π(x, K) = [K^{1−β} / (β₊ − β₋)] × x^β, where β = ½ ± √(¼ + 2κ/σ²). The κ-rate replaces r entirely. This is the actuarially fair pricing engine for all L2/L3/L4 instruments — sukuk profit rates, tabarru premiums, iCDS quarterly payments. 33/33 tests including 1000-run fuzz." },
                ],
              },
              {
                layer: "Layer 2 — Capital Markets",
                color: "blue",
                status: "Live on Arbitrum Sepolia",
                contracts: [
                  { name: "PerpetualSukuk", desc: "Ijarah-structure perpetual sukuk (Islamic bond). Fixed κ-priced profit rate (riba-free coupon equivalent) paid per block. Embedded everlasting call option at maturity — mudarabah upside sharing. First on-chain sukuk with κ-rate pricing. 16/16 tests." },
                ],
              },
              {
                layer: "Layer 3 — Mutual Insurance",
                color: "purple",
                status: "Live on Arbitrum Sepolia",
                contracts: [
                  { name: "TakafulPool", desc: "On-chain takaful (Islamic mutual insurance). Participants donate tabarru contributions — not premiums. No guaranteed return — no riba. Coverage triggers if BTC spot falls below the $40k floor. Wakala 10% operator fee. κ-rate everlasting put option pricing for tabarru calculation. First on-chain Shariah-compliant insurance protocol. 16/16 tests." },
                ],
              },
              {
                layer: "Layer 4 — Credit Derivatives",
                color: "red",
                status: "Live on Arbitrum Sepolia",
                contracts: [
                  { name: "iCDS (Islamic CDS)", desc: "Ta'awun (mutual cooperation) credit protection model. Seller deposits notional as collateral. Buyer pays quarterly κ-priced premiums. Credit event = verifiable on-chain oracle trigger (spot ≤ recovery floor) — eliminates gharar of ambiguous default definition. No speculation: buyer must have verifiable exposure. LGD settlement: payout = notional × (1 − recovery rate). First Islamic credit default swap ever deployed on any blockchain. 19/19 tests + 1000-run fuzz." },
                ],
              },
            ].map((layer) => (
              <div key={layer.layer} className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-white text-sm font-bold">{layer.layer}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${
                    layer.color === "green"  ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : layer.color === "gold"   ? "bg-gold/10 text-gold border-gold/20"
                    : layer.color === "blue"   ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : layer.color === "purple" ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {layer.status}
                  </span>
                </div>
                <div className="space-y-3">
                  {layer.contracts.map((c) => (
                    <div key={c.name} className="bg-gray-800/60 rounded-lg p-3">
                      <div className="text-white font-mono font-semibold text-xs mb-1">{c.name}.sol</div>
                      <p className="text-gray-400 text-xs leading-relaxed">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why This Changes the World */}
        <div className="bg-gray-900 border border-gold/20 rounded-2xl p-7 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <Globe size={20} className="text-gold" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl mb-1">Why This Can Change the World</h2>
              <p className="text-gray-500 text-sm">Financial inclusion at civilisational scale.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-gold" />
                <span className="text-white font-semibold text-sm">1.8 Billion People. Zero Access.</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Muslims constitute 25% of the world&apos;s population. The Islamic finance prohibition on
                interest (riba) is not a technicality — it is a deeply held religious conviction that governs
                financial decision-making for over a billion people. Today, every perpetual futures platform,
                every on-chain interest-bearing protocol, every conventional DeFi application is off-limits.
                A devout Muslim in Kuala Lumpur, Jakarta, Karachi, Cairo, or Dubai cannot participate in
                the most liquid, fastest-growing derivative market in financial history.
                Baraka removes that barrier — permanently, by mathematical proof, not by waiver.
              </p>
            </div>

            <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} className="text-gold" />
                <span className="text-white font-semibold text-sm">$3 Trillion Industry With No On-Chain Home</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                The global Islamic finance industry manages over $3 trillion in assets across 80+ countries.
                It is growing at 15–20% annually. Sovereign wealth funds in Saudi Arabia, Malaysia, and the UAE.
                Islamic banks across Southeast Asia, the Middle East, and North Africa. Takaful operators
                serving hundreds of millions of policyholders. None of them can participate in DeFi
                because no DeFi protocol is compliant. We are building the bridge.
              </p>
            </div>

            <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-gold" />
                <span className="text-white font-semibold text-sm">Not a Compliance Wrapper — a New Financial Paradigm</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Most &quot;Islamic&quot; financial products are retrofitted versions of conventional instruments —
                legal structures designed to achieve the same economic outcome while technically avoiding riba.
                Scholars criticise them as &quot;form over substance.&quot; Baraka is different. We derived the
                mathematics from first principles: Ackerer (2024) proved ι=0 is not a setting but a
                structural necessity for spot convergence. Ahmed, Bhuyan & Islam (2026) then showed
                that this same κ-parameter prices every Islamic financial instrument — sukuk, takaful,
                iCDS — without reference to any interest rate. The protocol does not avoid riba.
                <strong className="text-white"> It is structurally incapable of creating riba.</strong>
              </p>
            </div>

            <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-gold" />
                <span className="text-white font-semibold text-sm">The κ-Rate: A New Monetary Framework</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Paper III proposes κ as the first rigorous, observable, riba-free alternative to the
                conventional interest rate r. Where conventional finance uses the risk-free rate as
                its pricing anchor — causing every derivative to embed riba — Islamic finance has
                had no equivalent. The κ-rate is derived directly from on-chain perpetual contract
                convergence. It is verifiable, real-time, and contains no interest by construction.
                The κ-yield curve κ(T) = 1/T is the Islamic analog of the conventional yield curve.
                This is not just a product — it is the foundation of an alternative monetary framework.
              </p>
            </div>
          </div>
        </div>

        {/* Note to Investors */}
        <div className="bg-gray-900 border border-gold/30 rounded-2xl p-7 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <DollarSign size={20} className="text-gold" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl mb-1">Note to Investors</h2>
              <p className="text-gray-500 text-sm">Why we believe this is one of the most asymmetric opportunities in Islamic finance and DeFi.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-5">
              <div className="text-gold text-xs font-semibold mb-3 uppercase tracking-wide">Total Addressable Market</div>
              <div className="space-y-3">
                {[
                  { label: "Islamic finance AUM (global)", value: "$3T+", note: "Growing 15–20%/year" },
                  { label: "Perpetual futures daily volume (crypto)", value: "$150B+", note: "Fastest-growing derivatives market" },
                  { label: "Muslims globally", value: "1.8B", note: "25% of world population" },
                  { label: "Halal-certified perp DEXs today", value: "0", note: "Zero. We are first." },
                ].map((s) => (
                  <div key={s.label} className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-gray-400 text-xs">{s.label}</div>
                      <div className="text-gray-600 text-xs">{s.note}</div>
                    </div>
                    <div className="text-gold font-bold text-sm flex-shrink-0">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-5">
              <div className="text-gold text-xs font-semibold mb-3 uppercase tracking-wide">Revenue Streams (Mainnet)</div>
              <div className="space-y-3">
                {[
                  { stream: "Trading fees", desc: "2.5–5bps per open/close. 50% InsuranceFund + 50% treasury." },
                  { stream: "Wakala fee (TakafulPool)", desc: "10% of every tabarru contribution — operator fee for running the pool." },
                  { stream: "Sukuk management", desc: "Issuer fee on PerpetualSukuk issuance and κ-rate pricing." },
                  { stream: "iCDS premium flow", desc: "Protocol fee on quarterly CDS premium payments." },
                ].map((s) => (
                  <div key={s.stream}>
                    <div className="text-white text-xs font-medium mb-0.5">{s.stream}</div>
                    <div className="text-gray-500 text-xs leading-relaxed">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              {
                title: "Regulatory Moat",
                desc: "Islamic finance compliance is codified in AAOIFI standards — a recognised international framework unlike the ambiguous SEC/CFTC crypto landscape. A compliant protocol has legal clarity in 80+ jurisdictions from day one.",
                icon: <Shield size={16} className="text-gold" />,
              },
              {
                title: "Academic Moat",
                desc: "3 peer-reviewed papers + Ackerer (2024) Mathematical Finance foundation + Dr. Rafiq Bhuyan (80+ publications, Fulbright Scholar, Monarch Business School). The proof of compliance is in the academic literature — not a marketing claim.",
                icon: <BookOpen size={16} className="text-gold" />,
              },
              {
                title: "First-Mover Moat",
                desc: "No Shariah-certified perpetual futures protocol exists. We have been building since early 2025. By the time a competitor could build, audit, and certify an equivalent protocol, Baraka will have TVL, institutional relationships, and a live subgraph of historical data.",
                icon: <TrendingUp size={16} className="text-gold" />,
              },
            ].map((m) => (
              <div key={m.title} className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {m.icon}
                  <span className="text-white font-semibold text-xs">{m.title}</span>
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-800/60 border border-gold/20 rounded-xl p-5 mb-5">
            <div className="text-gold text-xs font-semibold mb-3 uppercase tracking-wide">Conservative Upside Scenario</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { scenario: "Conservative", tvl: "$100M TVL", volume: "$1B/month", revenue: "$3.6M/year", note: "0.003% of Islamic finance AUM" },
                { scenario: "Base", tvl: "$1B TVL", volume: "$10B/month", revenue: "$36M/year", note: "0.03% of Islamic finance AUM" },
                { scenario: "Optimistic", tvl: "$10B TVL", volume: "$100B/month", revenue: "$360M/year", note: "0.33% of Islamic finance AUM" },
              ].map((s) => (
                <div key={s.scenario} className="text-center">
                  <div className="text-gray-500 text-xs mb-1">{s.scenario}</div>
                  <div className="text-gold font-bold text-sm mb-0.5">{s.tvl}</div>
                  <div className="text-gray-400 text-xs mb-0.5">{s.volume} volume</div>
                  <div className="text-green-400 text-xs font-mono">{s.revenue}</div>
                  <div className="text-gray-700 text-xs mt-1">{s.note}</div>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-3 text-center">
              Assumes 3bps average fee, 10× annual turnover. Does not include takaful, sukuk, or iCDS revenue streams.
              Islamic finance AUM projected to reach $6.7T by 2030 (IFSB 2023).
            </p>
          </div>

          <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-5">
            <div className="text-gold text-xs font-semibold mb-3 uppercase tracking-wide">Team</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  name: "Shehzad Ahmed",
                  role: "Founder & CEO",
                  bio: "Computational finance. Designed and built all 13 contracts, 177 tests, 3 academic papers, the entire simulation framework, and the full-stack application. Arcus Quant Fund founder.",
                },
                {
                  name: "Dr. Rafiq Bhuyan",
                  role: "Co-Founder & Strategic Advisor",
                  bio: "PhD Economics (Concordia). Adjunct Prof at Monarch Business School Switzerland. 80+ peer-reviewed publications. Fulbright Scholar. Former Purcell Chair Prof. Islamic finance expertise + institutional network.",
                },
              ].map((t) => (
                <div key={t.name}>
                  <div className="text-white text-sm font-semibold mb-0.5">{t.name}</div>
                  <div className="text-gold text-xs mb-1.5">{t.role}</div>
                  <p className="text-gray-500 text-xs leading-relaxed">{t.bio}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 text-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Schedule an Investor Call <ArrowRight size={16} />
            </Link>
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
                  { n: "Paper I", title: "Zero-Interest Perpetual Futures: A Shariah-Compliant Derivatives Framework", desc: "First taxonomy of all existing perpetual funding formulas under riba / gharar / maysir. Proves ι=0 is the unique compliant parameterisation. Mathematical proof that premium-only funding satisfies all three Islamic prohibitions." },
                  { n: "Paper II", title: "Random Stopping Time Equivalence and the κ-Rate in Islamic Finance", desc: "Shows Ackerer's random stopping time θ_t is mathematically equivalent to a credit event τ, replacing r with κ (no-riba convergence intensity). Foundation for sukuk coupon pricing, takaful premium calculation, and iCDS premium mechanics — all without interest." },
                  { n: "Paper III", title: "The κ-Rate: A Riba-Free Monetary Alternative + Appendix A (Stochastic κ Dynamics)", desc: "Proposes κ as the first rigorous, observable, riba-free alternative to the conventional interest rate. Constructs the κ-yield curve κ(T) = 1/T — the Islamic analog of CIR. Appendix A: stochastic κ as CIR-type SDE (dκ = α(κ̄−κ)dt + σ√κ dW), closed-form κ-bond pricing via Riccati ODEs, normal/inverted/flat κ-yield regimes. Applications: sukuk benchmark rate, Islamic monetary policy signalling." },
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
                Three papers. Three validation layers. <span className="text-white font-medium">Proof → simulation → product.</span>{" "}
                All available at{" "}
                <a href="https://github.com/Arcus-Quant-Fund/BarakaDapp" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light underline">
                  github.com/Arcus-Quant-Fund/BarakaDapp ↗
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Market size */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-16">
          {[
            { value: "1.8B", label: "Muslims globally", sub: "Largest underserved demographic in capital markets" },
            { value: "$3T+", label: "Islamic finance AUM", sub: "Growing 15–20% annually, projected $6.7T by 2030" },
            { value: "0", label: "Shariah-certified perps", sub: "No compliant protocol exists today — anywhere" },
            { value: "$150B+", label: "Daily perp volume", sub: "Crypto perpetuals — world's fastest-growing derivative" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-gold mb-1">{s.value}</div>
              <div className="text-white text-sm font-medium mb-0.5">{s.label}</div>
              <div className="text-gray-500 text-xs leading-snug">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Roadmap */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <h2 className="text-white font-bold text-xl mb-2">Roadmap</h2>
          <p className="text-gray-500 text-sm mb-5">What&apos;s done, what&apos;s next, and how far we still have to go.</p>
          <div className="space-y-4">
            {[
              {
                phase: "01",
                timeline: "Complete ✓",
                label: "Protocol + Product Stack",
                done: true,
                items: [
                  "13 contracts deployed + verified: 9 core (FundingEngine/ShariahGuard/OracleAdapter/CollateralVault/PositionManager/LiquidationEngine/InsuranceFund/GovernanceModule/BRKXToken) + 4 product stack (EverlastingOption/TakafulPool/PerpetualSukuk/iCDS)",
                  "177/177 tests passing — unit + integration + fuzz (1000 runs each) · Slither: 0 HIGH, 0 MEDIUM",
                  "Fatwa on-chain: ShariahGuard.fatwaIPFS[USDC] = QmVztQvWd5QkD5euhiUb2ycwr2SHL928Y2AC9rnWCMn7c2 (Pinata IPFS, registered Feb 28 2026)",
                  "Full 8-route frontend: baraka.arcusquantfund.com (Trade, Markets, Sukuk, Takaful, Credit, Dashboard, Transparency, Home)",
                  "The Graph subgraph v0.0.2 — all 7 data sources indexed, L2/L3/L4 events tracked",
                  "Integrated 4-layer simulation: cadCAD + RL + Game Theory + Mechanism Design · 0/5 insolvency across all runs",
                  "3 academic papers: ι=0 perpetuals · κ-rate credit equivalence · stochastic κ monetary framework — Ahmed, Bhuyan & Islam 2026",
                  "κ-convergence risk signal: OracleAdapter.getKappaSignal(), 4-tier regime, on-chain KappaAlert events",
                  "BRKX governance token: 100M supply, hold-based fee tiers (5.0 → 2.5 bps), ERC20Votes+Permit",
                  "Full codebase public: github.com/Arcus-Quant-Fund/BarakaDapp",
                ],
              },
              {
                phase: "02",
                timeline: "Months 1–4",
                label: "Shariah Certification + Audit",
                items: [
                  "Submit full protocol to AAOIFI-affiliated Shariah board for formal written fatwa",
                  "Replace testnet placeholder IPFS document with signed scholar PDF",
                  "External smart contract audit — Certik or OpenZeppelin (code frozen post-audit)",
                  "Public testnet campaign: bring 1000 wallets to testnet, collect feedback",
                  "SSRN preprint submission for all 3 papers",
                ],
              },
              {
                phase: "03",
                timeline: "Months 4–8",
                label: "Mainnet Launch",
                items: [
                  "Deploy to Arbitrum One: ETH-USDC, PAXG-USDC (gold), XAUT-USDC (gold) markets",
                  "Issue first PerpetualSukuk tranche — BTC/USDC, target $500k par value",
                  "Open TakafulPool for gold price protection — first on-chain Shariah insurance product",
                  "Open first iCDS protection pairs — institutional credit hedging",
                  "Bug bounty programme · Institutional Islamic finance outreach",
                  "Integration with Islamic neo-banks and neobrokers (target: Malaysia, UAE, Indonesia)",
                ],
              },
              {
                phase: "04",
                timeline: "Months 8–18",
                label: "Institutional Scale",
                items: [
                  "Target $10M TVL and apply for SC Malaysia recognition",
                  "Halal equity index markets: DJIM perpetuals, tokenised RWA",
                  "Begin Cosmos SDK sovereign chain development — Baraka as a sovereign appchain",
                  "On-chain κ-yield curve as Islamic benchmark rate — alternative to LIBOR/SOFR for Islamic institutions",
                  "Publish empirical follow-up papers on live protocol performance",
                  "Series A fundraise targeting Islamic sovereign wealth funds and Islamic fintech VCs",
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

        {/* Economic Simulation */}
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
              Result: Baraka&apos;s current parameters sit inside the Pareto-optimal region for solvency + fairness.
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

        {/* Live Contracts */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Activity size={16} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Live on Arbitrum Sepolia — 13 Contracts</h2>
              <p className="text-gray-500 text-xs">Deployed Feb 2026 · Product stack deployed Feb 28 2026 · All verified on Arbiscan · <a href="https://github.com/Arcus-Quant-Fund/BarakaDapp" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-400 transition-colors">View Source ↗</a></p>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-gray-600 text-xs mb-2 uppercase tracking-wide">Layer 1 — Core Protocol</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { name: "OracleAdapter v2",     addr: "0x86C475d9943ABC61870C6F19A7e743B134e1b563" },
                { name: "ShariahGuard",          addr: "0x26d4db76a95DBf945ac14127a23Cd4861DA42e69" },
                { name: "FundingEngine",          addr: "0x459BE882BC8736e92AA4589D1b143e775b114b38" },
                { name: "InsuranceFund",          addr: "0x7B440af63D5fa5592E53310ce914A21513C1a716" },
                { name: "CollateralVault v2",     addr: "0x0e9e32e4e061Db57eE5d3309A986423A5ad3227E" },
                { name: "LiquidationEngine v2",  addr: "0x17D9399C7e17690bE23544E379907eC1AB6b7E07" },
                { name: "PositionManager v3",     addr: "0x035E38fd8b34486530A4Cd60cE9D840e1a0A124a" },
                { name: "GovernanceModule",       addr: "0x8c987818dffcD00c000Fe161BFbbD414B0529341" },
                { name: "BRKXToken",              addr: "0xD3f7E29cAC5b618fAB44Dd8a64C4CC335C154A32" },
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
          </div>

          <div className="mb-5">
            <div className="text-gray-600 text-xs mb-2 uppercase tracking-wide">Layers 1.5–4 — Product Stack</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { name: "EverlastingOption [L1.5]", addr: "0x977419b75182777c157E2192d4Ec2dC87413E006" },
                { name: "PerpetualSukuk [L2]",      addr: "0xd209f7B587c8301D5E4eC1691264deC1a560e48D" },
                { name: "TakafulPool [L3]",          addr: "0xD53d34cC599CfadB5D1f77516E7Eb326a08bb0E4" },
                { name: "iCDS [L4]",                 addr: "0xc4E8907619C8C02AF90D146B710306aB042c16c5" },
              ].map((c) => (
                <a
                  key={c.name}
                  href={`https://sepolia.arbiscan.io/address/${c.addr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-gray-800/60 border border-gold/20 rounded-lg px-4 py-2.5 hover:border-gold/40 hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    <span className="text-white text-xs font-mono font-medium">{c.name}.sol</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs font-mono hidden md:block">
                      {c.addr.slice(0, 6)}...{c.addr.slice(-4)}
                    </span>
                    <ExternalLink size={11} className="text-gray-600 group-hover:text-gold transition-colors" />
                  </div>
                </a>
              ))}
            </div>
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
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" /> Fatwa IPFS: Qm...n7c2 (ShariahGuard.fatwaIPFS[USDC])
            </span>
          </div>
        </div>

        {/* Governance */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 mb-8">
          <h2 className="text-white font-bold text-xl mb-4">Dual-Track Governance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-blue-400 text-sm font-semibold mb-2">Technical Track</div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Token holder DAO vote (BRKX) with 48-hour timelock. Controls protocol
                upgrades, fee parameters, and technical changes. BRKX holders earn
                reduced trading fees (2.5–5bps) and governance rights.
              </p>
            </div>
            <div>
              <div className="text-gold text-sm font-semibold mb-2">Shariah Track</div>
              <p className="text-gray-400 text-sm leading-relaxed">
                3-of-5 AAOIFI-certified scholar multisig. Controls asset listing, leverage
                limits, and compliance parameters. Cannot be overridden by token holders.
                Annual re-certification required. Every approved asset linked to its
                fatwa document on-chain via ShariahGuard.fatwaIPFS.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gold/10 border border-gold/20 rounded-2xl p-8 text-center mb-16">
          <h3 className="text-2xl font-bold text-white mb-3">The World&apos;s First Islamic Financial System On-Chain</h3>
          <p className="text-gray-400 mb-2 max-w-xl mx-auto">
            13 contracts. 177 tests. 3 papers. Perpetuals, sukuk, takaful, and credit derivatives —
            all priced without interest, all on-chain, all live.
          </p>
          <p className="text-gray-600 text-sm mb-6 max-w-xl mx-auto">
            Try the testnet. Read the proof. Talk to us if you&apos;re interested in the opportunity.
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
            <a
              href="https://github.com/Arcus-Quant-Fund/BarakaDapp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 border border-gold/30 hover:border-gold text-gold font-semibold rounded-xl transition-colors"
            >
              View on GitHub <ExternalLink size={18} />
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 border border-gray-700 hover:border-gold/50 text-gray-300 hover:text-white font-semibold rounded-xl transition-colors"
            >
              Investor Enquiries <ArrowRight size={18} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
