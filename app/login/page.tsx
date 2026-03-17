"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setLoading(false);
        setError("Invalid email or password.");
      } else {
        // Show welcome animation, then navigate
        setLoading(false);
        setSuccess(true);
        setTimeout(() => { window.location.href = "/dashboard"; }, 2200);
      }
    } catch {
      setLoading(false);
      setError("Network error — please check your connection and try again.");
    }
  }

  return (
    <>
      {/* ── Welcome overlay ────────────────────────────────────────────────── */}
      {success && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 animate-fade-in">
          <div className="flex flex-col items-center gap-5 animate-slide-up">
            <Image src="/logo.webp" alt="Arcus Quant Fund" width={160} height={54} className="object-contain opacity-90" />
            <CheckCircle2 size={52} className="text-green-400 animate-scale-in" strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-gray-500 text-sm tracking-widest uppercase mb-1">Welcome back</p>
              <h1 className="text-2xl font-bold text-white">{email}</h1>
            </div>
            {/* Progress bar */}
            <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-gold rounded-full animate-progress" />
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-sm -mt-2">
              <Loader2 size={14} className="animate-spin" />
              Loading your dashboard…
            </div>
          </div>
        </div>
      )}

      {/* ── Login form ─────────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 relative overflow-hidden">
        <div className="glow-orb-gold" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.4, width: "400px", height: "400px" }} />
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <Image src="/logo.webp" alt="Arcus Quant Fund" width={180} height={60} className="object-contain" />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <h1 className="text-xl font-bold text-white mb-1">Client Login</h1>
            <p className="text-gray-500 text-sm mb-6">Access your portfolio dashboard</p>

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

              <div>
                <label className="block text-gray-400 text-sm mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pr-10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || success}
                className="w-full py-3 bg-gold hover:bg-gold-dark text-black font-semibold rounded-xl transition-all hover:shadow-[0_6px_24px_rgba(248,172,7,0.35)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
                  : "Sign In"}
              </button>
            </form>

            <div className="flex items-center justify-between mt-5">
              <a href="/forgot-password" className="text-gray-500 text-xs hover:text-[#f8ac07] transition-colors">
                Forgot password?
              </a>
              <p className="text-gray-600 text-xs">
                Don&apos;t have access?{" "}
                <a href="/signup" className="text-gold hover:text-gold-light transition-colors">
                  Apply here
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
