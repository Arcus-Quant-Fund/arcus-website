"use client";
import { useState } from "react";
import Image from "next/image";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Something went wrong. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 relative overflow-hidden">
      <div className="glow-orb-gold" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.4, width: "400px", height: "400px" }} />
      <div className="w-full max-w-sm relative">
        <div className="flex justify-center mb-8">
          <Image src="/logo.webp" alt="Arcus Quant Fund" width={180} height={60} className="object-contain" />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <CheckCircle2 size={44} className="text-green-400 mx-auto mb-4" strokeWidth={1.5} />
              <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                If an account exists for <span className="text-white">{email}</span>, you&apos;ll receive a
                password reset link within a few minutes.
              </p>
              <Link href="/login" className="text-[#f8ac07] text-sm hover:underline flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-1">Reset Password</h1>
              <p className="text-gray-500 text-sm mb-6">
                Enter your account email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold transition-colors"
                  />
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gold hover:bg-gold-dark text-black font-semibold rounded-xl transition-all hover:shadow-[0_6px_24px_rgba(248,172,7,0.35)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : "Send Reset Link"}
                </button>
              </form>

              <Link href="/login" className="text-gray-600 text-xs text-center mt-5 flex items-center justify-center gap-1 hover:text-gray-400 transition-colors">
                <ArrowLeft size={12} /> Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
