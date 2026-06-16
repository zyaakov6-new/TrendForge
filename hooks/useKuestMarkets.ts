"use client";

/**
 * useKuestMarkets - fetch real markets from Kuest / Polymarket Gamma API.
 *
 * Falls back to mock data on API error so the UI stays functional
 * during development without a live CLOB connection.
 *
 * React Query caching:
 *   - Market list: stale after 60s
 *   - Single market: stale after 30s
 *   - Prices: stale after 5s (polled every 8s)
 *
 * To use your own Kuest backend:
 *   Set NEXT_PUBLIC_GAMMA_BASE_URL=https://your-kuest-backend.com in .env.local
 */

import { useQuery } from "@tanstack/react-query";
import { fetchMarkets, fetchMarket, fetchMarketPrices, type GammaMarket } from "@/lib/kuest-api";
import { MARKETS, type Market } from "@/lib/mock-data";
import type { PublicMarket } from "@/app/api/markets/published/route";

// ---- Map TrendForge published market to our internal Market type ------------

function publishedToMarket(p: PublicMarket): Market {
  const daysLeft = p.endDate
    ? Math.max(0, Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86_400_000))
    : 30;
  return {
    id:          p.conditionId,
    question:    p.question,
    category:    (p.category as Market["category"]) ?? "Politics",
    yesPrice:    p.yesPrice,
    volume:      0,           // unknown until OrderFilled events are indexed
    daysLeft,
    aiGenerated: true,        // every market in this stream is AI-generated
    trending:    true,        // surface AI markets prominently
    change:      0,
    resolveDate: p.endDate
      ? new Date(p.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "",
    traders:     0,
    liquidity:   0,
    description: "",
    yesTokenId:  p.yesTokenId,
    noTokenId:   p.noTokenId,
    conditionId: p.conditionId,
  };
}

async function fetchTrendforgePublished(): Promise<Market[]> {
  try {
    const res = await fetch("/api/markets/published");
    if (!res.ok) return [];
    const data = await res.json();
    return (data.markets as PublicMarket[]).map(publishedToMarket);
  } catch {
    return [];
  }
}

// ---- Map Gamma market to our internal Market type --------------------------

export function gammaToMarket(g: GammaMarket): Market {
  const yesPrice = Math.round(parseFloat(g.outcomePrices?.[0] ?? "0.5") * 100);
  const volume   = parseFloat(g.volume ?? "0");
  const liquidity = parseFloat(g.liquidity ?? "0");
  const daysLeft = g.endDate
    ? Math.max(0, Math.ceil((new Date(g.endDate).getTime() - Date.now()) / 86_400_000))
    : 30;

  // Detect AI-generated markets by description prefix
  const aiGenerated = g.description?.startsWith("[AI-GENERATED") ?? false;

  // Try to guess category from question text
  const q = g.question?.toLowerCase() ?? "";
  const category =
    q.includes("israel") || q.includes("netanyahu") || q.includes("knesset") ? "Israel"
    : q.includes("bitcoin") || q.includes("eth") || q.includes("crypto")     ? "Crypto"
    : q.includes("election") || q.includes("president") || q.includes("vote")? "Politics"
    : q.includes("war") || q.includes("military") || q.includes("nato")      ? "Geopolitics"
    : q.includes("rate") || q.includes("fed") || q.includes("inflation")     ? "Finance"
    : q.includes("ai") || q.includes("openai") || q.includes("gpt")          ? "Tech"
    : "Politics";

  return {
    id:          g.conditionId ?? g.id,
    question:    g.question ?? "",
    category:    category as Market["category"],
    yesPrice,
    volume,
    daysLeft,
    aiGenerated,
    trending:    g.featured || (g.volume24hr ?? 0) > 50_000,
    change:      Math.round(g.oneDayPriceChange ?? 0),
    resolveDate: g.endDate ? new Date(g.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
    traders:     Math.round(volume / 50), // rough estimate
    liquidity,
    description: g.description?.replace(/^\[AI-GENERATED[^\]]*\] /, "") ?? "",
    // CLOB token IDs from Gamma API — needed for real-time price polling
    yesTokenId:  g.clobTokenIds?.[0],
    noTokenId:   g.clobTokenIds?.[1],
  };
}

