"use client";

/**
 * Market data hooks
 *
 * Current: mock data via @tanstack/react-query with simulated network delay.
 * Future: swap fetchMarket/fetchAllMarkets for real Kuest contract reads:
 *
 *   import { useReadContract, useReadContracts, useWatchContractEvent } from 'wagmi'
 *   import { KuestMarketReaderABI } from '@/lib/abis'
 *
 *   const KUEST_MARKET_READER = '0x...' as const  // Polygon mainnet
 *
 *   // Single market
 *   const { data } = useReadContract({
 *     address: KUEST_MARKET_READER,
 *     abi: KuestMarketReaderABI,
 *     functionName: 'getMarket',
 *     args: [questionId],
 *   })
 *
 *   // Live price updates
 *   useWatchContractEvent({
 *     address: KUEST_AMM_ADDRESS,
 *     abi: KuestAMMABI,
 *     eventName: 'PriceUpdate',
 *     onLogs: () => queryClient.invalidateQueries({ queryKey: ['market-price', id] }),
 *   })
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MARKETS, type Market } from "@/lib/mock-data";

// Types - will mirror Kuest contract response shapes when integrated
export interface MarketPrice {
  yesPrice: number;  // 0-100 cents
  noPrice: number;
  spread: number;    // bid-ask spread in cents
  lastUpdated: number;
}

// Simulated fetchers (replace internals, keep interfaces)

async function fetchMarket(id: string): Promise<Market | null> {
  await new Promise((r) => setTimeout(r, 180));
  return MARKETS.find((m) => m.id === id) ?? null;
}

async function fetchMarketPrice(id: string): Promise<MarketPrice> {
  await new Promise((r) => setTimeout(r, 120));
  const market = MARKETS.find((m) => m.id === id);
  const yes = market?.yesPrice ?? 50;
  return {
    yesPrice: yes,
    noPrice: 100 - yes,
    spread: 1.2,
    lastUpdated: Date.now(),
  };
}

async function fetchAllMarkets(): Promise<Market[]> {
  await new Promise((r) => setTimeout(r, 280));
  return MARKETS;
}

// Hooks

export function useMarket(id: string) {
  return useQuery({
    queryKey: ["market", id],
    queryFn: () => fetchMarket(id),
    staleTime: 30_000,
    enabled: Boolean(id),
  });
}

export function useMarketPrice(id: string) {
  return useQuery({
    queryKey: ["market-price", id],
    queryFn: () => fetchMarketPrice(id),
    staleTime: 5_000,
    // Poll every 8s - replace with useWatchContractEvent for real-time
    refetchInterval: 8_000,
    enabled: Boolean(id),
  });
}

export function useAllMarkets() {
  return useQuery({
    queryKey: ["markets"],
    queryFn: fetchAllMarkets,
    staleTime: 60_000,
  });
}

export function useRefreshMarketPrice(id: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["market-price", id] });
}
