"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles, TrendingUp, ArrowRight, DollarSign, Users,
  Activity, Clock, BarChart3, Zap, CheckCircle,
} from "lucide-react";
import { fmtVol } from "@/lib/mock-data";
import { useKuestMarkets } from "@/hooks/useKuestMarkets";
import { usePortfolio } from "@/hooks/useUserPositions";
import { useWallet } from "@/hooks/useWallet";
import type { Market } from "@/lib/mock-data";

// ─── Static activity feed (will be dynamic when we add a feed API) ────────────

const ACTIVITY = [
  { text: "Market published: Will TA-125 close above 2,500?",            time: "2m ago",  type: "publish" },
  { text: "Trade executed: YES on Netanyahu elections - 150 shares",      time: "14m ago", type: "trade"   },
  { text: "AI generated: Bank of Israel rate cut June 2026",              time: "1h ago",  type: "ai"      },
  { text: "Market resolved: USD/ILS above 3.95 - YES confirmed",          time: "3h ago",  type: "resolve" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, positive, icon: Icon, border, iconColor, index, loading,
}: {
  label: string; value: string; sub: string; positive: boolean | null;
  icon: React.ElementType; border: string; iconColor: string; index: number; loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`rounded-2xl border ${border} bg-[#070710] p-5`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-white/4">
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 rounded bg-white/8 animate-pulse" />
          <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-black text-white mb-0.5">{value}</p>
          <p className="text-xs text-white/35">{label}</p>
          <p className={`text-xs mt-1 ${positive === true ? "text-emerald-400/70" : positive === false ? "text-rose-400/70" : "text-white/25"}`}>
            {sub}
          </p>
        </>
      )}
    </motion.div>
  );
}

