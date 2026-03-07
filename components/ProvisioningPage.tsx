"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProvisioningPage() {
  const router = useRouter();

  // Poll every 20 seconds — server component re-runs and if bot_id is now set,
  // it will render the real dashboard instead of this page.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-full bg-blue-900/40 border border-blue-700 flex items-center justify-center mx-auto mb-6 animate-pulse">
          <span className="text-3xl">⏳</span>
        </div>
        <h1 className="text-white text-2xl font-bold mb-3">Bot Being Provisioned</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-2">
          Your trading bot is being set up on our servers. This usually takes less than 5 minutes.
          This page refreshes automatically — no need to do anything.
        </p>
        <p className="text-gray-600 text-xs mb-6">Checking for updates every 20 seconds…</p>
        <p className="text-gray-600 text-xs">
          Taking longer than expected? Email{" "}
          <a href="mailto:info@arcusquantfund.com" className="text-[#f8ac07] hover:underline">
            info@arcusquantfund.com
          </a>
        </p>
      </div>
    </div>
  );
}
