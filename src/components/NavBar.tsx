"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
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
  );
}
