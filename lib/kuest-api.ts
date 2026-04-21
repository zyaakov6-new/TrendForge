/**
 * Kuest / Polymarket Gamma API client
 *
 * The Gamma API is Polymarket's public REST API for market data.
 * Kuest white-labels use the same API format - swap GAMMA_BASE to your own
 * Kuest backend URL if self-hosting.
 *
 * Documentation: https://docs.polymarket.com/#gamma-markets-api
 * Rate limit: ~300 req/min (no auth needed for reads)
 *
 * Kuest self-hosted backend:
 *   TODO: Clone kuestcom/prediction-market, run the backend, and set
 *   NEXT_PUBLIC_GAMMA_BASE_URL in .env.local to your backend URL.
 *   The API schema is identical to Polymarket's Gamma API.
 */

import { API } from "./contracts";

const BASE = process.env.NEXT_PUBLIC_GAMMA_BASE_URL ?? API.GAMMA_BASE;

// ---- Types ------------------------------------------------------------------

export interface GammaMarket {
  id:                   string;      // CLOB market ID
  conditionId:          string;      // bytes32 condition ID on CTF
  questionId:           string;      // bytes32 question ID
  question:             string;
  description:          string;
  outcomes:             string[];    // ["Yes", "No"]
  outcomePrices:        string[];    // ["0.67", "0.33"] - last trade prices
  volume:               string;      // USD volume as string
  volume24hr:           number;
  liquidity:            string;      // current liquidity in USD
  startDate:            string;      // ISO
  endDate:              string;      // ISO
  resolvedBy:           string;      // oracle address
  resolutionSource:     string;
  active:               boolean;
  closed:               boolean;
  archived:             boolean;
  new:                  boolean;
  featured:             boolean;
  restricted:           boolean;
  questionScored:       boolean;
  rewardsMinSize:       number;
  rewardsMaxSpread:     number;
  spread:               number;
  bestBid:              number;
  bestAsk:              number;
  lastTradePrice:       number;
  oneDayPriceChange:    number;
  // Token IDs for YES/NO outcome tokens (used for CLOB orders)
  clobTokenIds:         string[];    // [yesTokenId, noTokenId]
  acceptingOrders:      boolean;
  // TrendForge AI metadata (stored in description prefix if AI-generated)
  aiGenerated?:         boolean;
}

export interface GammaEvent {
  id:          string;
  title:       string;
  description: string;
  slug:        string;
  markets:     GammaMarket[];
  volume:      string;
  liquidity:   string;
  startDate:   string;
  endDate:     string;
  active:      boolean;
  archived:    boolean;
  new:         boolean;
  featured:    boolean;
}

export interface GammaClobTokenPrice {
  market:   string;
  asset_id: string;
  price:    number;
  bid:      number;
  ask:      number;
}

// ---- API helpers ------------------------------------------------------------

async function get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 30 }, // Next.js fetch cache - 30s
  });
  if (!res.ok) throw new Error(`Gamma API error ${res.status}: ${path}`);
  return res.json() as T;
}

// ---- Market endpoints -------------------------------------------------------

export interface MarketsParams {
  limit?:         number;
  offset?:        number;
  active?:        boolean;
  closed?:        boolean;
  archived?:      boolean;
  new?:           boolean;
  featured?:      boolean;
  tag_slug?:      string;
  related_tags?:  boolean;
  tag_id?:        number;
  question?:      string;  // search by question text
  id?:            string;  // comma-separated condition IDs
}

export async function fetchMarkets(params: MarketsParams = {}): Promise<GammaMarket[]> {
  return get<GammaMarket[]>("/markets", {
    limit:  params.limit  ?? 20,
    offset: params.offset ?? 0,
    active: params.active ?? true,
    ...params,
  });
}

export async function fetchMarket(conditionId: string): Promise<GammaMarket> {
  return get<GammaMarket>(`/markets/${conditionId}`);
}

export async function fetchMarketPrices(tokenIds: string[]): Promise<GammaClobTokenPrice[]> {
  // CLOB price endpoint
  const CLOB = process.env.NEXT_PUBLIC_CLOB_BASE_URL ?? API.CLOB_BASE;
  const res = await fetch(`${CLOB}/prices?token_ids=${tokenIds.join(",")}`, {
    next: { revalidate: 5 },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchEvents(params: {
  limit?: number;
  active?: boolean;
  tag?: string;
} = {}): Promise<GammaEvent[]> {
  return get<GammaEvent[]>("/events", {
    limit:  params.limit  ?? 10,
    active: params.active ?? true,
    ...(params.tag ? { tag: params.tag } : {}),
  });
}

// ---- Position/user endpoints ------------------------------------------------

export interface UserPosition {
  market:          GammaMarket;
  asset:           string;     // token ID (YES or NO)
  size:            number;     // number of shares
  avgPrice:        number;
  initialValue:    number;
  currentValue:    number;
  cashPnl:         number;
  percentPnl:      number;
  side:            "YES" | "NO";
}

export async function fetchUserPositions(address: string): Promise<UserPosition[]> {
  try {
    const CLOB = process.env.NEXT_PUBLIC_CLOB_BASE_URL ?? API.CLOB_BASE;
    const res = await fetch(`${CLOB}/positions?user=${address.toLowerCase()}`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
