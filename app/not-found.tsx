import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-grid relative overflow-hidden flex items-center justify-center px-6">
      <div className="glow-orb-gold" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.3, width: "500px", height: "500px" }} />

      <div className="relative text-center max-w-md">
        <Image src="/logo.webp" alt="Arcus Quant Fund" width={140} height={47} className="object-contain mx-auto mb-8" />

        <p className="text-gold text-sm font-semibold tracking-widest uppercase mb-3">404</p>
        <h1 className="text-3xl font-black text-white mb-3">Page Not Found</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 bg-gold hover:bg-gold-dark text-black font-semibold rounded-xl transition-all hover:shadow-[0_6px_24px_rgba(248,172,7,0.35)] hover:-translate-y-0.5 text-sm"
          >
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-xl transition-colors text-sm"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
