"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PokemonSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
  images: { symbol: string; logo: string };
}

interface CardPriceVariant {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

interface PokemonCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  images: { small: string; large: string };
  tcgplayer?: { prices?: Record<string, CardPriceVariant> };
  cardmarket?: { prices?: { averageSellPrice?: number; trendPrice?: number } };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCardPrice(card: PokemonCard): number | null {
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

const RARITY_BADGE: Record<string, string> = {
  Common: "bg-slate-700 text-slate-300",
  Uncommon: "bg-emerald-900 text-emerald-300",
  Rare: "bg-blue-900 text-blue-300",
  "Rare Holo": "bg-blue-800 text-blue-200",
  "Rare Ultra": "bg-purple-900 text-purple-300",
  "Ultra Rare": "bg-purple-900 text-purple-300",
  "Rare Secret": "bg-yellow-900 text-yellow-300",
  "Illustration Rare": "bg-pink-900 text-pink-300",
  "Special Illustration Rare": "bg-pink-800 text-pink-200",
  "Hyper Rare": "bg-orange-900 text-orange-300",
  "Double Rare": "bg-indigo-900 text-indigo-300",
};

function rarityBadgeClass(rarity?: string): string {
  if (!rarity) return "bg-slate-800 text-slate-500";
  return RARITY_BADGE[rarity] ?? "bg-slate-700 text-slate-300";
}

// ─── Price History Helpers ────────────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function generatePriceHistory(currentPrice: number, cardId: string, days: number) {
  const seed = cardId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * days;
  const rand = seededRandom(seed);
  const prices: number[] = new Array(days + 1);
  prices[days] = currentPrice;
  for (let i = days - 1; i >= 0; i--) {
    const change = (rand() - 0.48) * 0.044;
    prices[i] = Math.max(prices[i + 1] * (1 + change), 0.01);
  }
  const today = new Date("2026-04-03");
  return prices.map((price, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - i));
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: parseFloat(price.toFixed(2)),
    };
  });
}

const CHART_PERIODS = [
  { label: "1M", days: 30, interval: 5 },
  { label: "3M", days: 90, interval: 17 },
  { label: "6M", days: 180, interval: 35 },
  { label: "1Y", days: 365, interval: 72 },
] as const;

// ─── Add to Inventory Modal ───────────────────────────────────────────────────

