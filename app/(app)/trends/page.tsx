"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Sparkles, Flame, Zap, ArrowRight, ExternalLink,
  RefreshCw, Globe, Hash, Clock, BarChart3, Brain,
} from "lucide-react";
import { useKuestMarkets } from "@/hooks/useKuestMarkets";
import { fmtVol, type Market } from "@/lib/mock-data";

// ─── Static X/Twitter trends (replace with real X API when available) ─────────

const X_TRENDS = [
  { rank: 1,  topic: "Netanyahu",          volume: "142K posts",  category: "Politics",    hot: true  },
  { rank: 2,  topic: "Bank of Israel",     volume: "38K posts",   category: "Finance",     hot: false },
  { rank: 3,  topic: "Claude AI",          volume: "97K posts",   category: "Tech",        hot: true  },
  { rank: 4,  topic: "Shekel dollar",      volume: "21K posts",   category: "Finance",     hot: false },
  { rank: 5,  topic: "Bitcoin ETF",        volume: "203K posts",  category: "Crypto",      hot: true  },
  { rank: 6,  topic: "IDF Gaza",           volume: "55K posts",   category: "Geopolitics", hot: false },
  { rank: 7,  topic: "OpenAI GPT-5",       volume: "88K posts",   category: "Tech",        hot: true  },
  { rank: 8,  topic: "TASE TA-125",        volume: "12K posts",   category: "Finance",     hot: false },
  { rank: 9,  topic: "Ethereum upgrade",   volume: "44K posts",   category: "Crypto",      hot: false },
  { rank: 10, topic: "Coalition crisis",   volume: "29K posts",   category: "Politics",    hot: false },
];

const CATEGORY_COLORS: Record<string, string> = {
  Politics:    "text-blue-400   bg-blue-500/10   border-blue-500/20",
  Finance:     "text-cyan-400   bg-cyan-500/10   border-cyan-500/20",
  Tech:        "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Crypto:      "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Geopolitics: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
};

// ─── Components ───────────────────────────────────────────────────────────────

function TrendRow({ trend, index }: { trend: (typeof X_TRENDS)[0]; index: number }) {
  const catClass = CATEGORY_COLORS[trend.category] ?? CATEGORY_COLORS.Finance;

  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.04 }}
      className="flex items-center gap-4 p-4 rounded-xl border border-white/6 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.035] transition-all group"
    >
      {/* Rank */}
      <span className={`flex-shrink-0 w-7 text-center text-sm font-black font-mono ${index < 3 ? "text-cyan-400" : "text-white/25"}`}>
        {trend.rank}
      </span>

      {/* Topic */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
            #{trend.topic.replace(/\s/g, "")}
          </p>
          {trend.hot && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-orange-500/35 bg-orange-500/8 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-400">
              <Flame className="w-2.5 h-2.5" />Hot
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/30 font-mono mt-0.5">{trend.volume}</p>
      </div>

      {/* Category */}
      <span className={`flex-shrink-0 hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${catClass}`}>
        {trend.category}
      </span>

      {/* Generate CTA */}
      <Link
        href={`/ai-generator?topic=${encodeURIComponent(trend.topic)}`}
        className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-violet-500/25 bg-violet-500/8 px-3 py-1.5 text-xs font-bold text-violet-300 hover:bg-violet-500/18 hover:-translate-y-0.5 transition-all"
      >
        <Sparkles className="w-3 h-3" />
        Forge
      </Link>
    </motion.div>
  );
}

function MarketTrendCard({ market, index }: { market: Market; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.06 }}
      className="rounded-2xl border border-white/6 bg-white/[0.025] p-4 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
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
        </div>
        <span className={`text-xs font-bold font-mono ${market.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {market.change >= 0 ? "+" : ""}{market.change}%
        </span>
      </div>

      <Link href={`/markets/${market.id}`}>
        <p className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-3 hover:text-cyan-300 transition-colors">
          {market.question}
        </p>
      </Link>

      <div className="flex justify-between text-xs font-mono mb-2">
        <span className="text-emerald-400">YES {market.yesPrice}¢</span>
        <span className="text-rose-400">NO {100 - market.yesPrice}¢</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${market.yesPrice}%` }}
          transition={{ duration: 0.9, delay: 0.3 + index * 0.06 }}
          className="h-full rounded-full bg-emerald-500"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-white/30 font-mono">
        <span>{fmtVol(market.volume)} vol</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{market.daysLeft}d</span>
      </div>
    </motion.div>
  );
}

