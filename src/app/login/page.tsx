"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const signInWithGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
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
                <span className="text-[#FFCB05]">Sign</span>
                <span className="text-white"> In</span>
              </h1>
              <p className="text-slate-400 text-sm mt-2">Access your inventory from any device</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/60 to-transparent" />
      </header>

      {/* Sign in card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="text-5xl">🃏</div>
              <h2 className="text-xl font-black text-white">Welcome to PokeProfit</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Sign in to sync your card inventory across all your devices.
              </p>
            </div>

            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-bold px-5 py-3.5 rounded-xl text-sm transition shadow-lg"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {loading ? "Redirecting…" : "Continue with Google"}
            </button>

            <p className="text-center text-xs text-slate-600">
              Your inventory is private and only visible to you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