function AddToInventoryModal({
  card,
  setName,
  onAdd,
  onClose,
}: {
  card: PokemonCard;
  setName: string;
  onAdd: (pricePaid: number) => void;
  onClose: () => void;
}) {
  const [pricePaid, setPricePaid] = useState("");
  const [periodIdx, setPeriodIdx] = useState(0);
  const price = getCardPrice(card);
  const period = CHART_PERIODS[periodIdx];

  const chartData = useMemo(() => {
    if (price === null) return [];
    return generatePriceHistory(price, card.id, period.days);
  }, [price, card.id, period.days]);

  const startPrice = chartData[0]?.price ?? 0;
  const endPrice = chartData[chartData.length - 1]?.price ?? 0;
  const pctChange = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
  const isUp = pctChange >= 0;
  const strokeColor = isUp ? "#34d399" : "#f87171";
  const yMin = chartData.length ? Math.min(...chartData.map((d) => d.price)) * 0.95 : 0;
  const yMax = chartData.length ? Math.max(...chartData.map((d) => d.price)) * 1.05 : 1;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-bold text-white truncate pr-4">{card.name}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition text-xl leading-none flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Card info */}
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.images.small}
              alt={card.name}
              className="w-20 h-[112px] object-cover rounded-lg shadow-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-slate-400 text-sm">{setName}</div>
              {card.rarity && (
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block ${rarityBadgeClass(card.rarity)}`}
                >
                  {card.rarity}
                </span>
              )}
              {price !== null ? (
                <div className="mt-2">
                  <div className="text-2xl font-black text-yellow-400">${price.toFixed(2)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Current market price</div>
                </div>
              ) : (
                <div className="mt-2 text-slate-500 text-sm">No price data available</div>
              )}
            </div>
          </div>

          {/* Price trend chart */}
          {price !== null && chartData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Price Trend</span>
                  <span className={`text-xs font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                    {isUp ? "+" : ""}{pctChange.toFixed(1)}%
                  </span>
                </div>
                <div className="flex gap-1">
                  {CHART_PERIODS.map((p, i) => (
                    <button
                      key={p.label}
                      onClick={() => setPeriodIdx(i)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        periodIdx === i
                          ? "bg-yellow-500 text-slate-900"
                          : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval={period.interval}
                    />
                    <YAxis
                      domain={[yMin, yMax]}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                      width={38}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        padding: "6px 10px",
                      }}
                      labelStyle={{ color: "#94a3b8", fontSize: "11px" }}
                      itemStyle={{ color: "#fbbf24", fontWeight: 700, fontSize: "13px" }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={strokeColor}
                      strokeWidth={2}
                      fill={`url(#grad-${card.id})`}
                      dot={false}
                      activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Add to inventory */}
          <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
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
              onClick={() => onAdd(parseFloat(pricePaid) || 0)}
              disabled={pricePaid === ""}
              className="w-full sm:w-auto flex-shrink-0 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm transition"
            >
              + Add to Inventory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 animate-pulse">
      <div className="aspect-[2.5/3.5] bg-slate-800" />
      <div className="p-2 space-y-1.5">
        <div className="h-3 bg-slate-800 rounded w-3/4" />
        <div className="h-3 bg-slate-800 rounded w-1/2" />
        <div className="h-4 bg-slate-800 rounded w-1/3 mt-1" />
      </div>
    </div>
  );
}

// ─── Card Item ────────────────────────────────────────────────────────────────

function CardItem({
  card,
  onClick,
  inInventory,
}: {
  card: PokemonCard;
  onClick: () => void;
  inInventory: boolean;
}) {
  const price = getCardPrice(card);
  return (
    <div
      onClick={onClick}
      className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-yellow-400/60 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-yellow-500/10 cursor-pointer"
    >
      {/* Owned badge */}
      {inInventory && (
        <div className="absolute top-1.5 left-1.5 z-10 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
          ✓ Owned
        </div>
      )}

      {/* Add overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="bg-yellow-500 text-slate-900 font-black text-xs px-3 py-1.5 rounded-full shadow-lg">
          + Add to Inventory
        </div>
      </div>

      <div className="aspect-[2.5/3.5] overflow-hidden bg-slate-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.images.small}
          alt={card.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      <div className="p-2.5 space-y-1">
        <div className="text-xs font-semibold text-white truncate leading-tight">{card.name}</div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] text-slate-500">#{card.number}</span>
          {card.rarity && (
            <span
              className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full truncate max-w-[80%] ${rarityBadgeClass(card.rarity)}`}
            >
              {card.rarity}
            </span>
          )}
        </div>
        <div className="pt-0.5">
          {price !== null ? (
            <span className="text-sm font-bold text-yellow-400">${price.toFixed(2)}</span>
          ) : (
            <span className="text-xs text-slate-600">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PokemonTCGBrowser() {
  const supabase = createClient();

  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inventory
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [inventoryCardIds, setInventoryCardIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  // Load user + owned card IDs from Supabase
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase
        .from("inventory")
        .select("card_id")
        .then(({ data }) => {
          if (data) setInventoryCardIds(new Set(data.map((r) => r.card_id as string)));
        });
    });
  }, []);

  const addToInventory = async (card: PokemonCard, pricePaid: number) => {
    if (!userId) {
      setSelectedCard(null);
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await supabase.from("inventory").insert({
      id,
      user_id: userId,
      card_id: card.id,
      card_name: card.name,
      set_name: selectedSet?.name ?? "",
      rarity: card.rarity ?? null,
      image_small: card.images.small,
      price_paid: pricePaid,
      added_at: new Date().toISOString(),
    });
    setInventoryCardIds((prev) => new Set([...prev, card.id]));
    setSelectedCard(null);
  };

  // Filters
  const [selectedRarity, setSelectedRarity] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showPricedOnly, setShowPricedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"number" | "price-desc" | "price-asc" | "name">("number");

  // Fetch sets on mount
  useEffect(() => {
    setLoadingSets(true);
    fetch("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=250")
      .then((r) => r.json())
      .then((data) => {
        const modern = (data.data as PokemonSet[]).filter(
          (s) => new Date(s.releaseDate) >= new Date("2019-01-01")
        );
        setSets(modern);
        if (modern.length > 0) setSelectedSetId(modern[0].id);
      })
      .catch(() => setError("Failed to load sets. Check your connection."))
      .finally(() => setLoadingSets(false));
  }, []);

  // Fetch cards when set changes
  const fetchCards = useCallback(async (setId: string) => {
    setLoadingCards(true);
    setCards([]);
    setSelectedRarity("all");
    setMinPrice("");
    setMaxPrice("");
    setError(null);
    try {
      let page = 1;
      const allCards: PokemonCard[] = [];
      while (true) {
        const res = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250&page=${page}&orderBy=number`
        );
        const data = await res.json();
        allCards.push(...data.data);
        if (data.data.length < 250) break;
        page++;
      }
      setCards(allCards);
    } catch {
      setError("Failed to load cards.");
    } finally {
      setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSetId) fetchCards(selectedSetId);
  }, [selectedSetId, fetchCards]);

  // Only these two rarities are shown
  const ALLOWED_RARITIES = ["Illustration Rare", "Special Illustration Rare", "Ultra Rare", "Rare Ultra"];

  // Derived
  const rarities = useMemo(() => {
    const present = ALLOWED_RARITIES.filter((r) => cards.some((c) => c.rarity === r));
    return ["all", ...present];
  }, [cards]);

  const filteredCards = useMemo(() => {
    let result = cards.filter((card) => {
      if (!ALLOWED_RARITIES.includes(card.rarity ?? "")) return false;
      if (selectedRarity !== "all" && card.rarity !== selectedRarity) return false;
      const price = getCardPrice(card);
      if (showPricedOnly && price === null) return false;
      if (price !== null) {
        if (minPrice !== "" && price < parseFloat(minPrice)) return false;
        if (maxPrice !== "" && price > parseFloat(maxPrice)) return false;
      }
      return true;
    });

    if (sortBy === "price-desc")
      result = [...result].sort((a, b) => (getCardPrice(b) ?? -1) - (getCardPrice(a) ?? -1));
    else if (sortBy === "price-asc")
      result = [...result].sort((a, b) => {
        const pa = getCardPrice(a);
        const pb = getCardPrice(b);
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return pa - pb;
      });
    else if (sortBy === "name")
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [cards, selectedRarity, minPrice, maxPrice, showPricedOnly, sortBy]);

  const selectedSet = sets.find((s) => s.id === selectedSetId);

  const clearFilters = () => {
    setSelectedRarity("all");
    setMinPrice("");
    setMaxPrice("");
    setShowPricedOnly(false);
    setSortBy("number");
  };

  const filtersActive =
    selectedRarity !== "all" || minPrice !== "" || maxPrice !== "" || showPricedOnly;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-red-950 to-zinc-900 shadow-2xl">
        {/* Yellow top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* Large background Pokéball — right */}
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

        {/* Small Pokéball outlines — decorative */}
        <div className="absolute -left-6 -top-6 w-28 h-28 pointer-events-none select-none opacity-[0.05]">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="95" fill="none" stroke="white" strokeWidth="5" />
            <line x1="5" y1="100" x2="195" y2="100" stroke="white" strokeWidth="5" />
            <circle cx="100" cy="100" r="28" fill="none" stroke="white" strokeWidth="5" />
          </svg>
        </div>
        <div className="absolute left-1/2 top-2 w-10 h-10 pointer-events-none select-none opacity-[0.05]">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="95" fill="none" stroke="white" strokeWidth="8" />
            <line x1="5" y1="100" x2="195" y2="100" stroke="white" strokeWidth="8" />
            <circle cx="100" cy="100" r="28" fill="none" stroke="white" strokeWidth="8" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
          <div className="flex items-center gap-4">
            {/* Pokéball icon */}
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
                <span className="text-[#FFCB05]">Browse</span>
                <span className="text-white"> Sets</span>
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-pink-400 shadow-sm shadow-pink-400/50" />
                  Illustration Rare
                </span>
                <span className="text-slate-700 text-xs">·</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-pink-200 shadow-sm shadow-pink-200/50" />
                  Special Illustration Rare
                </span>
                <span className="text-slate-700 text-xs">·</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                  Ultra Rare
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/60 to-transparent" />
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* Set Selector */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Select Set
          </label>
          {loadingSets ? (
            <div className="h-12 bg-slate-800 rounded-xl animate-pulse" />
          ) : (
            <select
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-yellow-500 transition cursor-pointer"
            >
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name} — {set.series} ({set.releaseDate})
                </option>
              ))}
            </select>
          )}

          {selectedSet && !loadingSets && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedSet.images.logo}
                alt={selectedSet.name}
                className="h-8 object-contain"
              />
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                <span>
                  <span className="text-white font-semibold">{selectedSet.total}</span> cards
                </span>
                <span className="text-slate-600">·</span>
                <span>{selectedSet.series}</span>
                <span className="text-slate-600">·</span>
                <span>{selectedSet.releaseDate}</span>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Filters
            </span>
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="text-xs text-yellow-500 hover:text-yellow-300 transition"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Rarity */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">
                Rarity
              </label>
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {rarities.map((r) => (
                  <option key={r} value={r}>
                    {r === "all" ? "All Rarities" : r}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">
                Min $
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-slate-600"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">
                Max $
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Any"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-slate-600"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">
                Sort
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="number">Card #</option>
                <option value="price-desc">Price ↓</option>
                <option value="price-asc">Price ↑</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>

            {/* Priced only */}
            <div className="flex items-end pb-0.5">
              <label
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setShowPricedOnly((v) => !v)}
              >
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                    showPricedOnly ? "bg-yellow-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      showPricedOnly ? "translate-x-4" : ""
                    }`}
                  />
                </div>
                <span className="text-xs text-slate-400 group-hover:text-white transition">
                  Priced only
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {!loadingCards && cards.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing{" "}
              <span className="text-white font-semibold">{filteredCards.length}</span> of{" "}
              <span className="text-white font-semibold">{cards.length}</span> cards
            </span>
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="text-yellow-500 hover:text-yellow-300 transition"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Card Grid */}
        {loadingCards ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredCards.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredCards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                onClick={() => setSelectedCard(card)}
                inInventory={inventoryCardIds.has(card.id)}
              />
            ))}
          </div>
        ) : cards.length > 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-base font-medium text-slate-400">No cards match these filters</p>
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-yellow-500 hover:text-yellow-300 transition"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      {selectedCard && (
        <AddToInventoryModal
          card={selectedCard}
          setName={selectedSet?.name ?? ""}
          onAdd={(pricePaid) => addToInventory(selectedCard, pricePaid)}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
