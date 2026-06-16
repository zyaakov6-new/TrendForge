"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { WalletGate } from "@/components/WalletGate";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Activity,
  CheckCircle, Clock, ArrowUpRight, ArrowDownRight, Wallet,
  ChevronDown, ChevronUp, Sparkles, RefreshCw,
} from "lucide-react";
import type { Position } from "@/lib/mock-data";
import { usePortfolio } from "@/hooks/useUserPositions";
import { useWallet } from "@/hooks/useWallet";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcPnL(pos: Position) {
  const entryValue   = pos.shares * pos.entryPrice;
  const currentValue = pos.shares * pos.currentPrice;
  return {
    pnl:          currentValue - entryValue,
    pnlPct:       ((currentValue - entryValue) / entryValue) * 100,
    currentValue,
    entryValue,
  };
}

const catColors: Record<string, string> = {
  Politics:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Tech:       "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Crypto:     "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Finance:    "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  Geopolitics:"text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  Sports:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Israel:     "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, positive, icon: Icon, border, iconColor, index, loading }: {
  label: string; value: string; sub: string; positive: boolean | null;
  icon: React.ElementType; border: string; iconColor: string; index: number; loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`rounded-2xl border ${border} bg-[#070710] p-5`}
    >
      <div className="mb-4">
        <div className="inline-flex p-2 rounded-lg bg-white/4">
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
          <p className="text-xl md:text-2xl font-black text-white mb-0.5">{value}</p>
          <p className="text-xs text-white/35 mb-1">{label}</p>
          <p className={`text-xs font-medium ${positive === true ? "text-emerald-400" : positive === false ? "text-rose-400" : "text-white/25"}`}>
            {sub}
          </p>
        </>
      )}
    </motion.div>
  );
}

// ─── Position Row ─────────────────────────────────────────────────────────────

