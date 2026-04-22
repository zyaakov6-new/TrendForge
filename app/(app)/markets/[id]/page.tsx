"use client";

/**
 * TrendForge - Market Detail / Trading Page
 * Route: /markets/[id]
 *
 * Kuest integration points:
 *  TODO: useReadContract  -> Kuest MarketReader.getMarket(questionId)
 *  TODO: useReadContract  -> Kuest AMM.getOutcomePrices(questionId)
 *  TODO: useWriteContract -> Kuest Router.buy(marketId, outcome, amountUSDC, minShares)
 *  TODO: useWriteContract -> Kuest Router.sell(marketId, outcome, shares, minAmount)
 *  TODO: useWatchContractEvent -> Kuest AMM.PriceUpdate for real-time prices
 *  TODO: Real price chart via Kuest WebSocket price feed
 *  TODO: Replace mock comments with on-chain or off-chain discussion API
 *
 *  Before first trade, check USDC allowance and call
 *  USDC.approve(KUEST_ROUTER, amountUSDC) if needed.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowLeft, Sparkles, TrendingUp, TrendingDown, Clock, DollarSign,
  Users, BarChart3, ChevronDown, ChevronUp, Brain, Twitter, CheckCircle,
  AlertCircle, Zap, MessageSquare, Share2, ExternalLink, RefreshCw,
  Activity, Info, Shield, Hash, ArrowUpRight, ArrowDownRight, Copy,
  Wallet, X, Fuel,
} from "lucide-react";
import { MARKETS, POSITIONS, fmtVol, type Market } from "@/lib/mock-data";
import { useWallet } from "@/hooks/useWallet";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { useTrade } from "@/hooks/useTrade";
import { toUSDCUnits } from "@/lib/contracts";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";

// ─── Extended mock data ───────────────────────────────────────────────────────

interface ClaudeAnalysis {
  summary: string;
  xSentimentBullish: number; // 0-100
  xPostsAnalyzed: number;
  keyEvidence: string[];
  rationale: string;
  resolutionCriteria: string;
  confidenceScore: number; // 0-100
  createdAgo: string;
  sourceSites: string[];
}

interface OrderBookEntry { price: number; size: number; total: number }
interface Trade { time: string; side: "YES" | "NO"; price: number; size: number; wallet: string }
interface Comment { id: string; user: string; avatar: string; text: string; time: string; likes: number }

const CLAUDE_ANALYSIS: Record<string, ClaudeAnalysis> = {
  default: {
    summary: "Claude detected a spike in X activity (14,832 posts) around this topic following a credible news report. Sentiment skewed bullish with strong conviction from verified accounts in the relevant domain.",
    xSentimentBullish: 68,
    xPostsAnalyzed: 14832,
    keyEvidence: [
      "Senior coalition officials confirmed talks in Haaretz interview (Apr 18)",
      "Likud party internal memo leaked — elections discussed for Q3",
      "Opposition leaders preemptively calling for campaign prep",
      "Polling data shows 62% of voters expect early elections",
    ],
    rationale: "Historical base rate for Israeli snap election calls when coalition stability falls below current levels is ~71%. Combined with the X momentum signal, this calibrates to a 67% YES probability.",
    resolutionCriteria: "Resolves YES if Netanyahu officially announces snap elections before August 1, 2026 via press conference, official statement, or Knesset vote. Primary sources: Haaretz, Times of Israel, Reuters. Resolves NO if no announcement is made before the deadline. Resolves N/A if Netanyahu is no longer PM before resolution.",
    confidenceScore: 84,
    createdAgo: "6 hours ago",
    sourceSites: ["haaretz.com", "timesofisrael.com", "reuters.com", "ynet.co.il"],
  },
};

const MARKET_DETAIL_OVERRIDES: Record<string, Partial<ClaudeAnalysis>> = {
  "4": {
    summary: "Claude detected intense debate across AI/tech X communities about GPT-5 development timeline vs Anthropic's release cadence. Multiple insider leaks drove the spike.",
    xSentimentBullish: 42,
    keyEvidence: [
      "OpenAI blog post hints at 'next major release' coming H1 2026",
      "Anthropic raised $4B in Feb — typically precedes major model drop",
      "Sam Altman tweet: 'something big is coming' (Mar 12, 2026)",
      "Multiple ex-OpenAI employees posting about GPT-5 capabilities",
    ],
    rationale: "Market prices reflect OpenAI's historical pattern of announcing after Anthropic, but the recent funding round and insider chatter shift the balance toward NO.",
    confidenceScore: 71,
    createdAgo: "2 days ago",
  },
  "7": {
    summary: "Bitcoin's $200K target is highly debated. On-chain data shows whale accumulation, but macro headwinds from rate policy create resistance.",
    xSentimentBullish: 55,
    keyEvidence: [
      "MicroStrategy added 42K BTC in April — largest single purchase of 2026",
      "CME open interest at all-time high, signaling institutional bets",
      "Fed pivot delayed — historically bearish for risk assets short-term",
      "ETF inflows positive for 14 consecutive weeks",
    ],
    rationale: "Path-dependent: requires sustained ETF inflows + macro risk-on environment. Base case models suggest 31% probability by December 2026.",
    confidenceScore: 62,
    createdAgo: "1 day ago",
  },
};

function getClaudeAnalysis(marketId: string): ClaudeAnalysis {
  const base = CLAUDE_ANALYSIS.default;
  const override = MARKET_DETAIL_OVERRIDES[marketId] ?? {};
  return { ...base, ...override };
}

// ─── Price chart data ─────────────────────────────────────────────────────────

type TimeRange = "1H" | "6H" | "24H" | "7D" | "30D";

function generatePriceHistory(basePrice: number, points: number, volatility: number) {
  const data: number[] = [];
  let price = Math.max(5, Math.min(90, basePrice - Math.random() * 12 - 5));
  for (let i = 0; i < points; i++) {
    const drift = (basePrice - price) * 0.04;
    price = Math.max(3, Math.min(97, price + drift + (Math.random() - 0.49) * volatility));
    data.push(parseFloat(price.toFixed(1)));
  }
  return data;
}

function pricesToSvgPath(prices: number[], w: number, h: number, padding = 12) {
  if (prices.length < 2) return "";
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const usableH = h - padding * 2;
  const usableW = w;
  return prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * usableW;
      const y = padding + usableH - ((p - minP) / range) * usableH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function pricesToFillPath(prices: number[], w: number, h: number, padding = 12) {
  const line = pricesToSvgPath(prices, w, h, padding);
  if (!line) return "";
  const lastX = w.toFixed(1);
  return `${line} L${lastX},${h} L0,${h} Z`;
}

// ─── Order book mock ──────────────────────────────────────────────────────────

function generateOrderBook(yesPrice: number) {
  const asks: OrderBookEntry[] = [];
  const bids: OrderBookEntry[] = [];
  let askTotal = 0;
  let bidTotal = 0;

  for (let i = 0; i < 8; i++) {
    const size = parseFloat((Math.random() * 800 + 100).toFixed(0));
    askTotal += size;
    asks.push({ price: parseFloat((yesPrice / 100 + i * 0.01 + 0.01).toFixed(2)), size, total: askTotal });
  }
  for (let i = 0; i < 8; i++) {
    const size = parseFloat((Math.random() * 800 + 100).toFixed(0));
    bidTotal += size;
    bids.push({ price: parseFloat((yesPrice / 100 - i * 0.01 - 0.01).toFixed(2)), size, total: bidTotal });
  }
  return { asks, bids, maxTotal: Math.max(askTotal, bidTotal) };
}

// ─── Recent trades mock ───────────────────────────────────────────────────────

const MOCK_WALLETS = ["0x3d4F…8Ab2", "0xA12c…F991", "0x99eB…2D34", "0x7f01…CC4A", "0x5512…B88E"];

function generateRecentTrades(yesPrice: number): Trade[] {
  const trades: Trade[] = [];
  let minutesAgo = 0;
  for (let i = 0; i < 14; i++) {
    minutesAgo += Math.floor(Math.random() * 18);
    const side = Math.random() > 0.45 ? "YES" : "NO";
    const price = side === "YES"
      ? parseFloat((yesPrice / 100 + (Math.random() - 0.5) * 0.04).toFixed(2))
      : parseFloat(((100 - yesPrice) / 100 + (Math.random() - 0.5) * 0.04).toFixed(2));
    const size = parseFloat((Math.random() * 400 + 20).toFixed(0));
    const h = Math.floor(minutesAgo / 60);
    const m = minutesAgo % 60;
    trades.push({
      time: h > 0 ? `${h}h ${m}m ago` : `${m}m ago`,
      side,
      price,
      size,
      wallet: MOCK_WALLETS[Math.floor(Math.random() * MOCK_WALLETS.length)],
    });
  }
  return trades;
}

// ─── Comments mock ────────────────────────────────────────────────────────────

const MOCK_COMMENTS: Comment[] = [
  { id: "c1", user: "defi_trader_il", avatar: "DT", text: "The coalition situation is clearly deteriorating. Netanyahu needs elections to consolidate power before the budget vote. YES at 67¢ is underpriced.", time: "2h ago", likes: 24 },
  { id: "c2", user: "polymarket_whale", avatar: "PW", text: "I've been watching Israeli politics for 20 years — they NEVER call snap elections when they say they will. NO is the value play here.", time: "4h ago", likes: 18 },
  { id: "c3", user: "ai_market_watcher", avatar: "AM", text: "Love that this was AI-generated — the Claude analysis actually surfaced the Haaretz report before it hit mainstream news. This is the edge.", time: "5h ago", likes: 31 },
  { id: "c4", user: "tzivoni_trades", avatar: "TZ", text: "ציינתי שהשוק הזה נוצר ב-Claude - נראה שכלי ה-AI מבין את הפוליטיקה הישראלית טוב מרבים 🙂", time: "7h ago", likes: 12 },
  { id: "c5", user: "bloc_chain_guy", avatar: "BG", text: "Resolution criteria look airtight. Props to whoever wrote these rules — no edge cases to exploit.", time: "9h ago", likes: 8 },
];

// ─── Colour helpers ───────────────────────────────────────────────────────────

const catPillColors: Record<string, string> = {
  Politics: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Geopolitics: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  Crypto: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Tech: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Finance: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  Sports: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Israel: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

// ─── Price Chart ──────────────────────────────────────────────────────────────

const RANGE_POINTS: Record<TimeRange, number> = { "1H": 30, "6H": 48, "24H": 60, "7D": 84, "30D": 90 };
const RANGE_VOL: Record<TimeRange, number> = { "1H": 1.2, "6H": 2.5, "24H": 4, "7D": 6, "30D": 8 };

function PriceChart({ yesPrice, marketId }: { yesPrice: number; marketId: string }) {
  const [range, setRange] = useState<TimeRange>("24H");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 600; const H = 160;

  const priceData = useMemo(
    () => generatePriceHistory(yesPrice, RANGE_POINTS[range], RANGE_VOL[range]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range, marketId]
  );

  const linePath = pricesToSvgPath(priceData, W, H);
  const fillPath = pricesToFillPath(priceData, W, H);
  const lastPrice = priceData[priceData.length - 1];
  const firstPrice = priceData[0];
  const priceUp = lastPrice >= firstPrice;

  const hoverPrice = hoverIdx !== null ? priceData[hoverIdx] : lastPrice;
  const hoverX = hoverIdx !== null ? (hoverIdx / (priceData.length - 1)) * W : W;

  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.025] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black font-mono text-white">
            {hoverPrice.toFixed(1)}¢
          </span>
          <span className={`flex items-center gap-0.5 text-sm font-bold font-mono ${priceUp ? "text-emerald-400" : "text-rose-400"}`}>
            {priceUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(lastPrice - firstPrice).toFixed(1)} pts
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/4 p-1">
          {(["1H","6H","24H","7D","30D"] as TimeRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                range === r
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  : "text-white/35 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative overflow-hidden rounded-xl" style={{ height: H }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            setHoverIdx(Math.round(relX * (priceData.length - 1)));
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={`chartFill-${marketId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={priceUp ? "#10b981" : "#f43f5e"} stopOpacity="0.25" />
              <stop offset="100%" stopColor={priceUp ? "#10b981" : "#f43f5e"} stopOpacity="0.01" />
            </linearGradient>
            {/* 50¢ reference line */}
          </defs>

          {/* 50¢ gridline */}
          <line
            x1="0" y1={H / 2} x2={W} y2={H / 2}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4,4"
          />

          {/* Fill */}
          <motion.path
            d={fillPath}
            fill={`url(#chartFill-${marketId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />

          {/* Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={priceUp ? "#10b981" : "#f43f5e"}
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {/* Hover crosshair */}
          {hoverIdx !== null && (
            <>
              <line
                x1={hoverX} y1="0" x2={hoverX} y2={H}
                stroke="rgba(255,255,255,0.15)" strokeWidth="1"
              />
              <circle
                cx={hoverX}
                cy={(() => {
                  const minP = Math.min(...priceData);
                  const maxP = Math.max(...priceData);
                  const r2 = maxP - minP || 1;
                  return 12 + (H - 24) - ((priceData[hoverIdx] - minP) / r2) * (H - 24);
                })()}
                r="4"
                fill={priceUp ? "#10b981" : "#f43f5e"}
                stroke="#03030a"
                strokeWidth="2"
              />
            </>
          )}
        </svg>

        {/* Hover tooltip */}
        {hoverIdx !== null && (
          <div
            className="absolute top-2 pointer-events-none bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono shadow-xl"
            style={{ left: `${Math.min(90, (hoverIdx / priceData.length) * 100)}%` }}
          >
            <span className="text-white font-bold">{hoverPrice.toFixed(1)}¢</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Order Book tab ───────────────────────────────────────────────────────────

function OrderBookTab({ yesPrice }: { yesPrice: number }) {
  const { asks, bids, maxTotal } = useMemo(() => generateOrderBook(yesPrice), [yesPrice]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Asks (NO) */}
      <div>
        <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2 px-1">
          <span>Price</span><span className="text-right">Size</span><span className="text-right">Total</span>
        </div>
        <div className="space-y-0.5">
          {asks.slice(0,7).map((a, i) => (
            <div key={i} className="relative grid grid-cols-3 text-xs font-mono px-1 py-1 rounded overflow-hidden">
              <div className="absolute inset-0 right-0 bg-rose-500/8" style={{ width: `${(a.total / maxTotal) * 100}%`, marginLeft: "auto" }} />
              <span className="relative text-rose-400">{a.price.toFixed(2)}</span>
              <span className="relative text-right text-white/60">{a.size.toFixed(0)}</span>
              <span className="relative text-right text-white/35">{a.total.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bids (YES) */}
      <div>
        <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2 px-1">
          <span>Price</span><span className="text-right">Size</span><span className="text-right">Total</span>
        </div>
        <div className="space-y-0.5">
          {bids.slice(0,7).map((b, i) => (
            <div key={i} className="relative grid grid-cols-3 text-xs font-mono px-1 py-1 rounded overflow-hidden">
              <div className="absolute inset-0 bg-emerald-500/8" style={{ width: `${(b.total / maxTotal) * 100}%` }} />
              <span className="relative text-emerald-400">{b.price.toFixed(2)}</span>
              <span className="relative text-right text-white/60">{b.size.toFixed(0)}</span>
              <span className="relative text-right text-white/35">{b.total.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Spread */}
      <div className="col-span-2 text-center py-2 text-xs text-white/30 font-mono border-y border-white/5">
        Spread: {(asks[0].price - bids[0].price).toFixed(3)} USDC
      </div>
    </div>
  );
}

// ─── Trades tab ───────────────────────────────────────────────────────────────

function TradesTab({ yesPrice }: { yesPrice: number }) {
  const trades = useMemo(() => generateRecentTrades(yesPrice), [yesPrice]);
  return (
    <div>
      <div className="grid grid-cols-4 text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2 pb-2 border-b border-white/5">
        <span>Time</span><span>Side</span><span className="text-right">Price</span><span className="text-right">Size (USDC)</span>
      </div>
      <div className="space-y-0">
        {trades.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="grid grid-cols-4 text-xs font-mono py-1.5 border-b border-white/4 hover:bg-white/2 transition-colors"
          >
            <span className="text-white/30">{t.time}</span>
            <span className={t.side === "YES" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{t.side}</span>
            <span className="text-right text-white/70">{t.price.toFixed(2)}</span>
            <span className="text-right text-white/50">{t.size}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Comments tab ─────────────────────────────────────────────────────────────

function CommentsTab() {
  const [newComment, setNewComment] = useState("");
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-black text-white">ZY</div>
        <div className="flex-1 relative">
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Share your analysis..."
            className="w-full rounded-xl border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-500/35 pr-16"
          />
          <button
            onClick={() => setNewComment("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-cyan-500/10 border border-cyan-500/25 px-3 py-1 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all"
          >
            Post
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {MOCK_COMMENTS.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex-shrink-0 flex items-center justify-center text-xs font-black text-white/60">{c.avatar}</div>
            <div className="flex-1 rounded-xl border border-white/6 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white/70">@{c.user}</span>
                <span className="text-[10px] text-white/25 font-mono">{c.time}</span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{c.text}</p>
              <button className="mt-2 flex items-center gap-1 text-[11px] text-white/25 hover:text-white/50 transition-colors">
                ♥ {c.likes}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Claude AI Insights panel ─────────────────────────────────────────────────

function ClaudeInsightsPanel({ analysis, defaultOpen = false }: { analysis: ClaudeAnalysis; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-cyan-500/20 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 md:p-5 bg-gradient-to-r from-cyan-500/8 to-transparent hover:from-cyan-500/12 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
            <Brain className="w-4.5 h-4.5 text-cyan-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              Claude AI Insights
              <span className="rounded-full bg-cyan-500/15 border border-cyan-500/25 px-2 py-0.5 text-[10px] font-bold text-cyan-400">
                {analysis.confidenceScore}% confidence
              </span>
            </p>
            <p className="text-xs text-white/40">Generated {analysis.createdAgo} · {analysis.xPostsAnalyzed.toLocaleString()} X posts analyzed</p>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-white/35" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 md:p-5 space-y-5 border-t border-cyan-500/10">
              {/* Summary */}
              <p className="text-sm text-white/65 leading-relaxed">{analysis.summary}</p>

              {/* X Sentiment */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/35 flex items-center gap-1.5">
                    <Twitter className="w-3.5 h-3.5" /> X Sentiment
                  </span>
                  <span className={`text-sm font-black font-mono ${analysis.xSentimentBullish >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                    {analysis.xSentimentBullish}% bullish
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-white/6 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${analysis.xSentimentBullish}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className={`h-full rounded-full ${analysis.xSentimentBullish >= 50
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : "bg-gradient-to-r from-rose-500 to-pink-500"}`}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-white/25 font-mono">
                  <span>Bearish</span><span>Bullish</span>
                </div>
              </div>

              {/* Key evidence */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/35 mb-2.5">Key Evidence</p>
                <ul className="space-y-2">
                  {analysis.keyEvidence.map((e, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-2 text-sm text-white/60"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      {e}
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Rationale */}
              <div className="rounded-xl bg-white/[0.025] border border-white/6 p-3.5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-1.5">Probability Rationale</p>
                <p className="text-xs text-white/55 leading-relaxed">{analysis.rationale}</p>
              </div>

              {/* Resolution criteria */}
              <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/15 p-3.5">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-400/70 mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Resolution Criteria
                </p>
                <p className="text-xs text-white/55 leading-relaxed">{analysis.resolutionCriteria}</p>
              </div>

              {/* Sources */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-white/30 font-medium">Sources:</span>
                {analysis.sourceSites.map(s => (
                  <span key={s} className="text-xs text-cyan-400/60 hover:text-cyan-400 cursor-pointer transition-colors">{s}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline connect button shown inside the trading panel when not connected
function ConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <motion.button
          onClick={openConnectModal}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-4 rounded-xl border border-cyan-500/35 bg-cyan-500/8 text-base font-black text-cyan-400 hover:border-cyan-500/60 hover:bg-cyan-500/12 transition-all"
        >
          Connect Wallet to Trade
        </motion.button>
      )}
    </ConnectButton.Custom>
  );
}

// Trade confirmation dialog
// Rendered via createPortal directly into document.body so it escapes
// any parent overflow:auto / transform context that would break fixed positioning.
function TradeConfirmDialog({
  open,
  onClose,
  onConfirm,
  side,
  amount,
  shares,
  potentialPayout,
  price,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  side: "YES" | "NO";
  amount: number;
  shares: number;
  potentialPayout: number;
  price: number;
  isLoading: boolean;
}) {
  // Track client mount — document.body doesn't exist during SSR
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        style={{ zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Centering wrapper — fills viewport, flexbox-centers the card */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 9999 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
            <div className="rounded-2xl border border-white/10 bg-[#08080f] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
                <h3
                  className="text-base font-black text-white"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  Confirm Trade
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Trade summary */}
              <div className="p-5 space-y-3">
                {/* Side badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Direction</span>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-black border ${
                      side === "YES"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}
                  >
                    BUY {side}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">You pay</span>
                  <span className="text-sm font-black font-mono text-white">
                    ${amount.toFixed(2)} USDC
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Price per share</span>
                  <span className="text-sm font-mono text-white/70">
                    {price.toFixed(3)} USDC
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Shares received</span>
                  <span className="text-sm font-mono text-white/70">
                    {shares.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/6">
                  <span className="text-xs text-white/40">Max payout (if wins)</span>
                  <span className="text-base font-black font-mono text-emerald-400">
                    ${potentialPayout.toFixed(2)}
                  </span>
                </div>

                {/* Gas estimate - placeholder */}
                <div className="flex items-center justify-between rounded-lg bg-white/[0.025] border border-white/6 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-xs text-white/30">
                    <Fuel className="w-3 h-3" />
                    Est. gas (Polygon)
                  </span>
                  <span className="text-xs font-mono text-white/30">
                    ~$0.01 MATIC
                    {/* TODO: useEstimateGas(Kuest Router.buy) for real gas estimate */}
                  </span>
                </div>

                <p className="text-[10px] text-white/20 leading-relaxed text-center pt-1">
                  {/*
                   * TODO: Kuest integration -
                   * Call USDC.approve(KUEST_ROUTER, amount) first if allowance is insufficient,
                   * then Kuest.Router.buy(marketId, outcomeIndex, amountUSDC, minShares).
                   * See: py-clob-client equivalent or Kuest CLOB SDK docs.
                   */}
                  Transaction executes on Polygon. Irreversible once confirmed.
                </p>
              </div>

              {/* Actions */}
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white/50 hover:text-white transition-all disabled:opacity-40"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={onConfirm}
                  disabled={isLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 ${
                    side === "YES"
                      ? "bg-emerald-500 hover:bg-emerald-400"
                      : "bg-rose-500 hover:bg-rose-400"
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                        className="inline-block"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </motion.span>
                      Confirming...
                    </span>
                  ) : (
                    `Confirm ${side}`
                  )}
                </motion.button>
              </div>
            </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}

// Trading Panel
function TradingPanel({ market, userPosition }: { market: Market; userPosition: typeof POSITIONS[0] | null }) {
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState(50);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Real wallet state
  const { address, isConnected } = useWallet();
  const { formatted: displayBalance } = useUSDCBalance(address);

  // Real CLOB trade hook
  const requiredUsdc = toUSDCUnits(amount);
  const trade = useTrade(address, requiredUsdc);

  const price = side === "YES" ? market.yesPrice / 100 : (100 - market.yesPrice) / 100;
  const shares = amount / price;
  const potentialPayout = shares * 1;
  const potentialProfit = potentialPayout - amount;
  const potentialROI = (potentialProfit / amount) * 100;

  const QUICK_AMOUNTS = [10, 25, 50, 100, 250];

  // Map useTrade step to legacy UI states
  const tradeState =
    trade.step === "filled"  ? "success"
    : trade.step === "error" ? "error"
    : trade.step !== "idle"  ? "loading"
    : "idle";

  const txHash = "0x3f4a9c2e8b1d7f56a3c4e901b2d8f374e6a5c1b9d2e7f8a0c3b5d6e1f2a4b7c";

  // Step 1: open confirm dialog
  const handleTrade = () => {
    if (!isConnected) return;
    setConfirmOpen(true);
  };

  // Step 2: user confirmed - execute real CLOB order
  const handleConfirm = async () => {
    setConfirmOpen(false);

    // market.id is the conditionId on real Kuest markets
    // clobTokenIds[0] = YES token, clobTokenIds[1] = NO token
    // TODO: pass real token IDs from GammaMarket.clobTokenIds when using live data
    const tokenId = side === "YES" ? market.id + "_yes" : market.id + "_no";

    await trade.placeTrade({
      conditionId:   market.id,
      tokenId,
      amountUSDC:    amount,
      pricePerShare: price,
      side,
    });

    if (trade.step === "filled") {
      toast.success(`Bought ${trade.sharesReceived.toFixed(1)} ${side} shares`);
    } else if (trade.step === "error") {
      toast.error(trade.error ?? "Trade failed");
    }
  };

  const handleReset = () => {
    setAmount(50);
    trade.reset();
  };

  return (
    <>
    {/* Confirmation dialog - rendered at root so it overlays everything */}
    <TradeConfirmDialog
      open={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      onConfirm={handleConfirm}
      side={side}
      amount={amount}
      shares={shares}
      potentialPayout={potentialPayout}
      price={price}
      isLoading={tradeState === "loading"}
    />

    <div className="rounded-2xl border border-white/8 bg-white/[0.025] overflow-hidden sticky top-20">
      {/* Success state */}
      <AnimatePresence>
        {tradeState === "success" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-[#03030a]/95 backdrop-blur flex flex-col items-center justify-center p-6 rounded-2xl text-center"
          >
            {/* Confetti */}
            {[...Array(14)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, x: "50%", y: "60%", scale: 1 }}
                animate={{ opacity: 0, x: `${50 + (Math.random() - 0.5) * 160}%`, y: `${-30 + Math.random() * -80}%`, scale: 0, rotate: Math.random() * 360 }}
                transition={{ duration: 1.3 + Math.random() * 0.5, delay: i * 0.05 }}
                className={`absolute w-2 h-2 rounded-sm ${["bg-cyan-400","bg-emerald-400","bg-violet-400","bg-yellow-400","bg-pink-400","bg-blue-400"][i%6]}`}
              />
            ))}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.6, delay: 0.1 }}
              className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4"
            >
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </motion.div>
            <h3 className="text-lg font-black text-white mb-1">Trade Executed!</h3>
            <p className="text-sm text-white/50 mb-1">
              Bought <span className="text-white font-bold">{(trade.sharesReceived || shares).toFixed(1)} {side}</span> shares for <span className="text-white font-bold">${amount} USDC</span>
            </p>
            <p className="text-xs text-white/25 font-mono mb-1">
              {trade.orderStatus === "matched" ? "Matched instantly on CLOB" : "Order placed - Polygon confirmation pending"}
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(txHash).catch(() => {})}
              className="flex items-center gap-1 text-xs text-cyan-400/70 hover:text-cyan-400 font-mono mb-5 transition-colors"
            >
              <Copy className="w-3 h-3" />
              {txHash.slice(0, 20)}…
            </button>
            <button
              onClick={handleReset}
              className="rounded-xl border border-white/10 bg-white/4 px-5 py-2 text-sm font-semibold text-white/50 hover:text-white transition-all"
            >
              Trade again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      <AnimatePresence>
        {tradeState === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-[#03030a]/80 backdrop-blur flex flex-col items-center justify-center rounded-2xl gap-3"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <RefreshCw className="w-8 h-8 text-cyan-400" />
            </motion.div>
            <p className="text-sm font-semibold text-white">{trade.stepLabel}</p>
            <p className="text-xs text-white/35">
              {trade.step === "signing" ? "Check your wallet for the signature prompt" : "Polygon CLOB"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-5 relative">
        {/* Side toggle */}
        <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-xl bg-white/4 border border-white/6">
          <button
            onClick={() => setSide("YES")}
            className={`flex flex-col items-center py-3 rounded-lg font-black text-base transition-all duration-200 ${
              side === "YES"
                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            <span>YES</span>
            <span className="text-xs font-mono font-normal opacity-80">{market.yesPrice}¢</span>
          </button>
          <button
            onClick={() => setSide("NO")}
            className={`flex flex-col items-center py-3 rounded-lg font-black text-base transition-all duration-200 ${
              side === "NO"
                ? "bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-lg shadow-rose-500/10"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            <span>NO</span>
            <span className="text-xs font-mono font-normal opacity-80">{100 - market.yesPrice}¢</span>
          </button>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/35">Amount (USDC)</label>
            <span className="text-xs text-white/25 font-mono">
              {isConnected ? `Balance: ${displayBalance}` : "Not connected"}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-4 py-3 mb-3">
            <DollarSign className="w-4 h-4 text-white/35 flex-shrink-0" />
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Math.max(1, parseFloat(e.target.value) || 0))}
              className="flex-1 bg-transparent text-xl font-black text-white outline-none font-mono"
            />
            <span className="text-sm text-white/35 font-semibold">USDC</span>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 flex-wrap">
            {QUICK_AMOUNTS.map(q => (
              <button
                key={q}
                onClick={() => setAmount(q)}
                className={`flex-1 min-w-0 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  amount === q
                    ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                    : "bg-white/4 border border-white/8 text-white/45 hover:text-white hover:border-white/15"
                }`}
              >
                ${q}
              </button>
            ))}
          </div>
        </div>

        {/* Slider */}
        <div className="mb-5">
          <input
            type="range"
            min={1}
            max={500}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-white/20 font-mono mt-1">
            <span>$1</span><span>$500</span>
          </div>
        </div>

        {/* Payout estimation */}
        <div className="rounded-xl bg-white/[0.025] border border-white/6 p-4 mb-5 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Avg. price</span>
            <span className="font-mono text-white/70 font-semibold">{price.toFixed(2)} USDC/share</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Shares to receive</span>
            <span className="font-mono text-white/70 font-semibold">{shares.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-xs border-t border-white/6 pt-2">
            <span className="text-white/40">Potential payout</span>
            <span className="font-mono font-black text-white">${potentialPayout.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Potential profit</span>
            <span className={`font-mono font-bold ${potentialProfit > 0 ? "text-emerald-400" : "text-white/50"}`}>
              +${potentialProfit.toFixed(2)} ({potentialROI.toFixed(0)}% ROI)
            </span>
          </div>
        </div>

        {/* Approval button (one-time, shown only when needed) */}
        {isConnected && trade.needsApproval && tradeState === "idle" && (
          <motion.button
            onClick={trade.approve}
            disabled={trade.isApproving}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full mb-2 py-3 rounded-xl border border-amber-500/35 bg-amber-500/8 text-sm font-bold text-amber-400 hover:bg-amber-500/15 transition-all disabled:opacity-50"
          >
            {trade.isApproving ? "Approving USDC..." : "Approve USDC (one-time)"}
          </motion.button>
        )}

        {/* Place Trade button */}
        {isConnected ? (
          <motion.button
            onClick={handleTrade}
            disabled={tradeState !== "idle" || trade.needsApproval}
            whileHover={{ scale: tradeState === "idle" ? 1.01 : 1 }}
            whileTap={{ scale: tradeState === "idle" ? 0.99 : 1 }}
            className={`w-full py-4 rounded-xl text-base font-black transition-all duration-200 ${
              side === "YES"
                ? "bg-emerald-500 text-white hover:bg-emerald-400"
                : "bg-rose-500 text-white hover:bg-rose-400"
            } disabled:opacity-50`}
          >
            Buy {side} - ${amount} USDC
          </motion.button>
        ) : (
          <ConnectWalletButton />
        )}

        <p className="text-center text-[10px] text-white/20 mt-3">
          Trades execute on Polygon - no KYC under $500
        </p>
      </div>

      {/* Current position */}
      {userPosition && (
        <div className="border-t border-white/6 p-4 bg-white/[0.015]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Your Position</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black border ${userPosition.side === "YES" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-rose-500/10 border-rose-500/25 text-rose-400"}`}>
                {userPosition.side}
              </span>
              <span className="text-xs text-white/50 font-mono">{userPosition.shares} shares</span>
            </div>
            <div className="text-right">
              {(() => {
                const pnl = userPosition.shares * (userPosition.currentPrice - userPosition.entryPrice);
                return (
                  <span className={`text-sm font-black font-mono ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                  </span>
                );
              })()}
              <p className="text-[10px] text-white/25 font-mono">Entry: {(userPosition.entryPrice * 100).toFixed(0)}c</p>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

// Main Page

type TabKey = "overview" | "orderbook" | "trades" | "comments";

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const market = MARKETS.find(m => m.id === id) ?? MARKETS[0];
  const analysis = getClaudeAnalysis(id);
  const userPosition = POSITIONS.find(p => p.marketId === id) ?? null;

  // Live price simulation
  const [liveYes, setLiveYes] = useState(market.yesPrice);
  useEffect(() => {
    const id2 = setInterval(() => {
      setLiveYes(p => parseFloat(Math.max(5, Math.min(95, p + (Math.random() - 0.505) * 1.2)).toFixed(1)));
    }, 3800);
    return () => clearInterval(id2);
  }, [market.id]);

  const [tab, setTab] = useState<TabKey>("overview");
  const catClass = catPillColors[market.category] ?? catPillColors.Finance;

  const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
    { key: "overview", label: "Overview", icon: Info },
    { key: "orderbook", label: "Order Book", icon: BarChart3 },
    { key: "trades", label: "Trades", icon: Activity },
    { key: "comments", label: `Comments (${MOCK_COMMENTS.length})`, icon: MessageSquare },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Back nav */}
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Markets
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6">
        {/* ── Left column ── */}
        <div className="space-y-5 min-w-0">
          {/* Market header */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 md:p-6"
          >
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${catClass}`}>
                {market.category}
              </span>
              {market.aiGenerated && (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/50 bg-cyan-500/12 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cyan-400 shadow-sm shadow-cyan-500/20">
                  <Sparkles className="w-3 h-3" />
                  AI-Generated by Claude
                </span>
              )}
              {market.trending && (
                <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/8 px-2.5 py-0.5 text-[10px] font-bold uppercase text-orange-400">
                  <TrendingUp className="w-3 h-3" /> Trending
                </span>
              )}
              <span className="text-[10px] text-white/25 font-mono ml-auto flex items-center gap-1">
                <Hash className="w-3 h-3" />{market.id}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl md:text-2xl font-black text-white leading-snug mb-5">
              {market.question}
            </h1>

            {/* Big probability display */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <motion.div
                animate={{ borderColor: `rgba(16,185,129,${0.2 + (liveYes / 200)})` }}
                transition={{ duration: 0.6 }}
                className="rounded-2xl bg-emerald-500/8 border border-emerald-500/25 p-4 text-center"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70 mb-1">YES</p>
                <motion.p
                  key={liveYes}
                  initial={{ scale: 1.06 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-black text-emerald-400 font-mono"
                >
                  {liveYes.toFixed(1)}¢
                </motion.p>
                <p className="text-xs text-emerald-400/50 mt-0.5 font-mono">{liveYes.toFixed(0)}% chance</p>
              </motion.div>
              <motion.div
                animate={{ borderColor: `rgba(244,63,94,${0.2 + ((100 - liveYes) / 200)})` }}
                transition={{ duration: 0.6 }}
                className="rounded-2xl bg-rose-500/8 border border-rose-500/25 p-4 text-center"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400/70 mb-1">NO</p>
                <motion.p
                  key={100 - liveYes}
                  initial={{ scale: 1.06 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-black text-rose-400 font-mono"
                >
                  {(100 - liveYes).toFixed(1)}¢
                </motion.p>
                <p className="text-xs text-rose-400/50 mt-0.5 font-mono">{(100 - liveYes).toFixed(0)}% chance</p>
              </motion.div>
            </div>

            {/* Probability bar */}
            <div className="mb-5">
              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  animate={{ width: `${liveYes}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Volume", value: fmtVol(market.volume), icon: DollarSign, color: "text-cyan-400" },
                { label: "Traders", value: market.traders.toLocaleString(), icon: Users, color: "text-violet-400" },
                { label: "Liquidity", value: fmtVol(market.liquidity), icon: Activity, color: "text-emerald-400" },
                { label: "Resolves", value: market.resolveDate, icon: Clock, color: "text-orange-400" },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-xl bg-white/[0.025] border border-white/5 p-3 text-center">
                    <Icon className={`w-3.5 h-3.5 ${s.color} mx-auto mb-1`} />
                    <p className="text-sm font-bold text-white font-mono">{s.value}</p>
                    <p className="text-[10px] text-white/30">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Price chart */}
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <PriceChart yesPrice={liveYes} marketId={market.id} />
          </motion.div>

          {/* Claude AI Insights — prominent on mobile/tablet, also shown in left column */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="lg:hidden">
            <ClaudeInsightsPanel analysis={analysis} defaultOpen={false} />
          </motion.div>

          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-white/8 bg-white/[0.025] overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-white/6 overflow-x-auto">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`relative flex items-center gap-2 px-4 md:px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                    tab === key ? "text-white" : "text-white/35 hover:text-white/65"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {tab === key && (
                    <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5">
              <AnimatePresence mode="wait">
                {tab === "overview" && (
                  <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {market.description ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">About this market</p>
                          <p className="text-sm text-white/60 leading-relaxed">{market.description}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="rounded-xl bg-white/[0.025] border border-white/5 p-3">
                            <p className="text-xs text-white/30 mb-0.5">24h Change</p>
                            <p className={`text-base font-black font-mono ${market.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {market.change >= 0 ? "+" : ""}{market.change}%
                            </p>
                          </div>
                          <div className="rounded-xl bg-white/[0.025] border border-white/5 p-3">
                            <p className="text-xs text-white/30 mb-0.5">Days Left</p>
                            <p className="text-base font-black text-white font-mono">{market.daysLeft}d</p>
                          </div>
                          <div className="rounded-xl bg-white/[0.025] border border-white/5 p-3">
                            <p className="text-xs text-white/30 mb-0.5">AI Confidence</p>
                            <p className="text-base font-black text-cyan-400 font-mono">{analysis.confidenceScore}%</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-white/40">No additional description available.</p>
                    )}
                  </motion.div>
                )}
                {tab === "orderbook" && (
                  <motion.div key="ob" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <OrderBookTab yesPrice={liveYes} />
                  </motion.div>
                )}
                {tab === "trades" && (
                  <motion.div key="tr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <TradesTab yesPrice={liveYes} />
                  </motion.div>
                )}
                {tab === "comments" && (
                  <motion.div key="cm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <CommentsTab />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Claude AI Insights — desktop left column */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="hidden lg:block">
            <ClaudeInsightsPanel analysis={analysis} defaultOpen={true} />
          </motion.div>
        </div>

        {/* ── Right column: Trading panel ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="relative"
        >
          <TradingPanel market={{ ...market, yesPrice: liveYes }} userPosition={userPosition} />

          {/* Share + Links */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href).catch(() => {})}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/3 py-2.5 text-xs font-semibold text-white/45 hover:text-white hover:border-white/15 transition-all"
            >
              <Copy className="w-3.5 h-3.5" /> Copy link
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/3 py-2.5 text-xs font-semibold text-white/45 hover:text-white hover:border-white/15 transition-all">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <Link
              href={`https://polygonscan.com/address/${market.id}`}
              target="_blank"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-xs font-semibold text-white/45 hover:text-white hover:border-white/15 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Similar markets */}
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-widest text-white/25 mb-3">Similar Markets</p>
            <div className="space-y-2">
              {MARKETS.filter(m => m.id !== market.id && m.category === market.category).slice(0, 3).map(m => (
                <Link
                  key={m.id}
                  href={`/markets/${m.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3 hover:border-white/12 hover:bg-white/[0.04] transition-all group"
                >
                  <p className="text-xs text-white/60 leading-snug line-clamp-2 group-hover:text-white/80 transition-colors">{m.question}</p>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-bold font-mono text-emerald-400">{m.yesPrice}¢</p>
                    <p className="text-[10px] text-white/25 font-mono">{fmtVol(m.volume)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