function MiniMarketCard({ market, index }: { market: Market; index: number }) {
  return (
    <Link href={`/markets/${market.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 + index * 0.09 }}
        className="group rounded-2xl border border-white/6 bg-white/[0.025] p-5 hover:border-cyan-500/25 hover:bg-white/[0.04] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      >
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
            {market.category}
          </span>
          {market.aiGenerated && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-cyan-500/35 bg-cyan-500/8 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-400">
              <Sparkles className="w-2.5 h-2.5" />AI
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-white leading-snug mb-4 line-clamp-2 min-h-[40px] group-hover:text-cyan-100 transition-colors">
          {market.question}
        </p>
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-emerald-400">YES {market.yesPrice}¢</span>
            <span className="text-rose-400">NO {100 - market.yesPrice}¢</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${market.yesPrice}%` }}
              transition={{ duration: 0.9, delay: 0.3 + index * 0.09 }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/30 font-mono">{fmtVol(market.volume)} · {market.daysLeft}d left</span>
          <span className="flex items-center gap-1 rounded-lg border border-cyan-500/25 bg-cyan-500/8 px-3 py-1 text-xs font-bold text-cyan-400 group-hover:bg-cyan-500/15 transition-colors">
            Trade <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

function MiniMarketSkeleton() {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.025] p-5 space-y-3 animate-pulse">
      <div className="h-4 w-16 rounded-full bg-white/8" />
      <div className="h-4 w-full rounded bg-white/8" />
      <div className="h-4 w-3/4 rounded bg-white/5" />
      <div className="h-1.5 rounded-full bg-white/5" />
      <div className="flex justify-between">
        <div className="h-3 w-20 rounded bg-white/5" />
        <div className="h-6 w-16 rounded-lg bg-white/5" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { address }   = useWallet();
  const { data: allMarkets = [], isLoading: marketsLoading } = useKuestMarkets({ limit: 20 });
  const { positions, isLoading: portfolioLoading, isOnChain, totalValue, totalPnL } = usePortfolio(address);

  const trendingMarkets = allMarkets.filter(m => m.trending).slice(0, 3);
  const totalPnLPct = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;

  const STATS = [
    {
      label: "Total Volume",
      value: marketsLoading ? "-" : `$${fmtVol(allMarkets.reduce((s, m) => s + m.volume, 0))}`,
      sub: `${allMarkets.length} active markets`,
      positive: true as boolean | null,
      icon: DollarSign,
      border: "border-cyan-500/15",
      iconColor: "text-cyan-400",
    },
    {
      label: "AI-Generated",
      value: marketsLoading ? "-" : String(allMarkets.filter(m => m.aiGenerated).length),
      sub: "markets by Claude",
      positive: true as boolean | null,
      icon: Sparkles,
      border: "border-violet-500/15",
      iconColor: "text-violet-400",
    },
    {
      label: "Portfolio Value",
      value: portfolioLoading ? "-" : `$${totalValue.toFixed(2)}`,
      sub: isOnChain ? "on-chain" : "estimated",
      positive: null as boolean | null,
      icon: BarChart3,
      border: "border-emerald-500/15",
      iconColor: "text-emerald-400",
    },
    {
      label: "Open PnL",
      value: portfolioLoading ? "-" : `${totalPnL >= 0 ? "+" : ""}$${Math.abs(totalPnL).toFixed(2)}`,
      sub: `${totalPnL >= 0 ? "+" : ""}${Math.abs(totalPnLPct).toFixed(1)}% return`,
      positive: portfolioLoading ? null : totalPnL >= 0,
      icon: TrendingUp,
      border: totalPnL >= 0 ? "border-emerald-500/15" : "border-rose-500/15",
      iconColor: totalPnL >= 0 ? "text-emerald-400" : "text-rose-400",
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Good morning{address ? `, ${address.slice(0, 6)}` : ""} 👋
          </h2>
          <p className="text-sm text-white/40 mt-1">Here's what's happening across your markets right now.</p>
        </div>
        <Link href="/ai-generator" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 hover:-translate-y-0.5 transition-all whitespace-nowrap">
          <Sparkles className="w-4 h-4" />
          Forge New Market
        </Link>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {STATS.map((stat, i) => (
          <StatCard key={stat.label} {...stat} index={i} loading={i < 2 ? marketsLoading : portfolioLoading} />
        ))}
      </div>

      {/* Portfolio snapshot + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Portfolio card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="rounded-2xl border border-white/6 bg-white/[0.025] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Portfolio Snapshot
            </h3>
            <Link href="/portfolio" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {portfolioLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-5">
                <div className="flex justify-between">
                  <span className="text-xs text-white/40">Total Value</span>
                  <span className="text-sm font-bold font-mono text-white">${totalValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-white/40">Open PnL</span>
                  <span className={`text-sm font-bold font-mono ${totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-white/40">Positions</span>
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    {positions.length}
                    {isOnChain && <span className="text-[9px] rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 font-bold">LIVE</span>}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {positions.slice(0, 3).map(pos => {
                  const pnl = pos.shares * (pos.currentPrice - pos.entryPrice);
                  return (
                    <div key={pos.id} className="flex items-center justify-between py-2 border-t border-white/4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70 truncate max-w-[160px]">{pos.question}</p>
                        <span className={`text-[10px] font-bold ${pos.side === "YES" ? "text-emerald-400" : "text-rose-400"}`}>
                          {pos.side} · {pos.shares} shares
                        </span>
                      </div>
                      <span className={`text-xs font-bold font-mono flex-shrink-0 ml-2 ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
                {positions.length === 0 && (
                  <p className="text-xs text-white/25 text-center py-4">No open positions yet.</p>
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* Activity feed */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-2 rounded-2xl border border-white/6 bg-white/[0.025] p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {ACTIVITY.map((item, i) => {
              const colors: Record<string, string> = {
                publish: "bg-cyan-500/15 border-cyan-500/25",
                trade:   "bg-emerald-500/15 border-emerald-500/25",
                ai:      "bg-violet-500/15 border-violet-500/25",
                resolve: "bg-orange-500/15 border-orange-500/25",
              };
              const icons: Record<string, React.ReactNode> = {
                publish: <Zap className="w-3 h-3 text-cyan-400" />,
                trade:   <TrendingUp className="w-3 h-3 text-emerald-400" />,
                ai:      <Sparkles className="w-3 h-3 text-violet-400" />,
                resolve: <CheckCircle className="w-3 h-3 text-orange-400" />,
              };
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.015] hover:bg-white/[0.03] transition-colors"
                >
                  <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg border ${colors[item.type]}`}>
                    {icons[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/75 leading-relaxed">{item.text}</p>
                  </div>
                  <span className="flex-shrink-0 text-[10px] text-white/25 font-mono">{item.time}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Trending markets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            Trending Markets
          </h3>
          <Link href="/markets" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketsLoading
            ? Array.from({ length: 3 }).map((_, i) => <MiniMarketSkeleton key={i} />)
            : trendingMarkets.length > 0
            ? trendingMarkets.map((m, i) => <MiniMarketCard key={m.id} market={m} index={i} />)
            : allMarkets.slice(0, 3).map((m, i) => <MiniMarketCard key={m.id} market={m} index={i} />)
          }
        </div>
      </div>

      {/* AI opportunity banner */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Claude AI is watching X right now
            </p>
            <p className="text-xs text-white/40 leading-relaxed">
              Bank of Israel rate expectations - Shekel movement - Coalition stability update. Generate and publish in seconds.
            </p>
          </div>
          <Link href="/ai-generator" className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-2.5 text-sm font-bold text-violet-300 hover:bg-violet-500/20 transition-all whitespace-nowrap">
            <Zap className="w-4 h-4" />
            Open AI Generator
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