function PositionRow({ position, index }: { position: Position; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { pnl, pnlPct, currentValue } = calcPnL(position);
  const positive = pnl >= 0;
  const catClass = catColors[position.category] ?? catColors.Finance;

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 + index * 0.07 }}
        onClick={() => setExpanded(v => !v)}
        className="border-b border-white/4 hover:bg-white/[0.02] transition-colors cursor-pointer group"
      >
        <td className="py-4 pl-5 pr-3">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5 text-white/20 group-hover:text-white/40 transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0">
              <Link href={`/markets/${position.marketId}`} className="hover:text-cyan-300 transition-colors" onClick={e => e.stopPropagation()}>
                <p className="text-sm font-semibold text-white leading-snug line-clamp-1 mb-1.5">{position.question}</p>
              </Link>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${catClass}`}>
                  {position.category}
                </span>
                <span className="text-[10px] text-white/25 flex items-center gap-0.5 font-mono">
                  <Clock className="w-2.5 h-2.5" />{position.resolveDate}
                </span>
              </div>
            </div>
          </div>
        </td>
        <td className="py-4 px-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${position.side === "YES" ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400" : "bg-rose-500/10 border border-rose-500/25 text-rose-400"}`}>
            {position.side}
          </span>
        </td>
        <td className="py-4 px-3 text-sm font-mono text-white/70 text-right">{position.shares.toLocaleString()}</td>
        <td className="py-4 px-3 text-sm font-mono text-white/50 text-right">{(position.entryPrice * 100).toFixed(0)}¢</td>
        <td className="py-4 px-3 text-sm font-mono font-semibold text-white text-right">{(position.currentPrice * 100).toFixed(0)}¢</td>
        <td className="py-4 px-3 text-right">
          <p className={`text-sm font-bold font-mono ${positive ? "text-emerald-400" : "text-rose-400"}`}>
            {positive ? "+" : ""}${Math.abs(pnl).toFixed(2)}
          </p>
          <p className={`text-[11px] font-mono flex items-center justify-end gap-0.5 ${positive ? "text-emerald-400/65" : "text-rose-400/65"}`}>
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(pnlPct).toFixed(1)}%
          </p>
        </td>
        <td className="py-4 pl-3 pr-5 text-sm font-mono font-bold text-white text-right">${currentValue.toFixed(2)}</td>
      </motion.tr>

      {expanded && (
        <tr className="border-b border-white/4 bg-white/[0.012]">
          <td colSpan={7} className="py-3 pl-14 pr-5">
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
              <div>
                <span className="text-white/30">Entry value</span>
                <p className="font-mono font-bold text-white/70">${(position.shares * position.entryPrice).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-white/30">Current value</span>
                <p className="font-mono font-bold text-white">${currentValue.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-white/30">Price change</span>
                <p className={`font-mono font-bold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                  {((position.currentPrice - position.entryPrice) * 100).toFixed(1)} pts
                </p>
              </div>
              <div>
                <span className="text-white/30">Status</span>
                <p className="font-semibold text-white/70">Open position</p>
              </div>
              <button className="ml-auto self-center rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-semibold text-white/50 hover:text-white hover:border-white/20 transition-all">
                Close Position
              </button>
            </motion.div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-white/4">
      <td className="py-4 pl-5 pr-3">
        <div className="space-y-2">
          <div className="h-4 w-48 rounded bg-white/8 animate-pulse" />
          <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
        </div>
      </td>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="py-4 px-3">
          <div className="h-4 w-12 rounded bg-white/5 animate-pulse ml-auto" />
        </td>
      ))}
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const { address, truncatedAddress } = useWallet();
  const { positions, isLoading, isOnChain, totalValue, totalPnL, totalPnLPct } = usePortfolio(address);

  const openPositions     = positions.filter(p => p.status === "open");
  const resolvedPositions = positions.filter(p => p.status !== "open");
  // Realized PnL = sum of (final - entry) * shares for resolved markets.
  // currentPrice is 1 for winners, 0 for losers (see useOnChainPositions).
  const realizedPnL       = resolvedPositions.reduce(
    (s, p) => s + p.shares * (p.currentPrice - p.entryPrice),
    0
  );

  const STATS = [
    {
      label: "Portfolio Value",
      value: `$${totalValue.toFixed(2)}`,
      sub:   "on-chain value",
      positive: null as boolean | null,
      icon: DollarSign, border: "border-cyan-500/15", iconColor: "text-cyan-400",
    },
    {
      label: "Open PnL",
      value: `${totalPnL >= 0 ? "+" : ""}$${Math.abs(totalPnL).toFixed(2)}`,
      sub:   `${totalPnL >= 0 ? "+" : ""}${Math.abs(totalPnLPct).toFixed(1)}% return`,
      positive: totalPnL >= 0 as boolean | null,
      icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
      border: totalPnL >= 0 ? "border-emerald-500/15" : "border-rose-500/15",
      iconColor: totalPnL >= 0 ? "text-emerald-400" : "text-rose-400",
    },
    {
      label: "Open Positions",
      value: isLoading ? "-" : String(openPositions.length),
      sub:   "ERC-1155 balances",
      positive: null as boolean | null,
      icon: Activity, border: "border-violet-500/15", iconColor: "text-violet-400",
    },
    {
      label: "Realized PnL",
      value: `${realizedPnL >= 0 ? "+" : ""}$${Math.abs(realizedPnL).toFixed(2)}`,
      sub:   "all time",
      positive: realizedPnL >= 0 as boolean | null,
      icon: CheckCircle, border: "border-blue-500/15", iconColor: "text-blue-400",
    },
  ];

  return (
    <WalletGate title="Connect to view your portfolio" description="Connect a wallet to see your open positions, P&L, and trade history.">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">Portfolio</h1>
            <p className="text-sm text-white/40 flex items-center gap-1.5">
              Your active positions - Polygon mainnet
              {isOnChain && <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5">LIVE</span>}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-2.5">
            <Wallet className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-white/60">{truncatedAddress ?? "Not connected"}</span>
            {address && <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {STATS.map((s, i) => <StatCard key={s.label} {...s} index={i} loading={isLoading} />)}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/6">
          {(["open", "resolved"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${tab === t ? "text-white" : "text-white/40 hover:text-white/70"}`}
            >
              {t === "open" ? `Open Positions (${isLoading ? "..." : openPositions.length})` : `Resolved (${resolvedPositions.length})`}
              {tab === t && <motion.div layoutId="tabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />}
            </button>
          ))}
        </div>

        {/* Open positions table */}
        {tab === "open" && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-white/6 bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/6">
                    {[
                      { label: "Market", align: "left", className: "pl-5" },
                      { label: "Side",    align: "left"  },
                      { label: "Shares",  align: "right" },
                      { label: "Entry",   align: "right" },
                      { label: "Current", align: "right" },
                      { label: "PnL",     align: "right" },
                      { label: "Value",   align: "right", className: "pr-5" },
                    ].map(h => (
                      <th key={h.label} className={`py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-white/22 ${h.align === "left" ? "text-left" : "text-right"} ${h.className ?? ""}`}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                    : openPositions.length > 0
                    ? openPositions.map((pos, i) => <PositionRow key={pos.id} position={pos} index={i} />)
                    : (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <p className="text-sm text-white/30">No open positions.</p>
                          <Link href="/markets" className="mt-2 inline-block text-xs text-cyan-400 hover:text-cyan-300">
                            Browse markets to start trading
                          </Link>
                        </td>
                      </tr>
                    )
                  }
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-5 py-3.5 border-t border-white/5 text-xs">
              <span className="text-white/25 font-mono">All values denominated in USDC</span>
              <div className="flex items-center gap-2 text-white/40">
                <span>Total portfolio value:</span>
                <span className="font-black font-mono text-white text-sm">${totalValue.toFixed(2)} USDC</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Resolved positions */}
        {tab === "resolved" && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
            {resolvedPositions.length === 0 ? (
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] py-16 text-center">
                <CheckCircle className="w-8 h-8 text-white/15 mx-auto mb-3" />
                <p className="text-sm text-white/35">No resolved positions yet.</p>
                <p className="text-xs text-white/20 mt-1">Markets you trade will appear here after they settle.</p>
              </div>
            ) : resolvedPositions.map((pos, i) => {
              const won  = pos.status === "resolved_yes" ? pos.side === "YES" : pos.side === "NO";
              const pnl  = pos.shares * (pos.currentPrice - pos.entryPrice);
              const outcome = pos.status === "resolved_yes" ? "YES" : "NO";
              return (
                <motion.div key={pos.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="rounded-2xl border border-white/6 bg-white/[0.025] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/80 mb-1 line-clamp-1">{pos.question}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`rounded-full px-2.5 py-0.5 font-bold border ${pos.side === "YES" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>{pos.side}</span>
                      <span className={`rounded-full px-2.5 py-0.5 font-bold border ${won ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-rose-500/15 border-rose-500/30 text-rose-400"}`}>Resolved: {outcome}</span>
                      <span className="text-white/25 font-mono">{pos.resolveDate}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-black font-mono ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toFixed(2)}
                    </p>
                    <p className="text-xs text-white/30">{won ? "Won" : "Lost"}</p>
                  </div>
                </motion.div>
              );
            })}

            {resolvedPositions.length > 0 && (
              <div className="rounded-2xl border border-white/6 bg-white/[0.015] px-5 py-4 flex items-center justify-between">
                <span className="text-sm text-white/40 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Total Realized PnL
                </span>
                <span className={`text-lg font-black font-mono ${realizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {realizedPnL >= 0 ? "+" : ""}${Math.abs(realizedPnL).toFixed(2)} USDC
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Find your next trade
            </p>
            <p className="text-xs text-white/40">Claude AI is watching X right now. New AI-generated markets are being published every few minutes.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href="/markets" className="rounded-xl border border-cyan-500/25 bg-cyan-500/8 px-4 py-2.5 text-sm font-bold text-cyan-400 hover:bg-cyan-500/15 transition-all">
              Discover Markets
            </Link>
          </div>
        </motion.div>
      </div>
    </WalletGate>
  );
}