// ---- Hooks ------------------------------------------------------------------

/**
 * Fetch all active markets from two sources, merged:
 *   1. TrendForge's own on-chain published markets (AI-generated) — prepended
 *      because they're the differentiator. Fetched from /api/markets/published.
 *   2. Polymarket's Gamma API — external markets shown after ours.
 *
 * If both sources are empty (dev / network failure), falls back to MARKETS mock
 * so the UI doesn't crash.
 */
export function useKuestMarkets(params?: {
  limit?: number;
  featured?: boolean;
  tag?: string;
}) {
  return useQuery({
    queryKey: ["kuest-markets", params],
    queryFn:  async (): Promise<Market[]> => {
      // Fire both fetches in parallel; tolerate either failing.
      const [trendforge, gammaRaw] = await Promise.all([
        fetchTrendforgePublished(),
        fetchMarkets({
          limit:    params?.limit ?? 20,
          active:   true,
          featured: params?.featured,
        }).catch(() => [] as GammaMarket[]),
      ]);

      const gamma = (gammaRaw ?? []).map(gammaToMarket);

      // Deduplicate by conditionId so we never show the same market twice if a
      // TrendForge market also surfaces on Polymarket's index.
      const seen = new Set<string>();
      const merged: Market[] = [];
      for (const m of [...trendforge, ...gamma]) {
        const key = m.conditionId ?? m.id;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(m);
      }

      if (merged.length === 0) return MARKETS; // last-resort fallback for dev
      return merged;
    },
    staleTime:      60_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch a single market by conditionId.
 * Resolution order:
 *   1. TrendForge published list (so AI markets work)
 *   2. Polymarket Gamma API
 *   3. Mock data (so local IDs like "1" still render in dev)
 */
export function useKuestMarket(conditionId: string | undefined) {
  return useQuery({
    queryKey: ["kuest-market", conditionId],
    enabled:  Boolean(conditionId),
    queryFn:  async (): Promise<Market | null> => {
      if (!conditionId) return null;

      // (1) Check TrendForge's own markets first — keeps AI markets reachable
      // even if Polymarket's index doesn't know them.
      const tf = await fetchTrendforgePublished();
      const ours = tf.find(
        m => m.conditionId === conditionId || m.id === conditionId
      );
      if (ours) return ours;

      // (2) Fall back to Gamma
      try {
        const g = await fetchMarket(conditionId);
        return gammaToMarket(g);
      } catch {
        // (3) Last-resort mock
        return MARKETS.find(m => m.id === conditionId) ?? null;
      }
    },
    staleTime: 30_000,
  });
}

/** Real-time prices for a market's YES/NO tokens, polled every 8s */
export function useMarketLivePrices(yesTokenId: string | undefined, noTokenId: string | undefined) {
  return useQuery({
    queryKey: ["market-prices", yesTokenId, noTokenId],
    enabled:  Boolean(yesTokenId && noTokenId),
    queryFn:  async () => {
      if (!yesTokenId || !noTokenId) return null;
      try {
        const prices = await fetchMarketPrices([yesTokenId, noTokenId]);
        const yes = prices.find(p => p.asset_id === yesTokenId);
        const no  = prices.find(p => p.asset_id === noTokenId);
        return {
          yesBid:  yes?.bid  ?? 0.5,
          yesAsk:  yes?.ask  ?? 0.5,
          yesMid:  yes?.price ?? 0.5,
          noBid:   no?.bid   ?? 0.5,
          noAsk:   no?.ask   ?? 0.5,
          noMid:   no?.price ?? 0.5,
        };
      } catch {
        return null;
      }
    },
    staleTime:       5_000,
    refetchInterval: 8_000,
  });
}
