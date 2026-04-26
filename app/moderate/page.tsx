"use client";

/**
 * TrendForge — Admin Moderation Queue
 * Route: /moderate  (uses root layout — no sidebar, full wagmi/RK providers)
 *
 * Access: only the wallet in NEXT_PUBLIC_ADMIN_WALLET env var.
 * Actions: Approve & Publish (on-chain), Reject, Edit fields, Delete rejected.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Shield, Search, RefreshCw, CheckCircle, XCircle,
  Edit3, ChevronDown, ChevronUp, Sparkles, TrendingUp, DollarSign,
  Clock, Hash, ExternalLink, Zap, AlertTriangle, X, Brain,
  BarChart3, Eye, Trash2, Filter, ArrowRight,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useCreateMarket } from "@/hooks/useCreateMarket";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import type { PendingMarket, ModerationStatus } from "@/types/pending-market";
import type { PendingMarketPatch } from "@/types/pending-market";

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_WALLET = (process.env.NEXT_PUBLIC_ADMIN_WALLET ?? "").toLowerCase();

const STATUS_CONFIG: Record<ModerationStatus, { label: string; color: string; dot: string }> = {
  pending:   { label: "Pending",   color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",  dot: "bg-yellow-400" },
  approved:  { label: "Approved",  color: "text-cyan-400   bg-cyan-500/10   border-cyan-500/25",    dot: "bg-cyan-400" },
  rejected:  { label: "Rejected",  color: "text-rose-400   bg-rose-500/10   border-rose-500/25",    dot: "bg-rose-400" },
  published: { label: "Published", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", dot: "bg-emerald-400 animate-pulse" },
};

const CAT_COLORS: Record<string, string> = {
  Israel:      "text-blue-300  bg-blue-500/8   border-blue-500/20",
  Politics:    "text-blue-400  bg-blue-500/8   border-blue-500/20",
  Geopolitics: "text-indigo-400 bg-indigo-500/8 border-indigo-500/20",
  Crypto:      "text-orange-400 bg-orange-500/8 border-orange-500/20",
  Tech:        "text-violet-400 bg-violet-500/8 border-violet-500/20",
  Finance:     "text-cyan-400  bg-cyan-500/8   border-cyan-500/20",
  Sports:      "text-green-400 bg-green-500/8  border-green-500/20",
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(
  url: string,
  adminWallet: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-wallet": adminWallet,
      ...options.headers,
    },
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ModerationStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Reject Dialog ────────────────────────────────────────────────────────────

function RejectDialog({
  market,
  onClose,
  onConfirm,
}: {
  market: PendingMarket;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1,    y: 0 }}
          exit={{   opacity: 0, scale: 0.95, y: 8 }}
          className="w-full max-w-md rounded-2xl border border-rose-500/25 bg-[#0d0b1a] p-6 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <XCircle className="w-4.5 h-4.5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Reject Market</h3>
              <p className="text-xs text-white/35 line-clamp-1">{market.question}</p>
            </div>
            <button onClick={onClose} className="ml-auto p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Optional rejection reason (e.g. 'Question is ambiguous', 'Already exists')"
            rows={3}
            className="w-full rounded-xl border border-white/8 bg-[#0c0c1f] px-4 py-3 text-sm placeholder:text-white/20 resize-none focus:outline-none focus:border-rose-500/40 transition-colors mb-4"
            style={{ color: "white", caretColor: "white" }}
          />

          <div className="flex gap-2.5">
            <button
              onClick={() => onConfirm(reason)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 py-2.5 text-sm font-bold text-rose-400 hover:bg-rose-500/25 transition-all"
            >
              <XCircle className="w-4 h-4" />
              Confirm Reject
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/40 hover:text-white transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditDialog({
  market,
  onClose,
  onApprove,
}: {
  market: PendingMarket;
  onClose: () => void;
  onApprove: (edited: PendingMarket) => void;
}) {
  const [form, setForm] = useState({
    question:             market.question,
    description:          market.description,
    resolutionCriteria:   market.resolutionCriteria,
    endDate:              market.endDate,
    yesPrice:             market.yesPrice,
    suggestedLiquidityUSDC: market.suggestedLiquidityUSDC,
    tags:                 market.tags.join(", "),
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  function handleApprove() {
    onApprove({
      ...market,
      question:             form.question.trim(),
      description:          form.description.trim(),
      resolutionCriteria:   form.resolutionCriteria.trim(),
      endDate:              form.endDate,
      yesPrice:             Math.max(1, Math.min(99, Number(form.yesPrice))),
      suggestedLiquidityUSDC: Math.max(100, Number(form.suggestedLiquidityUSDC)),
      tags:                 form.tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean),
    });
  }

  const inputClass =
    "w-full rounded-xl border border-white/8 bg-[#0c0c1f] px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/40 transition-colors placeholder:text-white/20";
  const labelClass = "block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5";

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1,    y: 0 }}
          exit={{   opacity: 0, scale: 0.95, y: 8 }}
          className="w-full max-w-2xl rounded-2xl border border-cyan-500/20 bg-[#0d0b1a] p-6 shadow-2xl my-4"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Edit3 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Edit & Approve</h3>
              <p className="text-xs text-white/35 truncate">{market.question}</p>
            </div>
            <button onClick={onClose} className="ml-auto p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className={labelClass}>Question</label>
              <textarea
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                rows={2}
                className={inputClass + " resize-none"}
                style={{ color: "white", caretColor: "white" }}
              />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className={inputClass + " resize-none"}
                style={{ color: "white", caretColor: "white" }}
              />
            </div>
            <div>
              <label className={labelClass}>Resolution Criteria</label>
              <textarea
                value={form.resolutionCriteria}
                onChange={e => setForm(f => ({ ...f, resolutionCriteria: e.target.value }))}
                rows={3}
                className={inputClass + " resize-none"}
                style={{ color: "white", caretColor: "white" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>End Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className={inputClass}
                  style={{ color: "white", colorScheme: "dark" }}
                />
              </div>
              <div>
                <label className={labelClass}>YES Probability (1–99)</label>
                <input
                  type="number" min={1} max={99}
                  value={form.yesPrice}
                  onChange={e => setForm(f => ({ ...f, yesPrice: Number(e.target.value) }))}
                  className={inputClass}
                  style={{ color: "white" }}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Initial Liquidity (USDC)</label>
              <input
                type="number" min={100}
                value={form.suggestedLiquidityUSDC}
                onChange={e => setForm(f => ({ ...f, suggestedLiquidityUSDC: Number(e.target.value) }))}
                className={inputClass}
                style={{ color: "white" }}
              />
            </div>
            <div>
              <label className={labelClass}>Tags (comma-separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="israel, politics, elections"
                className={inputClass}
                style={{ color: "white", caretColor: "white" }}
              />
            </div>
          </div>

          <div className="flex gap-2.5 mt-5 pt-4 border-t border-white/5">
            <button
              onClick={handleApprove}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-400 hover:-translate-y-0.5 transition-all"
            >
              <Zap className="w-4 h-4" />
              Save & Approve
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/40 hover:text-white transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9997] overflow-hidden">
      {[...Array(24)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, x: "50vw", y: "50vh", scale: 1 }}
          animate={{
            opacity: 0,
            x: `${50 + (Math.random() - 0.5) * 80}vw`,
            y: `${Math.random() * -30}vh`,
            scale: 0,
            rotate: Math.random() * 720,
          }}
          transition={{ duration: 1.6 + Math.random() * 0.8, delay: i * 0.04, ease: "easeOut" }}
          className={`absolute w-2 h-2 rounded-sm ${
            ["bg-cyan-400","bg-emerald-400","bg-violet-400","bg-yellow-400","bg-pink-400","bg-blue-400"][i % 6]
          }`}
        />
      ))}
    </div>
  );
}

// ─── Market Card ──────────────────────────────────────────────────────────────

function MarketCard({
  market,
  isApproving,
  onApprove,
  onReject,
  onEdit,
  adminWallet,
}: {
  market:      PendingMarket;
  isApproving: boolean;
  onApprove:   (m: PendingMarket) => void;
  onReject:    (m: PendingMarket) => void;
  onEdit:      (m: PendingMarket) => void;
  adminWallet: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const catClass = CAT_COLORS[market.category] ?? CAT_COLORS.Finance;
  const isPub    = market.status === "published";
  const isPend   = market.status === "pending";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{    opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border bg-white/[0.025] transition-colors ${
        isPub
          ? "border-emerald-500/25 bg-emerald-500/[0.03]"
          : market.status === "rejected"
          ? "border-rose-500/15   opacity-60"
          : "border-white/8 hover:border-white/12"
      }`}
    >
      {/* Card header */}
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StatusBadge status={market.status} />
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${catClass}`}>
            {market.category}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/8 px-2.5 py-0.5 text-[10px] font-bold uppercase text-cyan-400">
            <Sparkles className="w-2.5 h-2.5" /> Claude
          </span>
          <span className="ml-auto text-[10px] text-white/20 font-mono flex items-center gap-1">
            <Hash className="w-3 h-3" />{market.id.slice(0, 8)}
          </span>
        </div>

        {/* Question */}
        <p className="text-base font-bold text-white leading-snug mb-3">
          {market.question}
        </p>
        {market.questionHe && (
          <p className="text-sm text-white/35 mb-3 font-mono" dir="rtl">{market.questionHe}</p>
        )}

        {/* Metrics row */}
        <div className="flex flex-wrap gap-4 text-xs text-white/40 font-mono mb-3">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-bold">{market.yesPrice}%</span> YES
          </span>
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3 text-violet-400" />
            {market.sentimentBullish}% bullish sentiment
          </span>
          <span className="flex items-center gap-1">
            <Search className="w-3 h-3" />
            {market.xPostsAnalyzed.toLocaleString()} X posts
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-cyan-400" />
            ${market.suggestedLiquidityUSDC.toLocaleString()} suggested
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Closes {market.resolveDate || market.endDate}
          </span>
        </div>

        {/* Probability bar */}
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${market.yesPrice}%` }}
          />
        </div>

        {/* Topic origin */}
        <div className="flex items-center gap-2 text-xs text-white/25 mb-3">
          <Hash className="w-3 h-3" />
          <span>From topic: <span className="text-white/45">{market.topic}</span></span>
          <span className="ml-auto">{new Date(market.submittedAt).toLocaleString("en-IL")}</span>
        </div>

        {/* Tags */}
        {market.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {market.tags.map(tag => (
              <span key={tag} className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-0.5 text-[10px] text-white/35">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Published info */}
        {isPub && market.conditionId && (
          <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 mb-3">
            <div className="text-xs">
              <span className="text-white/30 font-mono">Market ID: </span>
              <Link
                href={`/markets/${market.conditionId}`}
                className="text-emerald-400 font-mono hover:underline"
              >
                {market.conditionId.slice(0, 10)}…
              </Link>
            </div>
            {market.txHash && (
              <div className="text-xs">
                <span className="text-white/30 font-mono">TX: </span>
                <a
                  href={`https://polygonscan.com/tx/${market.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 font-mono hover:underline inline-flex items-center gap-0.5"
                >
                  {market.txHash.slice(0, 10)}…
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Rejection reason */}
        {market.status === "rejected" && market.rejectionReason && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/8 border border-rose-500/20 mb-3 text-xs text-rose-300/70">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-400" />
            {market.rejectionReason}
          </div>
        )}

        {/* Expandable: AI reasoning + resolution criteria */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide" : "Show"} AI reasoning & resolution criteria
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{   height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1.5 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> AI Reasoning
                  </p>
                  <p className="text-xs text-white/55 leading-relaxed">{market.aiReasoning}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Resolution Criteria
                  </p>
                  <p className="text-xs text-white/50 leading-relaxed">{market.resolutionCriteria}</p>
                </div>
                {market.resolutionSources?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {market.resolutionSources.map(s => (
                      <span key={s} className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/35 font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions footer — only for pending/approved */}
      {(isPend || market.status === "approved") && (
        <div className="border-t border-white/5 px-5 py-3.5 flex items-center gap-2.5">
          {isApproving ? (
            <div className="flex-1 flex items-center gap-2.5">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              </motion.div>
              <span className="text-xs text-emerald-400 font-semibold">Publishing to Polygon…</span>
            </div>
          ) : (
            <>
              {/* Approve & Publish */}
              <button
                onClick={() => onApprove(market)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 hover:-translate-y-0.5 transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                Approve & Publish
              </button>

              {/* Edit */}
              <button
                onClick={() => onEdit(market)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white/50 hover:text-white hover:border-white/20 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>

              {/* Reject */}
              <button
                onClick={() => onReject(market)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2 text-xs font-semibold text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </>
          )}

          {/* Submitter address (right-aligned) */}
          {market.submittedBy && (
            <span className="ml-auto text-[10px] text-white/20 font-mono hidden sm:block">
              by {market.submittedBy.slice(0, 6)}…{market.submittedBy.slice(-4)}
            </span>
          )}
        </div>
      )}

      {/* Published footer — link to market */}
      {isPub && market.conditionId && (
        <div className="border-t border-emerald-500/15 px-5 py-3 flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-400/70 font-semibold">Live on Polygon</span>
          <Link
            href={`/markets/${market.conditionId}`}
            className="ml-auto flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View Market <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// ─── Access denied ────────────────────────────────────────────────────────────

function AccessDenied({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="min-h-screen bg-[#03030a] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-5">
          <Shield className="w-8 h-8 text-rose-400" />
        </div>
        <h1 className="text-xl font-black text-white mb-2">Admin Access Only</h1>
        <p className="text-sm text-white/40 mb-6">
          {isConnected
            ? "Your wallet is not authorized to access this page."
            : "Connect the admin wallet to access the moderation queue."}
        </p>
        {!isConnected && (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-5 py-2.5 text-sm font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all"
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        )}
        <div className="mt-4">
          <Link href="/dashboard" className="text-xs text-white/25 hover:text-white/50 transition-colors">
            ← Back to app
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterKey = ModerationStatus | "all";

const FILTER_LABELS: Record<FilterKey, string> = {
  all:       "All",
  pending:   "Pending",
  approved:  "Approved",
  rejected:  "Rejected",
  published: "Published",
};

export default function ModeratePage() {
  const { address, isConnected } = useWallet();

  // Auth check
  const isAdmin =
    isConnected &&
    !!address &&
    !!ADMIN_WALLET &&
    address.toLowerCase() === ADMIN_WALLET;

  // ── State ──
  const [markets,      setMarkets]      = useState<PendingMarket[]>([]);
  const [counts,       setCounts]       = useState<Record<FilterKey, number>>({ all: 0, pending: 0, approved: 0, rejected: 0, published: 0 });
  const [loading,      setLoading]      = useState(false);
  const [filter,       setFilter]       = useState<FilterKey>("pending");
  const [search,       setSearch]       = useState("");
  const [rejectTarget, setRejectTarget] = useState<PendingMarket | null>(null);
  const [editTarget,   setEditTarget]   = useState<PendingMarket | null>(null);
  const [approvingId,  setApprovingId]  = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // On-chain creation — one instance shared across all markets on this page
  const createMarket = useCreateMarket(address);

  // Track which market we're currently approving
  const pendingApproveRef = useRef<PendingMarket | null>(null);

  // ── Fetch markets ──────────────────────────────────────────────────────────
  const fetchMarkets = useCallback(async () => {
    if (!isAdmin || !address) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: filter });
      if (search) params.set("search", search);
      const res = await apiFetch(`/api/markets/pending?${params}`, address);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setMarkets(data.markets ?? []);
      setCounts(data.counts ?? {});
    } catch {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, address, filter, search]);

  useEffect(() => {
    if (isAdmin) fetchMarkets();
  }, [isAdmin, fetchMarkets]);

  // ── Watch on-chain completion ──────────────────────────────────────────────
  useEffect(() => {
    if (!pendingApproveRef.current) return;

    if (createMarket.step === "complete") {
      const m = pendingApproveRef.current;
      pendingApproveRef.current = null;

      // Stamp the record as published
      void (async () => {
        if (!address) return;
        await apiFetch(`/api/markets/pending/${m.id}`, address, {
          method: "PATCH",
          body: JSON.stringify({
            status:       "published",
            conditionId:  createMarket.conditionId ?? undefined,
            txHash:       createMarket.txHash ?? undefined,
            clobMarketId: createMarket.clobMarketId ?? undefined,
            reviewedBy:   address,
          } satisfies PendingMarketPatch),
        });

        toast.success("Market published on Polygon! 🎉", { duration: 5000 });
        setApprovingId(null);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2800);
        createMarket.reset();
        fetchMarkets();
      })();
    }

    if (createMarket.step === "error") {
      toast.error(createMarket.error ?? "Transaction failed");
      setApprovingId(null);
      pendingApproveRef.current = null;
      createMarket.reset();
    }
  }, [createMarket.step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Approve handler ───────────────────────────────────────────────────────
  async function handleApprove(market: PendingMarket) {
    if (!address || approvingId) return;

    setApprovingId(market.id);
    pendingApproveRef.current = market;

    toast.loading("Starting on-chain publish…", { id: "approve" });

    const endDate = market.endDate
      ? new Date(market.endDate + "T12:00:00Z").toISOString()
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    await createMarket.create({
      question:             market.question,
      description:          market.description,
      resolutionCriteria:   market.resolutionCriteria,
      category:             market.category,
      endDate,
      aiGenerated:          true,
      initialLiquidityUSDC: market.suggestedLiquidityUSDC > 0
        ? Math.min(market.suggestedLiquidityUSDC, 500)
        : 0,
    });

    toast.dismiss("approve");
  }

  // ── Reject handler ────────────────────────────────────────────────────────
  async function handleReject(market: PendingMarket, reason: string) {
    if (!address) return;
    setRejectTarget(null);
    const res = await apiFetch(`/api/markets/pending/${market.id}`, address, {
      method: "PATCH",
      body: JSON.stringify({
        status: "rejected",
        rejectionReason: reason || undefined,
        reviewedBy: address,
      } satisfies PendingMarketPatch),
    });
    if (res.ok) {
      toast.success("Market rejected");
      fetchMarkets();
    } else {
      toast.error("Failed to reject");
    }
  }

  // ── Edit & approve handler ────────────────────────────────────────────────
  function handleEditApprove(edited: PendingMarket) {
    setEditTarget(null);
    handleApprove(edited);
  }

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!isConnected || !isAdmin) {
    return <AccessDenied isConnected={isConnected} />;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#03030a] text-white"
      style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
    >
      {showConfetti && <Confetti />}

      {/* Dialogs */}
      <AnimatePresence>
        {rejectTarget && (
          <RejectDialog
            key="reject"
            market={rejectTarget}
            onClose={() => setRejectTarget(null)}
            onConfirm={reason => handleReject(rejectTarget, reason)}
          />
        )}
        {editTarget && (
          <EditDialog
            key="edit"
            market={editTarget}
            onClose={() => setEditTarget(null)}
            onApprove={handleEditApprove}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#03030a]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Flame className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-sm font-black text-white hidden sm:block">
              Trend<span className="text-cyan-400">Forge</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-violet-500/25 bg-violet-500/8">
            <Shield className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Admin</span>
          </div>

          <h1 className="text-sm font-bold text-white/60 hidden md:block">Moderation Queue</h1>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-white/25 font-mono hidden sm:block">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
            <Link
              href="/dashboard"
              className="text-xs text-white/30 hover:text-white transition-colors"
            >
              ← App
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">

        {/* ── Stats bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {(["pending", "approved", "rejected", "published"] as ModerationStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-xl border p-3.5 text-left transition-all hover:-translate-y-0.5 ${
                  filter === s
                    ? `${cfg.color} border-current/40`
                    : "border-white/6 bg-white/[0.02] hover:border-white/10"
                }`}
              >
                <p className={`text-xl font-black mb-0.5 ${filter === s ? "" : "text-white"}`}>
                  {counts[s] ?? 0}
                </p>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${filter === s ? "" : "text-white/30"}`}>
                  {FILTER_LABELS[s]}
                </p>
              </button>
            );
          })}
        </motion.div>

        {/* ── Search + filter bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-2.5 flex-wrap"
        >
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search question, topic, tag…"
              className="w-full rounded-xl border border-white/8 bg-white/[0.03] pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500/40 placeholder:text-white/20 transition-colors"
              style={{ color: "white", caretColor: "white" }}
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-white/[0.03] border border-white/8 rounded-xl p-1">
            {(["all", "pending", "published", "rejected"] as FilterKey[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-white/35 hover:text-white"
                }`}
              >
                {FILTER_LABELS[f]}
                {counts[f] > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-60">{counts[f]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={fetchMarkets}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white/40 hover:text-white hover:border-white/15 transition-all disabled:opacity-40"
          >
            <motion.span animate={{ rotate: loading ? 360 : 0 }} transition={{ repeat: loading ? Infinity : 0, duration: 0.8, ease: "linear" }}>
              <RefreshCw className="w-3.5 h-3.5" />
            </motion.span>
            Refresh
          </button>
        </motion.div>

        {/* ── In-progress publish bar ── */}
        <AnimatePresence>
          {approvingId && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{   opacity: 0, y: -8 }}
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 flex items-center gap-3"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
              >
                <Zap className="w-4 h-4 text-emerald-400" />
              </motion.div>
              <div className="flex-1">
                <p className="text-xs font-bold text-emerald-400">{createMarket.stepLabel}</p>
                <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    animate={{ width: `${createMarket.progress}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full bg-emerald-500"
                  />
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400/50">{createMarket.progress}%</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Market list ── */}
        {loading && markets.length === 0 ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-white/[0.025] animate-pulse" />
            ))}
          </div>
        ) : markets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-white/6 bg-white/[0.02] p-12 text-center"
          >
            <Eye className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white/30">
              {filter === "pending" ? "Queue is empty — no markets awaiting review." : `No ${filter} markets.`}
            </p>
            <p className="text-xs text-white/15 mt-1">
              Markets submitted from the AI Generator will appear here.
            </p>
            <Link
              href="/ai-generator"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate a market
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {markets.map(market => (
                <MarketCard
                  key={market.id}
                  market={market}
                  isApproving={approvingId === market.id}
                  onApprove={handleApprove}
                  onReject={m => setRejectTarget(m)}
                  onEdit={m => setEditTarget(m)}
                  adminWallet={address ?? ""}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="pt-4 pb-8 text-center text-xs text-white/15">
          TrendForge Admin · Queue stored in-memory
          {" "}(
          <a
            href="https://upstash.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/40 transition-colors underline underline-offset-2"
          >
            upgrade to Upstash
          </a>
          {" "}for production persistence)
        </div>
      </div>
    </div>
  );
}
