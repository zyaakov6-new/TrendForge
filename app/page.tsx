"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "framer-motion";
import {
  Flame, Zap, TrendingUp, Globe, Shield, Layers,
  CheckCircle, ArrowRight, Wallet, BarChart3, Twitter,
  Sparkles, ChevronDown, Star, Activity, Clock,
  Hash, Users, DollarSign, Volume2, RefreshCw, X,
  MessageSquare, Eye, Brain, Cpu
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MarketCard {
  id: number;
  question: string;
  questionHe?: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  category: string;
  trending: boolean;
  aiGenerated: boolean;
  timeLeft: string;
  change: number;
}

interface GeneratedMarket {
  question: string;
  description: string;
  yesPrice: number;
  noPrice: number;
  category: string;
  resolveDate: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TRENDING_MARKETS: MarketCard[] = [
  {
    id: 1,
    question: "Will Netanyahu call snap elections before August 2026?",
    questionHe: "האם נתניהו יכריז על בחירות לפני אוגוסט 2026?",
    yesPrice: 67,
    noPrice: 33,
    volume: "$184,200",
    category: "Israel Politics",
    trending: true,
    aiGenerated: true,
    timeLeft: "42 days",
    change: +8.3,
  },
  {
    id: 2,
    question: "Will Israel–Hamas ceasefire hold through end of May?",
    questionHe: undefined,
    yesPrice: 41,
    noPrice: 59,
    volume: "$312,550",
    category: "Geopolitics",
    trending: true,
    aiGenerated: true,
    timeLeft: "39 days",
    change: -4.1,
  },
  {
    id: 3,
    question: "Will the Tel Aviv Stock Exchange close above 2,500 in Q2 2026?",
    yesPrice: 54,
    noPrice: 46,
    volume: "$97,800",
    category: "Finance",
    trending: false,
    aiGenerated: true,
    timeLeft: "71 days",
    change: +2.7,
  },
  {
    id: 4,
    question: "Will OpenAI release GPT-5 before Anthropic releases Claude 4?",
    yesPrice: 38,
    noPrice: 62,
    volume: "$428,100",
    category: "AI / Tech",
    trending: true,
    aiGenerated: false,
    timeLeft: "88 days",
    change: +12.0,
  },
  {
    id: 5,
    question: "Will Ethereum ETF spot inflows exceed $1B in May 2026?",
    yesPrice: 72,
    noPrice: 28,
    volume: "$203,400",
    category: "Crypto",
    trending: false,
    aiGenerated: true,
    timeLeft: "9 days",
    change: +19.4,
  },
];

const SAMPLE_TOPICS = [
  "Will Netanyahu call elections before July?",
  "Will Apple announce AR glasses at WWDC?",
  "Will Bitcoin hit $150k before 2027?",
  "Will Israel join NATO by 2028?",
  "Will OpenAI reach $500B valuation?",
];

const FEATURES = [
  {
    icon: Brain,
    title: "Instant AI Market Creation",
    description: "Claude scans X trends every 60 seconds and auto-drafts perfectly-worded prediction markets ready to publish.",
    gradient: "from-cyan-500/15 to-blue-500/10",
    border: "border-cyan-500/25",
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/10 border-cyan-500/30",
    glow: "shadow-cyan-500/20",
  },
  {
    icon: Activity,
    title: "Real-time X Sentiment",
    description: "Live sentiment analysis across 10k+ X posts per topic. Markets move before mainstream news catches up.",
    gradient: "from-purple-500/15 to-pink-500/10",
    border: "border-purple-500/25",
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10 border-purple-500/30",
    glow: "shadow-purple-500/20",
  },
  {
    icon: Globe,
    title: "Hebrew + English Markets",
    description: "First prediction market built natively for Israeli users. Full RTL support, Hebrew market questions.",
    gradient: "from-blue-500/15 to-indigo-500/10",
    border: "border-blue-500/25",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/30",
    glow: "shadow-blue-500/20",
  },
  {
    icon: Layers,
    title: "Shared Liquidity Pool",
    description: "Fork of Polymarket's AMM with shared liquidity. Deep order books from day one via Kuest protocol.",
    gradient: "from-emerald-500/15 to-teal-500/10",
    border: "border-emerald-500/25",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/30",
    glow: "shadow-emerald-500/20",
  },
  {
    icon: Zap,
    title: "Lightning Polygon Trading",
    description: "Sub-second trades on Polygon PoS. $0.001 gas fees. USDC settlement. No KYC for under $500.",
    gradient: "from-yellow-500/15 to-orange-500/10",
    border: "border-yellow-500/25",
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-500/10 border-yellow-500/30",
    glow: "shadow-yellow-500/20",
  },
  {
    icon: Shield,
    title: "Community Governance",
    description: "One-click approval flow. Community validators ensure quality before markets go live. Zero spam.",
    gradient: "from-rose-500/15 to-red-500/10",
    border: "border-rose-500/25",
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/30",
    glow: "shadow-rose-500/20",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Twitter,
    title: "Trend Detected",
    description: "Claude monitors X, Israeli news, and Telegram channels in real-time. A topic spikes.",
    color: "text-cyan-400",
    accentColor: "cyan",
    borderColor: "border-cyan-500/40",
    glowColor: "rgba(6,182,212,0.15)",
  },
  {
    step: "02",
    icon: Brain,
    title: "AI Writes the Market",
    description: "Claude analyzes context, writes a sharp binary question, sets resolve conditions and deadline.",
    color: "text-violet-400",
    accentColor: "violet",
    borderColor: "border-violet-500/40",
    glowColor: "rgba(139,92,246,0.15)",
  },
  {
    step: "03",
    icon: CheckCircle,
    title: "One-Click Approval",
    description: "Community validators review in 30 seconds. One click. Market goes live immediately.",
    color: "text-emerald-400",
    accentColor: "emerald",
    borderColor: "border-emerald-500/40",
    glowColor: "rgba(52,211,153,0.15)",
  },
  {
    step: "04",
    icon: BarChart3,
    title: "Trade with USDC",
    description: "Instant liquidity on Polygon. Trade Yes/No shares. Profit when reality confirms your thesis.",
    color: "text-orange-400",
    accentColor: "orange",
    borderColor: "border-orange-500/40",
    glowColor: "rgba(251,146,60,0.15)",
  },
];

const TRUST_ITEMS = [
  { icon: DollarSign, text: "$2.4M Traded" },
  { icon: Users, text: "18K Active Traders" },
  { icon: Cpu, text: "Backed by Claude AI" },
  { icon: Globe, text: "Hebrew + English" },
  { icon: Zap, text: "Polygon Network" },
  { icon: Star, text: "Community Governed" },
  { icon: Shield, text: "No KYC Under $500" },
  { icon: Activity, text: "Real-time Sentiment" },
];

// ─── Utility ─────────────────────────────────────────────────────────────────
const cn = (...classes: (string | undefined | false)[]) =>
  classes.filter(Boolean).join(" ");

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlowOrb({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-full blur-[120px] opacity-25",
        className
      )}
    />
  );
}

