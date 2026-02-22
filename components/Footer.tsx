import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-black mt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-3">
              <Image src="/logo.png" alt="Arcus Quant Fund" width={130} height={44} className="rounded bg-white px-2 py-1" />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Systematic algorithmic trading strategies for high-net-worth individuals.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-gray-300 font-medium text-sm mb-3">Navigation</p>
            <div className="flex flex-col gap-2">
              {[
                { href: "/about", label: "About" },
                { href: "/how-it-works", label: "How It Works" },
                { href: "/strategies", label: "Strategies" },
                { href: "/track-record", label: "Track Record" },
                { href: "/contact", label: "Contact" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-gray-300 font-medium text-sm mb-3">Contact</p>
            <div className="flex flex-col gap-2 text-sm text-gray-400">
              <a href="mailto:contact@arcusquantfund.com" className="hover:text-white transition-colors">
                contact@arcusquantfund.com
              </a>
              <span>arcusquantfund.com</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} Arcus Quant Fund. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs">
            Past performance does not guarantee future results. Trading involves risk.
          </p>
        </div>
      </div>
    </footer>
  );
}
