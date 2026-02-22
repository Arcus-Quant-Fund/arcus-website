import Link from "next/link";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    n: "01",
    title: "Schedule an Intro Call",
    desc: "Book a free 30-minute call via Calendly. We discuss your investment goals, risk appetite, account size, and whether our strategies are a good fit for you.",
    detail: "No commitment required. Completely confidential.",
  },
  {
    n: "02",
    title: "Sign Agreements",
    desc: "If we're aligned, you sign an NDA and a pilot agreement. These documents protect both parties and clearly outline fee structure, responsibilities, and exit terms.",
    detail: "Agreements reviewed and signed digitally. Usually done within 24 hours.",
  },
  {
    n: "03",
    title: "Open Your Account",
    desc: "You open your own account on the exchange or broker we'll be trading on (e.g., Binance, Bybit, Interactive Brokers). We guide you through the setup.",
    detail: "Your capital stays in your name. We have zero access to withdrawals.",
  },
  {
    n: "04",
    title: "Grant API Access",
    desc: "You generate a trade-only API key and share it with us. This key can execute trades but cannot withdraw funds — your capital is fully protected.",
    detail: "Takes 5 minutes. We provide step-by-step instructions.",
  },
  {
    n: "05",
    title: "Bot Goes Live",
    desc: "The strategy is deployed on your account. You receive login credentials to your personal client dashboard where you can monitor every trade, position, and P&L in real time.",
    detail: "Usually live within 48 hours of signing.",
  },
  {
    n: "06",
    title: "Monthly Reports & Fees",
    desc: "At the end of each month, you receive a detailed performance report. Our performance fee (typically 25-30%) is charged only on net profits — if you don't profit, we don't charge.",
    detail: "No management fee. No monthly charges. Pure performance alignment.",
  },
];

const faqs = [
  {
    q: "What is the minimum account size?",
    a: "Currently $10,000 USD equivalent. This ensures our strategies can be executed with proper position sizing and risk management.",
  },
  {
    q: "Can I withdraw my funds at any time?",
    a: "Yes. Your capital is in your own account. You can withdraw at any time, though mid-cycle withdrawals may affect open positions.",
  },
  {
    q: "What markets do you trade?",
    a: "Primarily cryptocurrency perpetual futures (Binance, Bybit) and US equities. Strategy allocation depends on your risk profile.",
  },
  {
    q: "What is your performance fee?",
    a: "25% on net monthly profits. No management fee, no fixed charges. We only earn when you earn.",
  },
  {
    q: "How do I monitor my account?",
    a: "You get a private client dashboard at arcusquantfund.com/dashboard showing balance, P&L, open positions, and trade history — updated in real time.",
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
          <p className="text-gray-400 text-lg">From first call to live trading in under a week.</p>
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
              { label: "Performance Fee", value: "25%" },
              { label: "Charged On", value: "Net Profit" },
            ].map((f) => (
              <div key={f.label} className="text-center p-4 bg-gray-800/50 rounded-xl">
                <div className="text-2xl font-bold text-gold mb-1">{f.value}</div>
                <div className="text-gray-400 text-xs">{f.label}</div>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-4 text-center">
            High-water mark applies. No fee charged until previous losses are recovered.
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
        <div className="text-center mb-20">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors"
          >
            Schedule Your Intro Call <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
