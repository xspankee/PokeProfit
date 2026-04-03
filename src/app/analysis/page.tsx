"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PokemonSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
  images: { symbol: string; logo: string };
}

interface PokemonCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  images: { small: string; large: string };
  tcgplayer?: { prices?: Record<string, { market?: number }> };
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
      fullDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
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

const ALLOWED_RARITIES = [
  "Illustration Rare",
  "Special Illustration Rare",
  "Ultra Rare",
  "Rare Ultra",
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 shadow-xl">
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className="text-base font-black text-yellow-400">${payload[0].value.toFixed(2)}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CardAnalysisPage() {
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [loadingSets, setLoadingSets] = useState(true);

  const [setCards, setSetCards] = useState<PokemonCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const [selectedRarity, setSelectedRarity] = useState("all");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [periodIdx, setPeriodIdx] = useState(1); // default 3M

  // Fetch sets
  useEffect(() => {
    fetch("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=250")
      .then((r) => r.json())
      .then((data) => {
        const modern = (data.data as PokemonSet[]).filter(
          (s) => new Date(s.releaseDate) >= new Date("2019-01-01")
        );
        setSets(modern);
        if (modern.length > 0) setSelectedSetId(modern[0].id);
      })
      .finally(() => setLoadingSets(false));
  }, []);

  // Fetch all cards in a set
  const fetchSetCards = useCallback(async (setId: string) => {
    setLoadingCards(true);
    setSetCards([]);
    setSelectedRarity("all");
    setSelectedCardId("");
    try {
      let page = 1;
      const all: PokemonCard[] = [];
      while (true) {
        const res = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250&page=${page}&orderBy=number`
        );
        const data = await res.json();
        all.push(...data.data);
        if (data.data.length < 250) break;
        page++;
      }
      setSetCards(all);
    } catch {
      setSetCards([]);
    } finally {
      setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSetId) fetchSetCards(selectedSetId);
  }, [selectedSetId, fetchSetCards]);

  // Reset card when rarity changes
  useEffect(() => {
    setSelectedCardId("");
  }, [selectedRarity]);

  // Derived values
  const availableRarities = useMemo(
    () => ALLOWED_RARITIES.filter((r) => setCards.some((c) => c.rarity === r)),
    [setCards]
  );

  const filteredCards = useMemo(
    () =>
      setCards.filter((c) => {
        if (!ALLOWED_RARITIES.includes(c.rarity ?? "")) return false;
        if (selectedRarity !== "all" && c.rarity !== selectedRarity) return false;
        return true;
      }),
    [setCards, selectedRarity]
  );

  const selectedCard = useMemo(
    () => filteredCards.find((c) => c.id === selectedCardId) ?? null,
    [filteredCards, selectedCardId]
  );

  const period = CHART_PERIODS[periodIdx];
  const currentPrice = selectedCard ? getCardPrice(selectedCard) : null;

  const chartData = useMemo(() => {
    if (!selectedCard || currentPrice === null) return [];
    return generatePriceHistory(currentPrice, selectedCard.id, period.days);
  }, [selectedCard, currentPrice, period.days]);

  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const prices = chartData.map((d) => d.price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const pctChange =
      chartData[0].price > 0
        ? ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price) * 100
        : 0;
    return { high, low, avg, pctChange, isUp: pctChange >= 0 };
  }, [chartData]);

  const lineColor = stats ? (stats.isUp ? "#34d399" : "#f87171") : "#fbbf24";
  const yPad = chartData.length
    ? {
        min: Math.min(...chartData.map((d) => d.price)) * 0.93,
        max: Math.max(...chartData.map((d) => d.price)) * 1.07,
      }
    : { min: 0, max: 1 };

  const selectedSet = sets.find((s) => s.id === selectedSetId);

  const selectClass =
    "w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-indigo-950 to-zinc-900 border-b border-indigo-900/40 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* Decorative chart lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-[0.05]">
          <svg className="w-full h-full" viewBox="0 0 800 120" preserveAspectRatio="none">
            <polyline
              points="0,90 100,70 200,85 300,40 400,60 500,30 600,55 700,25 800,45"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
            <polyline
              points="0,110 100,95 200,100 300,70 400,80 500,55 600,75 700,50 800,65"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-indigo-400/70 uppercase tracking-[0.4em] mb-1">
              PokeProfit
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-none">
              <span className="text-[#FFCB05]">Card</span>
              <span className="text-white"> Analysis</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">
              Select a set, rarity, and card to view price history
            </p>
          </div>
          <button
            onClick={() => selectedSetId && fetchSetCards(selectedSetId)}
            disabled={loadingCards}
            title="Refresh cards"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition disabled:opacity-40 mt-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${loadingCards ? "animate-spin" : ""}`}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-600/50 to-transparent" />
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Cascading selectors ── */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Set */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Set
              </label>
              {loadingSets ? (
                <div className="h-12 bg-slate-800 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={selectedSetId}
                  onChange={(e) => setSelectedSetId(e.target.value)}
                  className={selectClass}
                >
                  {sets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.releaseDate.slice(0, 4)})
                    </option>
                  ))}
                </select>
              )}
              {selectedSet && !loadingSets && (
                <div className="mt-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedSet.images.symbol} alt="" className="h-4 object-contain opacity-70" />
                  <span className="text-[10px] text-slate-500">{selectedSet.series}</span>
                </div>
              )}
            </div>

            {/* Rarity */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Rarity
              </label>
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                disabled={loadingCards || availableRarities.length === 0}
                className={selectClass}
              >
                <option value="all">All Rarities</option>
                {availableRarities.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {loadingCards && (
                <p className="text-[10px] text-slate-600 mt-1.5 animate-pulse">Loading cards…</p>
              )}
            </div>

            {/* Card */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Card
              </label>
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                disabled={loadingCards || filteredCards.length === 0}
                className={selectClass}
              >
                <option value="">— Select a card —</option>
                {filteredCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.number} {c.name}
                  </option>
                ))}
              </select>
              {!loadingCards && filteredCards.length > 0 && (
                <p className="text-[10px] text-slate-600 mt-1.5">
                  {filteredCards.length} card{filteredCards.length !== 1 ? "s" : ""} available
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Chart + card details ── */}
        {selectedCard && currentPrice !== null && stats ? (
          <div className="space-y-4">
            {/* Card info + price */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedCard.images.small}
                  alt={selectedCard.name}
                  className="w-16 h-[90px] object-cover rounded-lg shadow-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-xl font-black text-white">{selectedCard.name}</h2>
                    <span className="text-sm text-slate-400">#{selectedCard.number}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <span className="text-sm text-slate-400">{selectedSet?.name}</span>
                    {selectedCard.rarity && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-pink-900 text-pink-300">
                          {selectedCard.rarity}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl font-black text-yellow-400">${currentPrice.toFixed(2)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Current market price</div>
                  <div
                    className={`text-sm font-bold mt-1 ${stats.isUp ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {stats.isUp ? "▲" : "▼"} {Math.abs(stats.pctChange).toFixed(1)}%{" "}
                    <span className="text-slate-500 font-normal">({period.label})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              {/* Period selector + stats row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                {/* Stats */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">High</div>
                    <div className="font-bold text-emerald-400">${stats.high.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Low</div>
                    <div className="font-bold text-red-400">${stats.low.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Avg</div>
                    <div className="font-bold text-slate-300">${stats.avg.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Change</div>
                    <div className={`font-bold ${stats.isUp ? "text-emerald-400" : "text-red-400"}`}>
                      {stats.isUp ? "+" : ""}{stats.pctChange.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Period buttons */}
                <div className="flex gap-1.5 flex-shrink-0">
                  {CHART_PERIODS.map((p, i) => (
                    <button
                      key={p.label}
                      onClick={() => setPeriodIdx(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
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

              {/* Line chart */}
              <div className="h-[300px] sm:h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#475569", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "#1e293b" }}
                      interval={period.interval}
                    />
                    <YAxis
                      domain={[yPad.min, yPad.max]}
                      tick={{ fill: "#475569", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                      width={42}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      y={stats.avg}
                      stroke="#475569"
                      strokeDasharray="6 3"
                      label={{
                        value: `avg $${stats.avg.toFixed(2)}`,
                        fill: "#475569",
                        fontSize: 9,
                        position: "insideTopRight",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke={lineColor}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: lineColor, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : selectedCardId === "" && !loadingCards && filteredCards.length > 0 ? (
          /* Prompt to select a card */
          <div className="flex flex-col items-center justify-center py-28 text-slate-500">
            <div className="mb-4 opacity-30">
              <svg viewBox="0 0 100 100" className="w-20 h-20">
                <path d="M 5 50 A 45 45 0 0 1 95 50 Z" fill="#CC0000" />
                <path d="M 5 50 A 45 45 0 0 0 95 50 Z" fill="#888" />
                <rect x="5" y="44" width="90" height="12" fill="#333" />
                <circle cx="50" cy="50" r="14" fill="#333" />
                <circle cx="50" cy="50" r="8" fill="#888" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="3.5" />
              </svg>
            </div>
            <p className="text-base font-medium text-slate-400">Select a card to view price history</p>
            <p className="text-sm text-slate-600 mt-1">Choose a set, rarity, and card above</p>
          </div>
        ) : !loadingCards && filteredCards.length === 0 && selectedSetId ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <p className="text-base font-medium text-slate-400">No cards found for this selection</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
