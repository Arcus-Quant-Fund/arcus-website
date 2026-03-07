import Link from "next/link";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    n: "01",
    title: "Start Your Application",
    desc: "Click \"Get Started\" and fill in your details — name, email, country, and estimated starting capital. The entire onboarding is self-service and guided step-by-step.",
    detail: "Takes about 15 minutes total. No call required — but we're happy to jump on one if you'd like.",
  },
  {
    n: "02",
    title: "Review & Accept Agreements",
    desc: "Read and accept three agreements directly in the signup flow: an NDA, a Participation & Service Agreement, and a Risk Disclosure Statement. These protect both parties and clearly outline fee structure, responsibilities, and exit terms.",
    detail: "All reviewed and accepted digitally within the signup process.",
  },
  {
    n: "03",
    title: "Open a Binance Sub-Account",
    desc: "We recommend opening a dedicated Binance sub-account for Arcus to trade on. This keeps your trading funds completely separate from your personal assets, and gives you clear visibility and one-click shutdown at any time.",
    detail: "Takes 5 minutes. Step-by-step instructions are shown during signup.",
  },
  {
    n: "04",
    title: "Fund & Enable Margin",
    desc: "Transfer USDT into your sub-account and enable Isolated Margin trading for the XRPUSDT pair. Isolated margin means potential losses are capped per position — your total balance is never at risk on a single trade.",
    detail: "Recommended minimum: $1,000 USD equivalent.",
  },
  {
    n: "05",
    title: "Create & Submit API Keys",
    desc: "Generate a trade-only API key (with IP restrictions) and paste it into the signup form. Our system instantly validates your Binance permissions — ensuring withdrawals are disabled, margin trading is enabled, and IPs are whitelisted correctly.",
    detail: "Automated validation. Instant feedback if anything needs to be adjusted.",
  },
  {
    n: "06",
    title: "Bot Activated Automatically",
    desc: "Once your application is approved, your trading bot is provisioned and deployed automatically on our servers. You receive login credentials to your personal client dashboard where you can monitor every trade, position, and P&L in real time.",
    detail: "Usually live within 24 hours of submission.",
  },
  {
    n: "07",
    title: "Monthly Reports & Fees",
    desc: "At the end of each month, you receive a detailed performance report with full financial statements. Our performance fee (35%) is charged only on net profits — if you don't profit, we don't charge.",
    detail: "No management fee. No monthly charges. Pure performance alignment.",
  },
];

const faqs = [
  {
    q: "What is the minimum account size?",
    a: "The recommended minimum is $1,000 USD equivalent. Higher capital enables more positions and better diversification across market conditions.",
  },
  {
    q: "Why do you recommend a sub-account?",
    a: "A dedicated Binance sub-account keeps your Arcus trading funds completely separate from your personal assets. It gives you clear performance visibility, and you can shut everything down instantly by deleting the API key — your main account is never touched.",
  },
  {
    q: "Can I withdraw my funds at any time?",
    a: "Yes. Your capital is in your own Binance account. You can withdraw at any time, though mid-cycle withdrawals may affect open positions.",
  },
  {
    q: "What markets do you trade?",
    a: "Primarily XRP/USDT on Binance using an isolated margin strategy. Our DC VWAP system identifies trend reversals and manages positions with automated risk controls.",
  },
  {
    q: "What is your performance fee?",
    a: "35% on net monthly profits. No management fee, no fixed charges. We only earn when you earn. A high-water mark ensures no fee is charged on previously lost capital.",
  },
  {
    q: "Can Arcus withdraw my funds?",
    a: "No. Your API key is configured with trade-only permissions and restricted to our server IPs. Withdrawal permissions are never requested and are explicitly disabled.",
  },
  {
    q: "How do I monitor my account?",
    a: "You get a private client dashboard at arcusquantfund.com/dashboard showing balance, P&L, open positions, and trade history — updated in real time. All trades are also visible in your Binance app.",
  },
  {
    q: "Can I stop at any time?",
    a: "Yes. Simply delete the API key on Binance — the bot stops executing within seconds. You keep all your funds and there are no exit fees or penalties.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            How It <span className="gradient-text">Works</span>
          </h1>
          <p className="text-gray-400 text-lg">From signup to live trading — self-service, fully guided, under 24 hours.</p>
        </div>

        {/* Steps */}
        <div className="relative mb-20">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-800" />
          <div className="flex flex-col gap-10">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-6 relative">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white font-bold text-sm z-10">
                  {s.n}
                </div>
                <div className="pt-1 pb-2">
                  <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-400 leading-relaxed mb-2">{s.desc}</p>
                  <p className="text-gold/70 text-sm">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fee structure */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Fee Structure</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Management Fee", value: "0%" },
              { label: "Monthly Charge", value: "$0" },
              { label: "Performance Fee", value: "35%" },
              { label: "Charged On", value: "Net Profit" },
            ].map((f) => (
              <div key={f.label} className="text-center p-4 bg-gray-800/50 rounded-xl">
                <div className="text-2xl font-bold text-gold mb-1">{f.value}</div>
                <div className="text-gray-400 text-xs">{f.label}</div>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-4 text-center">
            High-water mark applies. No fee charged until previous losses are fully recovered.
          </p>
        </div>

        {/* FAQs */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-5">
            {faqs.map((f) => (
              <div key={f.q} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2">{f.q}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mb-20 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors"
          >
            Get Started — Sign Up Now <ArrowRight size={18} />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold rounded-xl transition-colors"
          >
            Have Questions? Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
