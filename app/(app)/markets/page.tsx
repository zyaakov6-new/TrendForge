"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Sparkles, TrendingUp, Clock, DollarSign,
  Users, ChevronDown, X, ArrowUpRight, ArrowDownRight,
  SlidersHorizontal, RefreshCw,
} from "lucide-react";
import { type Market, type MarketCategory, fmtVol } from "@/lib/mock-data";
import { useKuestMarkets } from "@/hooks/useKuestMarkets";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Array<MarketCategory | "All"> = [
  "All", "Politics", "Geopolitics", "Crypto", "Tech", "Finance", "Sports", "Israel",
];

const SORT_OPTIONS = [
  { value: "volume",  label: "Volume"      },
  { value: "ending",  label: "Ending Soon" },
  { value: "change",  label: "Most Active" },
  { value: "newest",  label: "Newest"      },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const catColor: Record<string, { pill: string; dot: string }> = {
  Politics:   { pill: "bg-blue-500/10 border-blue-500/20 text-blue-400",     dot: "bg-blue-400"   },
  Geopolitics:{ pill: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",dot: "bg-indigo-400" },
  Crypto:     { pill: "bg-orange-500/10 border-orange-500/20 text-orange-400",dot: "bg-orange-400" },
  Tech:       { pill: "bg-violet-500/10 border-violet-500/20 text-violet-400",dot: "bg-violet-400" },
  Finance:    { pill: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",      dot: "bg-cyan-400"   },
  Sports:     { pill: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",dot:"bg-emerald-400"},
  Israel:     { pill: "bg-blue-500/10 border-blue-500/20 text-blue-400",      dot: "bg-blue-400"   },
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function MarketSkeleton() {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.025] p-5 space-y-3 animate-pulse">
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded-full bg-white/8" />
        <div className="h-5 w-10 rounded-full bg-white/5" />
      </div>
      <div className="h-4 w-full rounded bg-white/8" />
      <div className="h-4 w-3/4 rounded bg-white/5" />
      <div className="h-2 rounded-full bg-white/5" />
      <div className="flex gap-4">
        <div className="h-3 w-16 rounded bg-white/5" />
        <div className="h-3 w-12 rounded bg-white/5" />
        <div className="h-3 w-10 rounded bg-white/5" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 flex-1 rounded-xl bg-white/5" />
        <div className="h-9 flex-1 rounded-xl bg-white/5" />
        <div className="h-9 w-10 rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

// ─── Market Card ──────────────────────────────────────────────────────────────

function MarketCard({ market, index }: { market: Market; index: number }) {
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeSide, setTradeSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("50");
  const [traded, setTraded] = useState(false);

  const colors = catColor[market.category] ?? catColor.Finance;
  const isUrgent = market.daysLeft <= 14;

  const confirmTrade = () => {
    setTraded(true);
    setTradeOpen(false);
    setTimeout(() => setTraded(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="group relative rounded-2xl border border-white/6 bg-white/[0.025] p-5 hover:border-cyan-500/22 hover:bg-white/[0.04] transition-all duration-300"
    >
      <AnimatePresence>
        {traded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center z-10"
          >
            <p className="text-sm font-bold text-emerald-400">Trade confirmed ✓</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {market.category}
          </span>
          {market.aiGenerated && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-cyan-500/35 bg-cyan-500/8 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-400">
              <Sparkles className="w-2.5 h-2.5" />AI
            </span>
          )}
          {market.trending && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-orange-500/35 bg-orange-500/8 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-400">
              <TrendingUp className="w-2.5 h-2.5" />Hot
            </span>
          )}
          {isUrgent && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-rose-500/35 bg-rose-500/8 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-400">
              <Clock className="w-2.5 h-2.5" />Ending
            </span>
          )}
        </div>
        <span className={`text-xs font-bold font-mono flex-shrink-0 flex items-center gap-0.5 ${market.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {market.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(market.change)}%
        </span>
      </div>

      {/* Question */}
      <Link href={`/markets/${market.id}`}>
        <p className="text-sm font-semibold text-white leading-snug mb-4 line-clamp-2 min-h-[40px] hover:text-cyan-300 transition-colors cursor-pointer">
          {market.question}
        </p>
      </Link>

      {/* Probability bar */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-emerald-400">YES {market.yesPrice}¢</span>
          <span className="text-rose-400">NO {100 - market.yesPrice}¢</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${market.yesPrice}%` }}
            transition={{ duration: 0.8, delay: Math.min(index * 0.03, 0.3) }}
            className="h-full rounded-full bg-emerald-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-xs text-white/32 font-mono">
        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{fmtVol(market.volume)}</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{market.traders.toLocaleString()}</span>
        <span className={`flex items-center gap-1 ${isUrgent ? "text-rose-400" : ""}`}>
          <Clock className="w-3 h-3" />{market.daysLeft}d
        </span>
      </div>

      {/* Trade UI */}
      <AnimatePresence mode="wait">
        {!tradeOpen ? (
          <motion.div key="btns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
            <button onClick={() => { setTradeSide("YES"); setTradeOpen(true); }} className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/22 py-2.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 hover:-translate-y-0.5 transition-all">Buy YES</button>
            <button onClick={() => { setTradeSide("NO"); setTradeOpen(true); }} className="flex-1 rounded-xl bg-rose-500/10 border border-rose-500/22 py-2.5 text-xs font-black text-rose-400 hover:bg-rose-500/20 hover:-translate-y-0.5 transition-all">Buy NO</button>
            <Link href={`/markets/${market.id}`} className="flex-shrink-0 flex items-center justify-center rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-xs text-white/40 hover:text-white hover:border-white/20 transition-all" title="Detail">
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-2">
            <div className="flex items-center gap-2 p-3 rounded-xl border border-white/8 bg-white/3">
              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${tradeSide === "YES" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{tradeSide}</span>
              <span className="text-xs text-white/40 font-mono flex-1">@ {tradeSide === "YES" ? market.yesPrice : 100 - market.yesPrice}¢</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ color: "white" }} className="w-20 rounded-lg border border-white/10 bg-[#0c0c1f] px-2 py-1 text-xs text-right font-mono outline-none focus:border-cyan-500/40" />
              <span className="text-xs text-white/30">USDC</span>
            </div>
            <div className="flex gap-2">
              <button onClick={confirmTrade} className={`flex-1 rounded-xl py-2.5 text-xs font-black text-white transition-all hover:-translate-y-0.5 ${tradeSide === "YES" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-rose-500 hover:bg-rose-400"}`}>
                Confirm · ${amount} USDC
              </button>
              <button onClick={() => setTradeOpen(false)} className="p-2.5 rounded-xl border border-white/8 text-white/30 hover:text-white hover:bg-white/5 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const [search,          setSearch]          = useState("");
  const [activeCategory,  setActiveCategory]  = useState<MarketCategory | "All">("All");
  const [sortBy,          setSortBy]          = useState<SortKey>("volume");

  // Real data - falls back to mock if Gamma API is down
  const { data: markets = [], isLoading, isError, refetch, isFetching } = useKuestMarkets();

  const filtered = useMemo(() => {
    let results = [...markets];
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(m => m.question.toLowerCase().includes(q));
    }
    if (activeCategory !== "All") {
      results = results.filter(m => m.category === activeCategory);
    }
    switch (sortBy) {
      case "volume":  return results.sort((a, b) => b.volume   - a.volume);
      case "ending":  return results.sort((a, b) => a.daysLeft - b.daysLeft);
      case "change":  return results.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      default:        return results;
    }
  }, [markets, search, activeCategory, sortBy]);

  const aiCount = filtered.filter(m => m.aiGenerated).length;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">Discover Markets</h1>
            {isLoading ? (
              <div className="h-4 w-56 rounded bg-white/8 animate-pulse" />
            ) : (
              <p className="text-sm text-white/40">
                {markets.length} active markets ·{" "}
                <span className="text-cyan-400 font-semibold">{markets.filter(m => m.aiGenerated).length} AI-generated</span>
                {" "}· {isError ? <span className="text-orange-400">using cached data</span> : "live"}
              </p>
            )}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/40 hover:text-white hover:border-white/15 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/22" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search markets..."
              style={{ color: "white" }}
              className="w-full rounded-xl border border-white/8 bg-[#0c0c1f] pl-10 pr-4 py-2.5 text-sm placeholder:text-white/22 outline-none focus:border-cyan-500/35 focus:ring-1 focus:ring-cyan-500/10 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative flex-shrink-0">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              style={{ color: "rgba(255,255,255,0.65)" }}
              className="appearance-none rounded-xl border border-white/8 bg-[#0c0c1f] px-4 py-2.5 pr-8 text-sm outline-none focus:border-cyan-500/35 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 shadow-sm shadow-cyan-500/10"
                  : "bg-white/[0.03] border border-white/8 text-white/45 hover:text-white hover:border-white/15"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Result count */}
      {!isLoading && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-white/30 font-medium">
            {filtered.length} market{filtered.length !== 1 ? "s" : ""}
            {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
            {search && ` matching "${search}"`}
            {aiCount > 0 && <span className="ml-2 text-cyan-400/60">· {aiCount} AI-generated</span>}
          </p>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <MarketSkeleton key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((market, i) => <MarketCard key={market.id} market={market} index={i} />)}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 text-white/28">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-white/40">No markets found</p>
          <p className="text-sm mt-1">Try a different search term or category.</p>
          <button
            onClick={() => { setSearch(""); setActiveCategory("All"); }}
            className="mt-4 text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
          >
            Clear filters
          </button>
        </motion.div>
      )}
    </div>
  );
}
