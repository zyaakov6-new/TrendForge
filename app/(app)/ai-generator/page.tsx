"use client";

/**
 * AI Generator Page — TrendForge's star feature.
 *
 * Real integration notes (marked with TODO):
 *  - Anthropic Claude API call: replace `simulateGeneration()` with a
 *    POST to /api/generate-market (server action calling claude-3-5-sonnet)
 *  - Polygon/Kuest publish: replace `handlePublish()` with wagmi
 *    `useContractWrite` to the Kuest MarketFactory contract
 *  - Wallet check: wrap publish button with `useAccount()` from wagmi
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Flame,
  Brain,
  Search,
  BarChart3,
  CheckCircle,
  Clock,
  RefreshCw,
  Hash,
  ArrowRight,
  X,
  Edit3,
  DollarSign,
  TrendingUp,
  Zap,
  Copy,
  Globe,
  ChevronDown,
} from "lucide-react";
import { GENERATED_HISTORY, MarketCategory } from "@/lib/mock-data";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  {
    id: "scan",
    icon: Search,
    label: "Scanning X for related posts...",
    detail: "Fetching recent posts & quote-tweets",
    color: "cyan",
  },
  {
    id: "analyze",
    icon: Brain,
    label: "Analyzing sentiment...",
    detail: "Processing posts found across X",
    color: "violet",
  },
  {
    id: "write",
    icon: Edit3,
    label: "Writing market question...",
    detail: "Applying Polymarket-quality standards",
    color: "blue",
  },
  {
    id: "criteria",
    icon: CheckCircle,
    label: "Defining resolution criteria...",
    detail: "Setting verifiable, unambiguous conditions",
    color: "emerald",
  },
] as const;

const TOPIC_SUGGESTIONS = [
  "Will Netanyahu call elections before July?",
  "Bank of Israel rate cut June 2026",
  "Israel UAE tech deal 2026",
  "OpenAI GPT-5 vs Claude 4",
  "Bitcoin $200K before 2027",
];

const CATEGORY_OPTIONS: MarketCategory[] = [
  "Politics",
  "Geopolitics",
  "Crypto",
  "Tech",
  "Finance",
  "Sports",
  "Israel",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedMarket {
  question: string;
  category: MarketCategory;
  yesPrice: number;
  resolveDate: string;
  criteria: string;
  xPostsAnalyzed: number;
  sentimentBullish: number;
  suggestedLiquidity: number;
  tags: string[];
}

type GenState = "idle" | "loading" | "result" | "published";

// ─── Mock generation ──────────────────────────────────────────────────────────

// TODO: Replace with POST /api/generate-market → Anthropic Claude API
function buildMockMarket(topic: string): GeneratedMarket {
  const trimmed = topic.trim();
  const question =
    trimmed.endsWith("?") ? trimmed : trimmed + "?";
  const yesPrice = Math.floor(Math.random() * 46) + 28;
  const categories: MarketCategory[] = [
    "Politics",
    "Finance",
    "Tech",
    "Geopolitics",
  ];
  return {
    question:
      question.charAt(0).toUpperCase() + question.slice(1),
    category: categories[Math.floor(Math.random() * categories.length)],
    yesPrice,
    resolveDate: "Jul 1, 2026",
    criteria: `Resolves YES if verified by at least two credible primary sources (Reuters, AP, Haaretz, Times of Israel, or official government announcements). Resolves NO if the event does not occur before the resolution date. Resolves N/A if the market becomes ambiguous or unanswerable due to external circumstances outside the original scope.`,
    xPostsAnalyzed: Math.floor(Math.random() * 8000) + 6000,
    sentimentBullish: Math.floor(Math.random() * 45) + 35,
    suggestedLiquidity: Math.floor(Math.random() * 18000) + 5000,
    tags: ["israel", "AI-generated", "live-news"],
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const stepColorMap = {
  cyan: {
    done: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
    active: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300",
    text: "text-cyan-400",
  },
  violet: {
    done: "bg-violet-500/15 border-violet-500/30 text-violet-400",
    active: "bg-violet-500/10 border-violet-500/20 text-violet-300",
    text: "text-violet-400",
  },
  blue: {
    done: "bg-blue-500/15 border-blue-500/30 text-blue-400",
    active: "bg-blue-500/10 border-blue-500/20 text-blue-300",
    text: "text-blue-400",
  },
  emerald: {
    done: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    active: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    text: "text-emerald-400",
  },
};

function LoadingPanel({ step }: { step: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"
        >
          <Brain className="w-4.5 h-4.5 text-violet-400" />
        </motion.div>
        <div>
          <p className="text-sm font-bold text-white">
            Claude is forging your market...
          </p>
          <p className="text-xs text-white/35">
            Step {Math.min(step, LOADING_STEPS.length)} of {LOADING_STEPS.length}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/5 mb-6 overflow-hidden">
        <motion.div
          animate={{ width: `${(step / LOADING_STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
        />
      </div>

      <div className="space-y-3">
        {LOADING_STEPS.map((s, i) => {
          const isDone = i < step;
          const isActive = i === step - 1 && step <= LOADING_STEPS.length;
          const colors = stepColorMap[s.color];
          const Icon = s.icon;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: isDone || isActive ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              <div
                className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
                  isDone
                    ? colors.done
                    : isActive
                    ? colors.active
                    : "bg-white/4 border-white/8"
                }`}
              >
                {isDone ? (
                  <CheckCircle className={`w-3.5 h-3.5 ${colors.text}`} />
                ) : isActive ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${colors.text}`} />
                  </motion.div>
                ) : (
                  <Icon className="w-3.5 h-3.5 text-white/20" />
                )}
              </div>
              <div>
                <p
                  className={`text-xs font-semibold transition-colors ${
                    isDone
                      ? colors.text
                      : isActive
                      ? "text-white"
                      : "text-white/30"
                  }`}
                >
                  {s.label}
                </p>
                <p className="text-[10px] text-white/22">{s.detail}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function ResultCard({
  market,
  onPublish,
  onReset,
}: {
  market: GeneratedMarket;
  onPublish: () => void;
  onReset: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(market.question);
  const [selectedCategory, setSelectedCategory] = useState(
    market.category
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", bounce: 0.22, duration: 0.6 }}
      className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-950/25 via-slate-950/40 to-slate-950/60 p-6 shadow-2xl shadow-cyan-500/5"
    >
      {/* Card header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
            <Sparkles className="w-2.5 h-2.5" />
            AI-Generated
          </span>
          <span className="text-[10px] text-white/30 flex items-center gap-1 font-mono">
            <Clock className="w-2.5 h-2.5" />
            Resolves {market.resolveDate}
          </span>
        </div>
        <button
          onClick={onReset}
          className="p-1.5 rounded-lg text-white/20 hover:text-white hover:bg-white/5 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Question — inline editable */}
      <div className="mb-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5 block">
          Market Question
        </label>
        {editing ? (
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onBlur={() => setEditing(false)}
            autoFocus
            rows={2}
            className="w-full resize-none rounded-xl border border-cyan-500/40 bg-cyan-500/5 px-3.5 py-2.5 text-base font-bold text-white outline-none focus:border-cyan-500/70"
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            className="group flex items-start justify-between gap-2 cursor-text p-3 rounded-xl border border-transparent hover:border-white/8 hover:bg-white/3 transition-all"
          >
            <p className="text-base font-bold text-white leading-snug">
              {question}
            </p>
            <Edit3 className="w-3.5 h-3.5 text-white/20 group-hover:text-cyan-400 flex-shrink-0 mt-0.5 transition-colors" />
          </div>
        )}
      </div>

      {/* Category selector */}
      <div className="mb-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5 block">
          Category
        </label>
        <div className="relative inline-block">
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as MarketCategory)
            }
            className="appearance-none rounded-lg border border-white/8 bg-white/4 px-3 py-2 pr-7 text-xs font-semibold text-white/70 outline-none cursor-pointer"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c} className="bg-zinc-900">
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Probabilities */}
      <div className="mb-4 rounded-xl border border-white/6 bg-white/3 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-white/40">
            Suggested Probabilities
          </span>
          <span className="text-[10px] text-white/22 font-mono">
            from X sentiment analysis
          </span>
        </div>
        <div className="flex gap-3 mb-3">
          <div className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
            <p className="text-2xl font-black text-emerald-400 font-mono">
              {market.yesPrice}¢
            </p>
            <p className="text-[10px] font-bold uppercase text-emerald-400/60 tracking-wider mt-0.5">
              YES
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-center">
            <p className="text-2xl font-black text-rose-400 font-mono">
              {100 - market.yesPrice}¢
            </p>
            <p className="text-[10px] font-bold uppercase text-rose-400/60 tracking-wider mt-0.5">
              NO
            </p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${market.yesPrice}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
          />
        </div>
      </div>

      {/* Resolution criteria */}
      <div className="mb-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5 block">
          Resolution Criteria
        </label>
        <p className="text-xs text-white/50 leading-relaxed rounded-xl bg-white/[0.025] border border-white/5 p-3.5">
          {market.criteria}
        </p>
      </div>

      {/* AI metadata */}
      <div className="flex flex-wrap gap-3 mb-5 text-[11px] text-white/30 font-mono">
        <span className="flex items-center gap-1">
          <Search className="w-3 h-3" />
          {market.xPostsAnalyzed.toLocaleString()} X posts
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {market.sentimentBullish}% bullish
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          Suggested liquidity: $
          {market.suggestedLiquidity.toLocaleString()}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {/* TODO: Replace onClick with wagmi useContractWrite to Kuest MarketFactory */}
        <button
          onClick={onPublish}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 hover:-translate-y-0.5 transition-all duration-200"
        >
          <Zap className="w-4 h-4" />
          Publish to Polygon
        </button>
        <button
          onClick={onReset}
          className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm font-semibold text-white/45 hover:text-white hover:border-white/15 transition-all"
        >
          Regenerate
        </button>
      </div>
    </motion.div>
  );
}

