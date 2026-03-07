"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Extract access_token from URL hash (Supabase puts it there)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const type = params.get("type");
    if (token && type === "recovery") {
      setAccessToken(token);
    } else {
      setError("Invalid or expired reset link. Please request a new one.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, newPassword: password }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to reset password. Try requesting a new link.");
      } else {
        setDone(true);
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="Arcus Quant Fund" width={180} height={60} className="object-contain" />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={44} className="text-green-400 mx-auto mb-4" strokeWidth={1.5} />
              <h1 className="text-xl font-bold text-white mb-2">Password Updated</h1>
              <p className="text-gray-400 text-sm">Redirecting you to login…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-1">Set New Password</h1>
              <p className="text-gray-500 text-sm mb-6">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pr-10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#f8ac07] transition-colors"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#f8ac07] transition-colors"
                  />
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !accessToken}
                  className="w-full py-3 bg-[#f8ac07] hover:bg-[#e09c06] text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : "Update Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