function MarketSkeleton() {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.025] p-4 space-y-3 animate-pulse">
      <div className="h-4 w-16 rounded-full bg-white/8" />
      <div className="h-4 w-full rounded bg-white/8" />
      <div className="h-4 w-3/4 rounded bg-white/5" />
      <div className="h-1.5 rounded-full bg-white/5" />
      <div className="flex justify-between">
        <div className="h-3 w-16 rounded bg-white/5" />
        <div className="h-3 w-10 rounded bg-white/5" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrendsPage() {
  const [activeTab, setActiveTab] = useState<"x-trends" | "hot-markets" | "ai-opps">("x-trends");
  const { data: markets = [], isLoading, isFetching, refetch } = useKuestMarkets({ limit: 20 });

  const hotMarkets   = markets.filter(m => m.trending || m.change > 5).slice(0, 6);
  const aiMarkets    = markets.filter(m => m.aiGenerated).slice(0, 6);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/8 px-4 py-1.5 text-sm font-semibold text-orange-300">
          <TrendingUp className="w-4 h-4" />
          Live Trends
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
          What's Trending <span className="text-cyan-400">Right Now</span>
        </h1>
        <p className="text-white/45 text-sm max-w-xl">
          Top X trends, hottest prediction markets, and AI-detected opportunities. One click to forge a market from any trend.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/6 mb-6">
        {([
          { key: "x-trends",   label: "X Trends",      icon: Hash         },
          { key: "hot-markets",label: "Hot Markets",    icon: Flame        },
          { key: "ai-opps",    label: "AI-Generated",  icon: Sparkles     },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === t.key ? "text-white" : "text-white/40 hover:text-white/70"}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {activeTab === t.key && <motion.div layoutId="trendsTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />}
          </button>
        ))}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white hover:border-white/15 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* X Trends tab */}
        {activeTab === "x-trends" && (
          <motion.div key="x" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-white/30">
                Top trending topics on X - click "Forge" to generate a market
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-white/25 font-mono">
                <Globe className="w-3 h-3" />
                Updated 2m ago
              </div>
            </div>

            <div className="space-y-2 mb-8">
              {X_TRENDS.map((t, i) => <TrendRow key={t.rank} trend={t} index={i} />)}
            </div>

            {/* CTA banner */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-violet-400" />
                    Claude sees all of this
                  </p>
                  <p className="text-xs text-white/40">
                    Paste any of these trends into the AI Generator and Claude will create a production-ready prediction market in seconds.
                  </p>
                </div>
                <Link
                  href="/ai-generator"
                  className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-400 hover:-translate-y-0.5 transition-all whitespace-nowrap"
                >
                  <Zap className="w-4 h-4" />
                  Open Generator
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Hot Markets tab */}
        {activeTab === "hot-markets" && (
          <motion.div key="hot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-white/30">Markets with the highest 24h price movement</p>
              <Link href="/markets" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                All markets <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <MarketSkeleton key={i} />)}
              </div>
            ) : hotMarkets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hotMarkets.map((m, i) => <MarketTrendCard key={m.id} market={m} index={i} />)}
              </div>
            ) : (
              <div className="text-center py-16 text-white/30">
                <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No trending markets right now.</p>
                <Link href="/markets" className="mt-2 inline-block text-xs text-cyan-400 hover:text-cyan-300">Browse all markets</Link>
              </div>
            )}
          </motion.div>
        )}

        {/* AI Opportunities tab */}
        {activeTab === "ai-opps" && (
          <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-white/30">Markets created by Claude AI - highest information density</p>
              <Link href="/ai-generator" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                Create yours <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <MarketSkeleton key={i} />)}
              </div>
            ) : aiMarkets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {aiMarkets.map((m, i) => <MarketTrendCard key={m.id} market={m} index={i} />)}
              </div>
            ) : (
              <div className="text-center py-16 text-white/30">
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm mb-2">No AI-generated markets yet.</p>
                <Link href="/ai-generator" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition-all">
                  <Sparkles className="w-3.5 h-3.5" />
                  Be the first - Generate one
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