function SuccessPanel({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", bounce: 0.35 }}
      className="relative rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center overflow-hidden"
    >
      {/* Confetti particles */}
      {[...Array(16)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, x: "50%", y: "100%", scale: 1 }}
          animate={{
            opacity: 0,
            x: `${50 + (Math.random() - 0.5) * 130}%`,
            y: `${-10 + Math.random() * -80}%`,
            scale: 0,
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: 1.4 + Math.random() * 0.6,
            delay: i * 0.05,
            ease: "easeOut",
          }}
          className={`absolute w-2 h-2 rounded-sm ${
            [
              "bg-cyan-400",
              "bg-emerald-400",
              "bg-violet-400",
              "bg-yellow-400",
              "bg-pink-400",
              "bg-blue-400",
            ][i % 6]
          }`}
        />
      ))}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1, bounce: 0.65 }}
        className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/35 mb-4"
      >
        <CheckCircle className="w-8 h-8 text-emerald-400" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h3 className="text-2xl font-black text-white mb-2">
          Market is Live! 🎉
        </h3>
        <p className="text-sm text-white/50 mb-1">
          Your market is now open for trading on Polygon.
        </p>
        <p className="text-xs text-white/25 font-mono mb-6">
          TX: 0x3f4a...9b12 · Block confirmed in 0.8s
        </p>

        <div className="flex justify-center gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 px-5 py-2.5 text-sm font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all">
            <BarChart3 className="w-4 h-4" />
            View Market
          </button>
          <button
            onClick={onReset}
            className="rounded-xl border border-white/8 bg-white/4 px-5 py-2.5 text-sm font-semibold text-white/45 hover:text-white transition-all"
          >
            Forge Another
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AIGeneratorPage() {
  const [topic, setTopic] = useState("");
  const [genState, setGenState] = useState<GenState>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const [generatedMarket, setGeneratedMarket] =
    useState<GeneratedMarket | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle placeholder suggestions
  useEffect(() => {
    const id = setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % TOPIC_SUGGESTIONS.length),
      3200
    );
    return () => clearInterval(id);
  }, []);

  const startGeneration = async () => {
    if (!topic.trim()) return;
    setGenState("loading");
    setLoadingStep(0);

    // Simulate step-by-step Claude processing
    // TODO: Replace with streaming SSE from POST /api/generate-market
    for (let i = 1; i <= LOADING_STEPS.length; i++) {
      await new Promise((r) =>
        setTimeout(r, 650 + Math.random() * 450)
      );
      setLoadingStep(i);
    }
    await new Promise((r) => setTimeout(r, 350));
    setGeneratedMarket(buildMockMarket(topic));
    setGenState("result");
  };

  const handlePublish = () => {
    // TODO: wagmi useContractWrite → Kuest MarketFactory.createMarket(...)
    setGenState("published");
  };

  const handleReset = () => {
    setTopic("");
    setGenState("idle");
    setGeneratedMarket(null);
    setLoadingStep(0);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/8 px-4 py-1.5 text-sm font-semibold text-cyan-300">
          <Sparkles className="w-4 h-4" />
          Powered by Claude AI
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2 leading-tight">
          Forge New Markets
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {" "}
            with Claude AI
          </span>
        </h1>
        <p className="text-white/45 text-sm md:text-base max-w-2xl">
          Describe a trend, paste an X link, or type any topic in Hebrew or
          English. Claude writes a production-ready prediction market in
          seconds.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* ── Left: Generator + Results ── */}
        <div className="space-y-4 min-w-0">
          {/* Input panel */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 md:p-6"
          >
            {/* Textarea */}
            <div className="relative mb-3">
              <Hash className="absolute left-4 top-4 w-4 h-4 text-white/20" />
              <textarea
                ref={textareaRef}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && genState === "idle") {
                    startGeneration();
                  }
                }}
                disabled={genState !== "idle"}
                placeholder={`${TOPIC_SUGGESTIONS[placeholderIdx]}\n\nOr paste an X post URL, Hebrew topic, or any trend...`}
                rows={4}
                className="w-full resize-none rounded-xl border border-white/8 bg-white/4 pl-10 pr-4 py-3.5 text-sm text-white placeholder:text-white/22 outline-none focus:border-cyan-500/35 focus:ring-1 focus:ring-cyan-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="absolute bottom-3 right-3 text-[10px] text-white/20 font-mono">
                {topic.length}/280
              </div>
            </div>

            {/* Options row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/3 px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white hover:border-white/15 transition-all">
                <Globe className="w-3.5 h-3.5" />
                Hebrew / עברית
              </button>
              <span className="text-white/15 text-xs">·</span>
              <span className="text-xs text-white/22">
                ⌘↵ to generate
              </span>
            </div>

            {/* Suggestion chips — only when idle */}
            <AnimatePresence>
              {genState === "idle" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5"
                >
                  <p className="text-[11px] text-white/28 mb-2 font-medium">
                    Try these examples:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TOPIC_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setTopic(s)}
                        className="rounded-full border border-white/8 bg-white/3 px-3 py-1 text-xs text-white/45 hover:text-white hover:border-white/18 hover:bg-white/6 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generate button */}
            <button
              onClick={startGeneration}
              disabled={!topic.trim() || genState !== "idle"}
              className={`w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-base font-bold transition-all duration-200 ${
                !topic.trim() || genState !== "idle"
                  ? "bg-white/5 text-white/25 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/35 hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              <Flame className="w-5 h-5" />
              Generate Market with Claude
            </button>
          </motion.div>

          {/* Dynamic result area */}
          <AnimatePresence mode="wait">
            {genState === "loading" && (
              <LoadingPanel key="loading" step={loadingStep} />
            )}
            {genState === "result" && generatedMarket && (
              <ResultCard
                key="result"
                market={generatedMarket}
                onPublish={handlePublish}
                onReset={handleReset}
              />
            )}
            {genState === "published" && (
              <SuccessPanel key="success" onReset={handleReset} />
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: History + Tips ── */}
        <div className="space-y-4">
          {/* History */}
          <motion.div
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/35" />
              Recent Generations
            </h3>
            <div className="space-y-2.5">
              {GENERATED_HISTORY.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  className="rounded-xl border border-white/6 bg-white/[0.02] p-3.5 hover:border-white/10 hover:bg-white/[0.035] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        item.published
                          ? "text-emerald-400 bg-emerald-500/8 border-emerald-500/20"
                          : "text-white/30 bg-white/4 border-white/8"
                      }`}
                    >
                      {item.published ? (
                        <CheckCircle className="w-2.5 h-2.5" />
                      ) : (
                        <Clock className="w-2.5 h-2.5" />
                      )}
                      {item.published ? "Live" : "Draft"}
                    </span>
                    <span className="text-[10px] text-white/22 font-mono">
                      {item.createdAt}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white/70 leading-snug line-clamp-2 mb-2 group-hover:text-white/90 transition-colors">
                    {item.question}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-white/28 font-mono">
                    <span>YES {item.yesPrice}¢</span>
                    {item.volume > 0 && (
                      <span>${(item.volume / 1000).toFixed(0)}K vol</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-4"
          >
            <p className="text-xs font-bold text-blue-300 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Tips for great markets
            </p>
            <ul className="space-y-1.5 text-xs text-white/40 leading-relaxed">
              <li>• Use specific dates — "before August 2026"</li>
              <li>• Name entities — Netanyahu, Bank of Israel</li>
              <li>• One clear verifiable binary outcome</li>
              <li>• Paste X post URLs for richer context</li>
              <li>• Hebrew topics fully supported ✓</li>
            </ul>
          </motion.div>

          {/* Stats chip */}
          <motion.div
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl border border-white/6 bg-white/[0.02] p-4 space-y-2"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">
              Platform Stats
            </p>
            {[
              { label: "Markets generated", value: "1,284" },
              { label: "Published & live", value: "980" },
              { label: "Avg. approval time", value: "28s" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-white/35">{label}</span>
                <span className="font-bold font-mono text-white/70">
                  {value}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
