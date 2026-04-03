"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryEntry {
  id: string;
  cardId: string;
  cardName: string;
  setName: string;
  rarity?: string;
  imageSmall: string;
  pricePaid: number;
  addedAt: string;
}

interface SearchResult {
  id: string;
  name: string;
  set: { name: string; id: string };
  rarity?: string;
  images: { small: string };
  tcgplayer?: { prices?: Record<string, { market?: number }> };
  cardmarket?: { prices?: { averageSellPrice?: number; trendPrice?: number } };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCardPrice(card: {
  tcgplayer?: { prices?: Record<string, { market?: number }> };
  cardmarket?: { prices?: { averageSellPrice?: number; trendPrice?: number } };
}): number | null {
  const tcg = card.tcgplayer?.prices;
  if (tcg) {
    const markets = Object.values(tcg)
      .map((v) => v.market)
      .filter((p): p is number => typeof p === "number" && p > 0);
    if (markets.length > 0) return Math.min(...markets);
  }
  const cm = card.cardmarket?.prices;
  if (cm?.averageSellPrice && cm.averageSellPrice > 0) return cm.averageSellPrice;
  if (cm?.trendPrice && cm.trendPrice > 0) return cm.trendPrice;
  return null;
}

// ─── Add Card Modal ───────────────────────────────────────────────────────────

function AddCardModal({
  onAdd,
  onClose,
}: {
  onAdd: (entry: Omit<InventoryEntry, "id" | "addedAt">) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [pricePaid, setPricePaid] = useState("");

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setSelected(null);
    try {
      const res = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=name:*${encodeURIComponent(query)}*&pageSize=20&orderBy=name`
      );
      const data = await res.json();
      setResults(data.data || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = () => {
    if (!selected || pricePaid === "") return;
    onAdd({
      cardId: selected.id,
      cardName: selected.name,
      setName: selected.set.name,
      rarity: selected.rarity,
      imageSmall: selected.images.small,
      pricePaid: parseFloat(pricePaid) || 0,
    });
  };

  const marketPrice = selected ? getCardPrice(selected) : null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-bold text-white">Add Card to Inventory</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search card name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-slate-600"
            />
            <button
              onClick={search}
              disabled={searching}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-sm transition"
            >
              {searching ? "…" : "Search"}
            </button>
          </div>

          {results.length > 0 && !selected && (
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {results.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelected(card)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800 transition text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.images.small} alt={card.name} className="w-8 h-11 object-cover rounded" />
                  <div>
                    <div className="text-sm font-semibold text-white">{card.name}</div>
                    <div className="text-xs text-slate-500">
                      {card.set.name} · {card.rarity ?? "Unknown rarity"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && !searching && query && (
            <p className="text-center text-slate-500 text-sm py-2">No results found.</p>
          )}

          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.images.small} alt={selected.name} className="w-10 h-14 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{selected.name}</div>
                  <div className="text-xs text-slate-400">
                    {selected.set.name} · {selected.rarity ?? "Unknown"}
                  </div>
                  {marketPrice !== null && (
                    <div className="text-xs text-yellow-400 mt-0.5">Market: ${marketPrice.toFixed(2)}</div>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-slate-500 hover:text-white transition flex-shrink-0"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                  What did you pay? ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={pricePaid}
                  onChange={(e) => setPricePaid(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-slate-600"
                />
              </div>

              <button
                onClick={handleAdd}
                disabled={pricePaid === ""}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold py-2.5 rounded-xl text-sm transition"
              >
                Add to Inventory
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number | null>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Auth check + load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
      }
    });
  }, []);

  // Row mapper: DB row → InventoryEntry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowToEntry = (row: any): InventoryEntry => ({
    id: row.id,
    cardId: row.card_id,
    cardName: row.card_name,
    setName: row.set_name,
    rarity: row.rarity ?? undefined,
    imageSmall: row.image_small,
    pricePaid: parseFloat(row.price_paid),
    addedAt: row.added_at,
  });

  // Load inventory from Supabase
  useEffect(() => {
    if (!user) return;
    setLoadingInventory(true);
    supabase
      .from("inventory")
      .select("*")
      .order("added_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setInventory(data.map(rowToEntry));
        setLoadingInventory(false);
      });
  }, [user]);

  // Fetch live market prices
  const fetchMarketPrices = useCallback(async (items: InventoryEntry[]) => {
    const uniqueIds = [...new Set(items.map((i) => i.cardId))];
    if (uniqueIds.length === 0) return;
    setLoadingPrices(true);
    const prices: Record<string, number | null> = {};
    await Promise.all(
      uniqueIds.map(async (cardId) => {
        try {
          const res = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`);
          const data = await res.json();
          prices[cardId] = getCardPrice(data.data);
        } catch {
          prices[cardId] = null;
        }
      })
    );
    setMarketPrices(prices);
    setLoadingPrices(false);
  }, []);

  useEffect(() => {
    if (inventory.length > 0) fetchMarketPrices(inventory);
    else setMarketPrices({});
  }, [inventory, fetchMarketPrices]);

  const addCard = async (entry: Omit<InventoryEntry, "id" | "addedAt">) => {
    if (!user) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const addedAt = new Date().toISOString();

    const { error } = await supabase.from("inventory").insert({
      id,
      user_id: user.id,
      card_id: entry.cardId,
      card_name: entry.cardName,
      set_name: entry.setName,
      rarity: entry.rarity ?? null,
      image_small: entry.imageSmall,
      price_paid: entry.pricePaid,
      added_at: addedAt,
    });

    if (!error) {
      setInventory((prev) => [
        ...prev,
        { ...entry, id, addedAt },
      ]);
    }
  };

  const removeCard = async (id: string) => {
    await supabase.from("inventory").delete().eq("id", id);
    setInventory((prev) => prev.filter((i) => i.id !== id));
  };

  const updatePricePaid = async (id: string, newPrice: number) => {
    await supabase.from("inventory").update({ price_paid: newPrice }).eq("id", id);
    setInventory((prev) => prev.map((i) => (i.id === id ? { ...i, pricePaid: newPrice } : i)));
  };

  const refreshInventory = useCallback(async () => {
    if (!user) return;
    setLoadingInventory(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("added_at", { ascending: true });
    if (!error && data) setInventory(data.map(rowToEntry));
    setLoadingInventory(false);
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleGroup = (cardId: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });

  const stats = useMemo(() => {
    let totalPaid = 0;
    let totalMarket = 0;
    for (const item of inventory) {
      totalPaid += item.pricePaid;
      const mp = marketPrices[item.cardId];
      if (mp != null) totalMarket += mp;
    }
    return { totalPaid, totalMarket, pl: totalMarket - totalPaid };
  }, [inventory, marketPrices]);

  const hasPrices = Object.keys(marketPrices).length > 0;

  const groupedInventory = useMemo(() => {
    const map = new Map<
      string,
      {
        cardId: string;
        cardName: string;
        setName: string;
        rarity?: string;
        imageSmall: string;
        copies: InventoryEntry[];
      }
    >();
    for (const item of inventory) {
      if (!map.has(item.cardId)) {
        map.set(item.cardId, {
          cardId: item.cardId,
          cardName: item.cardName,
          setName: item.setName,
          rarity: item.rarity,
          imageSmall: item.imageSmall,
          copies: [],
        });
      }
      map.get(item.cardId)!.copies.push(item);
    }
    return Array.from(map.values());
  }, [inventory]);

  if (!user || loadingInventory) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-emerald-950 to-zinc-900 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-[0.06]">
          <svg className="w-full h-full" viewBox="0 0 800 120" preserveAspectRatio="none">
            <polyline points="0,100 120,80 240,90 360,50 480,65 600,30 720,45 800,20" fill="none" stroke="#34d399" strokeWidth="2.5" />
            <polyline points="0,115 120,100 240,108 360,72 480,82 600,52 720,65 800,42" fill="none" stroke="#34d399" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="absolute -right-16 top-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none select-none opacity-[0.05]">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="95" fill="none" stroke="#34d399" strokeWidth="4" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="#34d399" strokeWidth="2" />
            <circle cx="100" cy="100" r="28" fill="none" stroke="#34d399" strokeWidth="4" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-emerald-400/70 uppercase tracking-[0.4em] mb-1">
              PokeProfit
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-none">
              <span className="text-[#FFCB05]">My</span>
              <span className="text-white"> Inventory</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {inventory.length} card{inventory.length !== 1 ? "s" : ""} tracked
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Refresh */}
            <button
              onClick={refreshInventory}
              disabled={loadingInventory}
              title="Refresh inventory"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${loadingInventory ? "animate-spin" : ""}`}>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
            </button>
            {/* User avatar + sign out */}
            <div className="flex items-center gap-2">
              {user.user_metadata?.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.user_metadata.avatar_url}
                  alt="avatar"
                  className="w-7 h-7 rounded-full border border-slate-700 hidden sm:block"
                />
              )}
              <button
                onClick={signOut}
                className="text-xs text-slate-400 hover:text-white transition px-3 py-2 rounded-lg hover:bg-slate-800"
              >
                Sign out
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-lg"
            >
              + Add Card
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-600/50 to-transparent" />
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Summary stats */}
        {inventory.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800">
              <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest mb-1">Total Paid</div>
              <div className="text-xl sm:text-2xl font-black text-white">${stats.totalPaid.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800">
              <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest mb-1">Market Value</div>
              <div className="text-xl sm:text-2xl font-black text-yellow-400">
                {loadingPrices ? (
                  <span className="text-slate-500 text-base animate-pulse">Loading…</span>
                ) : hasPrices ? (
                  `$${stats.totalMarket.toFixed(2)}`
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>
            </div>
            <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800">
              <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest mb-1">Profit / Loss</div>
              <div className={`text-xl sm:text-2xl font-black ${stats.pl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {loadingPrices ? (
                  <span className="text-slate-500 text-base animate-pulse">Loading…</span>
                ) : hasPrices ? (
                  `${stats.pl >= 0 ? "+" : ""}$${stats.pl.toFixed(2)}`
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {inventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-lg font-medium text-slate-400 mb-2">No cards yet</p>
            <p className="text-sm text-slate-500 mb-6">Add cards from your collection to track their value</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm transition"
            >
              + Add Your First Card
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider">Card</th>
                    <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider hidden sm:table-cell">Set</th>
                    <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider hidden md:table-cell">Rarity</th>
                    <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider text-right">Paid</th>
                    <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider text-right">Market</th>
                    <th className="px-4 py-3 text-xs text-slate-500 uppercase tracking-wider text-right">P / L</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {groupedInventory.map((group) => {
                    const market = marketPrices[group.cardId];
                    const qty = group.copies.length;
                    const totalPaid = group.copies.reduce((s, c) => s + c.pricePaid, 0);
                    const totalMarket = market != null ? market * qty : null;
                    const totalPL = totalMarket != null ? totalMarket - totalPaid : null;
                    const isExpanded = expandedGroups.has(group.cardId);
                    const solo = group.copies[0];
                    const isEditingSolo = qty === 1 && editingId === solo?.id;

                    return (
                      <Fragment key={group.cardId}>
                        <tr className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {qty > 1 ? (
                                <button
                                  onClick={() => toggleGroup(group.cardId)}
                                  className="flex-shrink-0 relative group/img"
                                  title={isExpanded ? "Collapse" : "Expand copies"}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={group.imageSmall}
                                    alt={group.cardName}
                                    className="w-9 h-[50px] object-cover rounded shadow-md transition-opacity group-hover/img:opacity-70"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                    <span className="text-white text-[10px] font-bold">{isExpanded ? "▲" : "▼"}</span>
                                  </div>
                                </button>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={group.imageSmall}
                                  alt={group.cardName}
                                  className="w-9 h-[50px] object-cover rounded shadow-md flex-shrink-0"
                                />
                              )}
                              <div>
                                <span className="font-semibold text-white text-sm">{group.cardName}</span>
                                {qty > 1 && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">{qty} copies</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm hidden sm:table-cell">{group.setName}</td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {group.rarity && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-pink-900 text-pink-300">
                                {group.rarity}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {qty === 1 ? (
                              isEditingSolo ? (
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    updatePricePaid(solo.id, parseFloat(editPrice) || 0);
                                    setEditingId(null);
                                  }}
                                  className="flex justify-end items-center gap-1"
                                >
                                  <input
                                    autoFocus
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                    className="w-20 bg-slate-700 border border-yellow-500 text-white rounded px-2 py-1 text-xs text-right focus:outline-none"
                                  />
                                  <button type="submit" className="text-yellow-500 hover:text-yellow-300 transition px-1">✓</button>
                                  <button type="button" onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300 transition px-1">✕</button>
                                </form>
                              ) : (
                                <button
                                  onClick={() => { setEditingId(solo.id); setEditPrice(solo.pricePaid.toString()); }}
                                  title="Click to edit"
                                  className="text-white font-semibold hover:text-yellow-400 transition cursor-pointer"
                                >
                                  ${solo.pricePaid.toFixed(2)}
                                </button>
                              )
                            ) : (
                              <div>
                                <div className="text-white font-semibold">${totalPaid.toFixed(2)}</div>
                                <div className="text-[10px] text-slate-500">${(totalPaid / qty).toFixed(2)} avg</div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {loadingPrices ? (
                              <span className="text-slate-600 text-xs animate-pulse">…</span>
                            ) : market != null ? (
                              <div>
                                <div className="text-yellow-400">${(market * qty).toFixed(2)}</div>
                                {qty > 1 && <div className="text-[10px] text-slate-500">${market.toFixed(2)} ea</div>}
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {loadingPrices ? (
                              <span className="text-slate-600 text-xs animate-pulse">…</span>
                            ) : totalPL != null ? (
                              <span className={totalPL >= 0 ? "text-emerald-400" : "text-red-400"}>
                                {totalPL >= 0 ? "+" : ""}${totalPL.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {qty === 1 && (
                              <button
                                onClick={() => removeCard(solo.id)}
                                title="Remove"
                                className="text-slate-600 hover:text-red-400 transition text-sm"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>

                        {qty > 1 && isExpanded && group.copies.map((copy, idx) => {
                          const copyPL = market != null ? market - copy.pricePaid : null;
                          const isEditing = editingId === copy.id;
                          return (
                            <tr key={copy.id} className="border-b border-slate-800/50 bg-slate-950/50 hover:bg-slate-950/70 transition">
                              <td className="px-4 py-2 pl-10">
                                <div className="flex items-center gap-2">
                                  <div className="w-0.5 h-5 bg-slate-700 rounded-full flex-shrink-0" />
                                  <span className="text-xs text-slate-400 font-medium">Copy {idx + 1}</span>
                                </div>
                              </td>
                              <td className="hidden sm:table-cell" />
                              <td className="hidden md:table-cell" />
                              <td className="px-4 py-2 text-right">
                                {isEditing ? (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      updatePricePaid(copy.id, parseFloat(editPrice) || 0);
                                      setEditingId(null);
                                    }}
                                    className="flex justify-end items-center gap-1"
                                  >
                                    <input
                                      autoFocus
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={editPrice}
                                      onChange={(e) => setEditPrice(e.target.value)}
                                      className="w-20 bg-slate-700 border border-yellow-500 text-white rounded px-2 py-1 text-xs text-right focus:outline-none"
                                    />
                                    <button type="submit" className="text-yellow-500 hover:text-yellow-300 transition px-1">✓</button>
                                    <button type="button" onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300 transition px-1">✕</button>
                                  </form>
                                ) : (
                                  <button
                                    onClick={() => { setEditingId(copy.id); setEditPrice(copy.pricePaid.toString()); }}
                                    title="Click to edit"
                                    className="text-slate-300 text-sm hover:text-yellow-400 transition cursor-pointer"
                                  >
                                    ${copy.pricePaid.toFixed(2)}
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {loadingPrices ? (
                                  <span className="text-slate-600 text-xs animate-pulse">…</span>
                                ) : market != null ? (
                                  <span className="text-yellow-400 text-sm">${market.toFixed(2)}</span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right font-semibold text-sm">
                                {loadingPrices ? (
                                  <span className="text-slate-600 text-xs animate-pulse">…</span>
                                ) : copyPL != null ? (
                                  <span className={copyPL >= 0 ? "text-emerald-400" : "text-red-400"}>
                                    {copyPL >= 0 ? "+" : ""}${copyPL.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  onClick={() => removeCard(copy.id)}
                                  title="Remove this copy"
                                  className="text-slate-600 hover:text-red-400 transition text-sm"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCardModal
          onAdd={(entry) => {
            addCard(entry);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