function NoiseBg() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 128px",
      }}
    />
  );
}

function GridLines() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0,230,255,1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,230,255,1) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />
  );
}

// ─── Probability Bar — redesigned with split YES/NO price display ─────────────
function MarketProbabilityBar({ yes, no }: { yes: number; no: number }) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-emerald-950/70 border border-emerald-500/20 px-3 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-600 mb-0.5">YES</p>
          <p className="text-xl font-black font-mono text-emerald-400 leading-none tabular-nums">{yes}¢</p>
        </div>
        <div className="rounded-xl bg-rose-950/70 border border-rose-500/20 px-3 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-rose-600 mb-0.5">NO</p>
          <p className="text-xl font-black font-mono text-rose-400 leading-none tabular-nums">{no}¢</p>
        </div>
      </div>
      <div className="relative h-1 rounded-full overflow-hidden flex">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shrink-0"
          initial={{ width: 0 }}
          animate={{ width: `${yes}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
        <div className="flex-1 bg-rose-900/50" />
      </div>
    </div>
  );
}

// ─── Market Card ─────────────────────────────────────────────────────────────
function TrendingMarketCard({ market, index }: { market: MarketCard; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-md cursor-pointer overflow-hidden transition-all duration-300 hover:border-cyan-500/35 hover:bg-white/[0.05] hover:shadow-xl hover:shadow-cyan-500/8"
    >
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-cyan-500/[0.04] via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
            {market.category}
          </span>
          {market.aiGenerated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </span>
          )}
          {market.trending && (
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
              <TrendingUp className="w-2.5 h-2.5" />
              Hot
            </span>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-xs font-mono font-bold",
            market.change > 0
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-rose-500/10 text-rose-400"
          )}
        >
          {market.change > 0 ? "+" : ""}{market.change}%
        </span>
      </div>

      {/* Question */}
      <p className="mb-4 text-sm font-semibold text-white/85 leading-relaxed line-clamp-2">
        {market.question}
      </p>

      {/* Probability */}
      <MarketProbabilityBar yes={market.yesPrice} no={market.noPrice} />

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-white/35 font-mono">
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {market.volume}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {market.timeLeft}
          </span>
        </div>
        <Link
          href={`/markets/${market.id}`}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-400 transition-all hover:bg-cyan-500/20 hover:border-cyan-500/55 hover:shadow-sm hover:shadow-cyan-500/25"
        >
          Trade <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative rounded-2xl border p-6 backdrop-blur-md transition-all duration-300 overflow-hidden",
        `bg-gradient-to-br ${feature.gradient}`,
        feature.border,
        "hover:shadow-lg",
        `hover:${feature.glow}`
      )}
    >
      {/* Inner card gloss */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

      {/* Icon */}
      <div className={cn(
        "relative mb-5 inline-flex rounded-xl p-3 border",
        feature.iconBg,
      )} style={{ boxShadow: `0 0 20px 0px ${feature.glow.includes('cyan') ? 'rgba(6,182,212,0.2)' : feature.glow.includes('purple') ? 'rgba(168,85,247,0.2)' : feature.glow.includes('blue') ? 'rgba(59,130,246,0.2)' : feature.glow.includes('emerald') ? 'rgba(52,211,153,0.2)' : feature.glow.includes('yellow') ? 'rgba(234,179,8,0.2)' : 'rgba(244,63,94,0.2)'}` }}>
        <Icon className={cn("w-5 h-5", feature.iconColor)} />
      </div>

      <h3 className="mb-2 text-base font-bold text-white/95">{feature.title}</h3>
      <p className="text-sm text-white/45 leading-relaxed">{feature.description}</p>
    </motion.div>
  );
}

// ─── How It Works Step ────────────────────────────────────────────────────────
function HowItWorksStep({ step, index }: { step: typeof HOW_IT_WORKS[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12 }}
      className="relative flex flex-col items-center text-center"
    >
      {/* Connector line — dashed, higher contrast */}
      {index < HOW_IT_WORKS.length - 1 && (
        <div className="hidden lg:block absolute top-10 left-[calc(50%+52px)] right-[calc(-50%+52px)] h-px">
          <div
            className="w-full h-full opacity-30"
            style={{
              backgroundImage: "repeating-linear-gradient(90deg, rgba(148,163,184,0.6) 0, rgba(148,163,184,0.6) 6px, transparent 6px, transparent 14px)",
            }}
          />
        </div>
      )}

      {/* Badge */}
      <div className="mb-5 relative">
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-2xl blur-md opacity-40 scale-110"
          style={{ backgroundColor: step.glowColor }}
        />
        <div className={cn(
          "relative flex items-center justify-center w-20 h-20 rounded-2xl border bg-[#06060f] backdrop-blur",
          step.borderColor
        )}>
          <Icon className={cn("w-7 h-7", step.color)} />
        </div>
        {/* Step number — repositioned, more visible */}
        <span className={cn(
          "absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-mono font-black bg-[#06060f]",
          step.borderColor,
          step.color
        )}>
          {index + 1}
        </span>
      </div>

      <h3 className="mb-2 text-sm font-bold text-white tracking-wide">{step.title}</h3>
      <p className="max-w-[190px] text-xs text-white/40 leading-relaxed">{step.description}</p>
    </motion.div>
  );
}

// ─── Hero Demo Animation ───────────────────────────────────────────────────────
function HeroDemoAnimation() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 1200),
      setTimeout(() => setStage(2), 2800),
      setTimeout(() => setStage(3), 4200),
      setTimeout(() => setStage(0), 7000),
    ];
    const loop = setInterval(() => {
      setStage(0);
      setTimeout(() => setStage(1), 1200);
      setTimeout(() => setStage(2), 2800);
      setTimeout(() => setStage(3), 4200);
    }, 8000);
    return () => { timers.forEach(clearTimeout); clearInterval(loop); };
  }, []);

  return (
    <div className="relative w-full max-w-sm mx-auto h-[380px]">
      {/* X Post Card */}
      <AnimatePresence>
        {stage >= 0 && (
          <motion.div
            key="xpost"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: stage < 2 ? 1 : 0.3, x: 0, scale: stage >= 2 ? 0.85 : 1 }}
            transition={{ duration: 0.6 }}
            className="absolute top-0 left-0 right-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">BB</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Breaking — Israel</p>
                <p className="text-xs text-white/40">@breakingnews_il · 2m</p>
              </div>
              <div className="ml-auto">
                <X className="w-4 h-4 text-white/30" />
              </div>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              🚨 Senior Likud officials signal Netanyahu may call{" "}
              <span className="text-cyan-400 font-semibold">snap elections</span> before the
              summer recess. Coalition sources confirm talks.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-white/30">
              <span className="flex gap-1 items-center"><MessageSquare className="w-3 h-3" />847</span>
              <span className="flex gap-1 items-center"><RefreshCw className="w-3 h-3" />2.1K</span>
              <span className="flex gap-1 items-center"><Eye className="w-3 h-3" />94K</span>
            </div>

            {/* Scanning overlay */}
            <AnimatePresence>
              {stage === 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-2xl overflow-hidden"
                >
                  <motion.div
                    initial={{ top: "0%" }}
                    animate={{ top: "100%" }}
                    transition={{ duration: 1.2, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80"
                    style={{ boxShadow: "0 0 20px 4px rgba(0,230,255,0.4)" }}
                  />
                  <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400/40 animate-pulse" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Arrow + Claude badge */}
      <AnimatePresence>
        {stage >= 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="absolute top-[130px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10"
          >
            <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/50 bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-300">
              <Cpu className="w-3 h-3" />
              Claude AI
            </div>
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              <ChevronDown className="w-5 h-5 text-cyan-400" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Market Card */}
      <AnimatePresence>
        {stage >= 3 && (
          <motion.div
            key="marketcard"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
            className="absolute bottom-0 left-0 right-0 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-slate-950/60 p-4 backdrop-blur shadow-xl shadow-cyan-500/10"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/50 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                <Sparkles className="w-2.5 h-2.5" /> AI-Generated
              </span>
              <span className="text-[10px] text-white/30 ml-auto">Resolves Jun 30, 2026</span>
            </div>
            <p className="text-sm font-semibold text-white mb-3 leading-snug">
              Will Netanyahu call snap elections before August 2026?
            </p>
            <div className="flex gap-2">
              <button className="flex-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                YES · 67¢
              </button>
              <button className="flex-1 rounded-lg bg-rose-500/20 border border-rose-500/40 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/30 transition-colors">
                NO · 33¢
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particles */}
      {stage === 1 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, x: "50%", y: "50%", scale: 1 }}
              animate={{
                opacity: 0,
                x: `${50 + (Math.random() - 0.5) * 100}%`,
                y: `${50 + (Math.random() - 0.5) * 100}%`,
                scale: 0,
              }}
              transition={{ duration: 1.2, delay: i * 0.1 }}
              className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Generator Demo Section ────────────────────────────────────────────────────
function GeneratorDemo() {
  const [topic, setTopic] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [generatedMarket, setGeneratedMarket] = useState<GeneratedMarket | null>(null);
  const [approved, setApproved] = useState(false);
  const [placeholder, setPlaceholder] = useState(SAMPLE_TOPICS[0]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % SAMPLE_TOPICS.length;
      setPlaceholder(SAMPLE_TOPICS[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const generate = async () => {
    if (!topic.trim() && !placeholder) return;
    setState("loading");
    setApproved(false);

    await new Promise((r) => setTimeout(r, 2400));

    const q = topic.trim() || placeholder;
    setGeneratedMarket({
      question: q.endsWith("?") ? q : q + "?",
      description: `Claude analyzed 14,832 recent X posts and 3 Israeli news sources. High community interest detected. Suggested resolution: credible news report or official announcement.`,
      yesPrice: Math.floor(Math.random() * 40) + 35,
      noPrice: 0,
      category: "AI-Generated",
      resolveDate: "Jul 1, 2026",
    });
    setState("done");
  };

  const market = generatedMarket
    ? { ...generatedMarket, noPrice: 100 - generatedMarket.yesPrice }
    : null;

  return (
    <section className="relative py-32 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <GlowOrb className="w-[600px] h-[600px] bg-violet-600 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-1.5 text-sm font-semibold text-violet-300">
            <Sparkles className="w-4 h-4" />
            Live Demo
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
            Watch Claude Forge a<br />
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Market Right Now
            </span>
          </h2>
          <p className="text-white/45 text-base">
            Type any topic or trend. Claude will generate a ready-to-publish prediction market instantly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 backdrop-blur-xl"
        >
          {/* Input */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && state === "idle" && generate()}
                placeholder={placeholder}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
            </div>
            <button
              onClick={generate}
              disabled={state === "loading"}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all whitespace-nowrap",
                state === "loading"
                  ? "bg-white/5 text-white/30 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              {state === "loading" ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.div>
                  Forging...
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>

          {/* States */}
          <AnimatePresence mode="wait">
            {state === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0"
                  >
                    <Brain className="w-4 h-4 text-violet-400" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold text-white">Claude is scanning X...</p>
                    <p className="text-xs text-white/40">Analyzing trends, writing market conditions</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {["Fetching 10k+ recent X posts", "Analyzing Israeli news sources", "Drafting market question", "Setting resolution criteria"].map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.5 }}
                      className="flex items-center gap-2 text-xs text-white/50"
                    >
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                        className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0"
                      />
                      {step}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {state === "done" && market && !approved && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
                className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-slate-950/40 p-5 shadow-lg shadow-cyan-500/10"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/50 bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    <Sparkles className="w-2.5 h-2.5" /> AI-Generated
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-white/40">
                    <Clock className="w-2.5 h-2.5" /> Resolves {market.resolveDate}
                  </span>
                  <span className="ml-auto text-[10px] text-emerald-400 font-mono">
                    Ready to publish
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-2 leading-snug">
                  {market.question}
                </h3>
                <p className="text-xs text-white/40 leading-relaxed mb-4">
                  {market.description}
                </p>

                <MarketProbabilityBar yes={market.yesPrice} no={market.noPrice} />

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setApproved(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500 transition-all hover:-translate-y-0.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Publish
                  </button>
                  <button
                    onClick={() => setState("idle")}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/50 hover:text-white hover:border-white/20 transition-all"
                  >
                    Retry
                  </button>
                </div>
              </motion.div>
            )}

            {approved && (
              <motion.div
                key="approved"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1, bounce: 0.6 }}
                  className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 mb-4"
                >
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </motion.div>
                <h3 className="text-lg font-bold text-white mb-1">Market is Live!</h3>
                <p className="text-sm text-white/50">
                  Your market is now open for trading on Polygon.
                </p>
                <button
                  onClick={() => { setState("idle"); setApproved(false); setTopic(""); }}
                  className="mt-4 text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                >
                  Generate another →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TrendForgePage() {
  const [lang, setLang] = useState<"en" | "he">("en");
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 80], ["rgba(0,0,0,0)", "rgba(3,3,10,0.94)"]);

  return (
    <div
      className="min-h-screen bg-[#03030a] text-white overflow-x-hidden"
    >
      {/* Global visual layers */}
      <NoiseBg />

      {/* ── Navbar ── */}
      <motion.nav
        style={{ backgroundColor: navBg }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] backdrop-blur-md"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
              <Flame className="w-4 h-4 text-white" />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              Trend<span className="text-cyan-400">Forge</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {([
              { label: "Markets", href: "/markets" },
              { label: "Create", href: "/ai-generator" },
              { label: "Portfolio", href: "/portfolio" },
              { label: "Trends", href: "/dashboard" },
            ] as const).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-white/45 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all duration-200"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(l => l === "en" ? "he" : "en")}
              className="hidden md:flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/55 hover:text-white hover:border-white/20 transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "en" ? "עברית" : "English"}
            </button>

            <Link href="/dashboard" className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/60 hover:shadow-md hover:shadow-cyan-500/20 transition-all">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Connect Wallet</span>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-4 overflow-hidden">
        <GridLines />
        <GlowOrb className="w-[900px] h-[900px] bg-cyan-600 -top-40 left-1/2 -translate-x-1/2" />
        <GlowOrb className="w-[500px] h-[500px] bg-blue-800 bottom-0 right-0" />
        <GlowOrb className="w-[400px] h-[400px] bg-violet-700 bottom-20 left-0" />

        <div className="relative z-10 mx-auto max-w-7xl w-full flex flex-col lg:flex-row items-center gap-16 py-24">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/[0.08] px-4 py-2 text-sm font-semibold text-cyan-300"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              AI Market Generator · Powered by Claude
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.04] tracking-tight mb-6"
            >
              <span className="text-white">Markets appear</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                before the
              </span>
              <br />
              <span className="text-white">news does.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-white/45 max-w-lg mb-8 leading-relaxed mx-auto lg:mx-0"
            >
              Claude AI turns X trends into live prediction markets instantly.
              Trade the future in seconds.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3 justify-center lg:justify-start"
            >
              <Link
                href="/ai-generator"
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-base font-bold text-white shadow-xl shadow-cyan-500/30 hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/50 hover:-translate-y-0.5 transition-all duration-200"
              >
                Try AI Market Generator
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/markets"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-6 py-3.5 text-base font-bold text-white/75 hover:bg-white/10 hover:border-white/25 hover:-translate-y-0.5 transition-all duration-200"
              >
                Browse Live Markets
              </Link>
            </motion.div>

            {/* Stats — larger, with dividers */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 flex flex-wrap gap-0 justify-center lg:justify-start"
            >
              {[
                { value: "$2.4M", label: "Volume" },
                { value: "18K+", label: "Traders" },
                { value: "340+", label: "Markets" },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center">
                  {i > 0 && (
                    <div className="w-px h-10 bg-white/10 mx-6" />
                  )}
                  <div className="text-center lg:text-left">
                    <p className="text-3xl font-black text-white font-mono tracking-tight tabular-nums leading-none mb-1">{s.value}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">{s.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Hero Demo Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex-shrink-0 w-full max-w-sm"
          >
            <HeroDemoAnimation />
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <ChevronDown className="w-5 h-5 text-white/20" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Trust Bar — scrolling ticker ── */}
      <div className="relative border-y border-white/[0.06] bg-white/[0.012] py-3.5 overflow-hidden">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#03030a] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#03030a] to-transparent z-10 pointer-events-none" />
        {/* Scrolling track */}
        <div className="animate-ticker flex whitespace-nowrap">
          {[...TRUST_ITEMS, ...TRUST_ITEMS].map(({ icon: Icon, text }, i) => (
            <div key={i} className="inline-flex items-center gap-2 px-8 text-sm font-semibold text-white/40">
              <span className="w-1 h-1 rounded-full bg-cyan-500/50 shrink-0" />
              <Icon className="w-4 h-4 text-cyan-500/55 shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* ── Generator Demo ── */}
      <div id="generator">
        <GeneratorDemo />
      </div>

      {/* ── How It Works ── */}
      <section className="relative py-24 px-4 overflow-hidden">
        <GlowOrb className="w-[500px] h-[500px] bg-indigo-700 right-0 top-1/2 -translate-y-1/2" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-semibold text-white/45">
              <Zap className="w-4 h-4 text-yellow-400" />
              Simple as 1-2-3-4
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              From Trend to{" "}
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Trade
              </span>{" "}
              in Seconds
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <HowItWorksStep key={step.step} step={step} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Trending Markets ── */}
      <section id="markets" className="relative py-24 px-4">
        <GlowOrb className="w-[600px] h-[600px] bg-cyan-900 left-0 top-1/2 -translate-y-1/2" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
          >
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-semibold text-orange-300">
                <TrendingUp className="w-4 h-4" />
                Trending Now
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                Live AI-Forged Markets
              </h2>
            </div>
            <Link href="/markets" className="flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors shrink-0">
              View all markets <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {TRENDING_MARKETS.map((market, i) => (
              <TrendingMarketCard key={market.id} market={market} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative py-28 px-4 overflow-hidden">
        <GlowOrb className="w-[600px] h-[600px] bg-violet-900 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-semibold text-white/45">
              <Layers className="w-4 h-4 text-violet-400" />
              Platform Features
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                trade the future
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-40 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <GridLines />
          <GlowOrb className="w-[800px] h-[800px] bg-cyan-700 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* Card wrapper */}
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.025] p-12 backdrop-blur-xl shadow-2xl shadow-black/40">
              {/* Top edge highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent rounded-t-3xl" />
              {/* Inner glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-cyan-500/[0.04] to-transparent pointer-events-none" />

              <div className="relative">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
                  <Sparkles className="w-4 h-4" />
                  Start trading in 60 seconds
                </div>

                <h2 className="text-5xl md:text-6xl font-black leading-tight tracking-tight mb-6 text-white">
                  Ready to trade markets
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                    that don't exist yet?
                  </span>
                </h2>

                <p className="text-lg text-white/40 mb-10 max-w-xl mx-auto leading-relaxed">
                  Connect your wallet. The AI does the rest. Trade on markets born from
                  the freshest trends — before anyone else even knows they're tradeable.
                </p>

                <div className="flex flex-wrap gap-4 justify-center">
                  <Link href="/dashboard" className="group flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-lg font-black text-white shadow-2xl shadow-cyan-500/30 hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/50 hover:-translate-y-1 transition-all duration-300">
                    <Wallet className="w-5 h-5" />
                    Connect Wallet & Start
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                <p className="mt-6 text-xs text-white/25 font-mono">
                  No KYC required for trades under $500 · Polygon network · USDC
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] bg-white/[0.008] py-12 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                  <Flame className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-base font-black tracking-tight">
                  Trend<span className="text-cyan-400">Forge</span>
                </span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed max-w-[200px]">
                AI-powered prediction markets born from real-time X trends. Trade the future.
              </p>
            </div>

            {[
              {
                title: "Platform",
                links: [
                  { label: "Markets", href: "/markets" },
                  { label: "Create Market", href: "/ai-generator" },
                  { label: "Portfolio", href: "/portfolio" },
                  { label: "Dashboard", href: "/dashboard" },
                ],
              },
              {
                title: "Resources",
                links: [
                  { label: "Docs", href: "#" },
                  { label: "API", href: "#" },
                  { label: "Blog", href: "#" },
                  { label: "Status", href: "#" },
                ],
              },
              {
                title: "Legal",
                links: [
                  { label: "Terms", href: "#" },
                  { label: "Privacy", href: "#" },
                  { label: "Risk Disclosure", href: "#" },
                  { label: "Contact", href: "#" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25 mb-4">
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-white/40 hover:text-white/80 transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.05] pt-6">
            <p className="text-xs text-white/25 font-mono">
              © 2026 TrendForge. Built on Polygon. Powered by Claude AI.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-white/20">Trading involves risk. Not financial advice.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
