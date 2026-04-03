"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setSuccess("Account created! Check your email to confirm, then sign in.");
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Banner */}
      <header className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-red-950 to-zinc-900 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-80 h-80 pointer-events-none select-none">
          <svg viewBox="0 0 200 200" className="w-full h-full opacity-[0.08]">
            <path d="M 5 100 A 95 95 0 0 1 195 100" fill="#CC0000" />
            <path d="M 5 100 A 95 95 0 0 0 195 100" fill="#EEEEEE" />
            <rect x="5" y="88" width="190" height="24" fill="#111" />
            <circle cx="100" cy="100" r="28" fill="#111" />
            <circle cx="100" cy="100" r="17" fill="#EEEEEE" />
            <circle cx="100" cy="100" r="95" fill="none" stroke="#111" strokeWidth="4" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_16px_rgba(204,0,0,0.6)]">
                <path d="M 5 50 A 45 45 0 0 1 95 50 Z" fill="#CC0000" />
                <path d="M 5 50 A 45 45 0 0 0 95 50 Z" fill="#F2F2F2" />
                <rect x="5" y="44" width="90" height="12" fill="#1a1a1a" />
                <circle cx="50" cy="50" r="14" fill="#1a1a1a" />
                <circle cx="50" cy="50" r="8.5" fill="#F2F2F2" />
                <circle cx="46.5" cy="46.5" r="2.5" fill="white" opacity="0.7" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a1a" strokeWidth="3.5" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-red-400/70 uppercase tracking-[0.4em] mb-1">
                PokeProfit
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-none">
                <span className="text-[#FFCB05]">{mode === "signin" ? "Sign" : "Create"}</span>
                <span className="text-white"> {mode === "signin" ? "In" : "Account"}</span>
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                {mode === "signin" ? "Access your inventory from any device" : "Start tracking your collection"}
              </p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/60 to-transparent" />
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-2">🃏</div>
              <h2 className="text-lg font-black text-white">
                {mode === "signin" ? "Welcome back" : "Join PokeProfit"}
              </h2>
            </div>

            {error && (
              <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl px-4 py-3 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-slate-600"
                />
              </div>

              {mode === "signup" && (
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-slate-600"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-black py-3 rounded-xl text-sm transition shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-600 border-t-slate-900 rounded-full animate-spin" />
                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                  </span>
                ) : mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="text-center text-sm text-slate-500">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => { setMode("signup"); setError(null); setSuccess(null); }}
                    className="text-yellow-400 hover:text-yellow-300 font-semibold transition"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => { setMode("signin"); setError(null); setSuccess(null); }}
                    className="text-yellow-400 hover:text-yellow-300 font-semibold transition"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
