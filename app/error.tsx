"use client";

import Image from "next/image";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-grid relative overflow-hidden flex items-center justify-center px-6">
      <div className="glow-orb-gold" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.3, width: "500px", height: "500px" }} />

      <div className="relative text-center max-w-md">
        <Image src="/logo.webp" alt="Arcus Quant Fund" width={140} height={47} className="object-contain mx-auto mb-8" />

        <p className="text-red-400 text-sm font-semibold tracking-widest uppercase mb-3">Error</p>
        <h1 className="text-3xl font-black text-white mb-3">Something Went Wrong</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          An unexpected error occurred. Our team has been notified.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gold hover:bg-gold-dark text-black font-semibold rounded-xl transition-all hover:shadow-[0_6px_24px_rgba(248,172,7,0.35)] hover:-translate-y-0.5 text-sm cursor-pointer"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-3 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-xl transition-colors text-sm"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
