import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shield, BookOpen, ExternalLink } from "lucide-react";

export default function BarakaLandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-2xl mx-auto text-center">
        <Image
          src="/baraka-logo.png"
          alt="Baraka"
          width={200}
          height={200}
          className="mx-auto mb-8"
          priority
        />

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
          <span className="gradient-text">Baraka</span>
        </h1>

        <p className="text-xl text-gray-300 font-medium mb-4">
          The world&apos;s first Shariah-compliant perpetual futures protocol.
        </p>

        <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Zero interest by mathematical proof. Perpetuals, everlasting options, perpetual sukuk,
          mutual takaful, and Islamic credit default swaps &mdash; all priced without riba.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Contracts", value: "13" },
            { label: "Tests Passing", value: "177/177" },
            { label: "SSRN Papers", value: "6" },
            { label: "Testnet", value: "Live" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-gray-500 text-xs">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            { icon: <Shield className="text-gold" size={20} />, title: "Shariah-Compliant", desc: "Zero interest hardcoded. Mathematically proven riba-free." },
            { icon: <BookOpen className="text-gold" size={20} />, title: "Peer-Reviewed", desc: "6 papers submitted to SSRN. Built on original academic research." },
            { icon: <ExternalLink className="text-gold" size={20} />, title: "On-Chain", desc: "13 smart contracts deployed on Arbitrum Sepolia testnet." },
          ].map((c) => (
            <div key={c.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-left">
              <div className="mb-3">{c.icon}</div>
              <h3 className="text-white font-semibold text-sm mb-1">{c.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="https://arcusquantfund.com/dapp"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-white font-semibold rounded-xl transition-colors"
          >
            Learn More <ArrowRight size={18} />
          </Link>
          <Link
            href="https://arcusquantfund.com/contact"
            className="inline-flex items-center gap-2 px-8 py-4 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-xl transition-colors"
          >
            Contact Us
          </Link>
        </div>

        <p className="text-gray-600 text-xs mt-12">
          A product of <Link href="https://arcusquantfund.com" className="text-gold hover:text-gold-dark transition-colors">Arcus Quant Fund</Link>
        </p>
      </div>
    </div>
  );
}
