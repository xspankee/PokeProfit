"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const BrowseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <rect x="2" y="7" width="15" height="13" rx="2" />
    <path d="M6 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-3" />
  </svg>
);

const InventoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" rx="1" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const AnalysisIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const tabs = [
  { href: "/", label: "Browse", Icon: BrowseIcon },
  { href: "/inventory", label: "Inventory", Icon: InventoryIcon },
  { href: "/analysis", label: "Analysis", Icon: AnalysisIcon },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on route change
  useEffect(() => setOpen(false), [pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Hide nav on login page
  if (pathname === "/login") return null;

  return (
    <>
      {/* ── Menu button — fixed top right ── */}
      <div ref={menuRef} className="fixed top-3 right-3 z-50" style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition shadow-lg"
          aria-label="Menu"
        >
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-12 right-0 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            {tabs.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition hover:bg-slate-800 ${
                    active ? "text-yellow-400" : "text-slate-300"
                  }`}
                >
                  <Icon />
                  {label}
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                </Link>
              );
            })}
            <div className="border-t border-slate-800 mx-3" />
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom tab bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch justify-around">
          {tabs.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-3 transition-colors active:opacity-70 ${
                  active ? "text-yellow-400" : "text-slate-500"
                }`}
              >
                <Icon />
                <span className={`text-[10px] font-semibold tracking-wide ${active ? "text-yellow-400" : "text-slate-500"}`}>
                  {label}
                </span>
                {active && (
                  <span className="absolute top-0 w-8 h-[2px] bg-yellow-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
