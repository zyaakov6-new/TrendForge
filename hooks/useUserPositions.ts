"use client";

/**
 * useUserPositions — read real user positions on Polygon.
 *
 * Primary source: direct CTF.balanceOfBatch read of YES/NO token IDs for
 * every TrendForge-published market. Ground truth, no off-chain index needed.
 *
 * Secondary source: CLOB API /positions?user=0x... (Polymarket markets) —
 * useful if we ever surface non-TrendForge markets in the portfolio.
 *
 * Fallback: empty array (no mock data). An empty portfolio is the truth
 * for a new wallet; showing fake positions would mislead.
 */

import { useQuery } from "@tanstack/react-query";
import { useReadContracts, useChainId } from "wagmi";
import type { Address } from "viem";
import { fetchUserPositions, type UserPosition } from "@/lib/kuest-api";
import { type Position } from "@/lib/mock-data";
import { CTF_ABI } from "@/lib/abis";
import { getAddresses } from "@/lib/contracts";
import type { PublicMarket } from "@/app/api/markets/published/route";

// ---- Source 1: CLOB API positions ------------------------------------------

export function useClobPositions(address: Address | undefined) {
  return useQuery({
    queryKey:  ["user-positions", address],
    enabled:   Boolean(address),
    queryFn:   async (): Promise<UserPosition[]> => {
      if (!address) return [];
      try {
        const positions = await fetchUserPositions(address);
        return positions;
      } catch {
        return [];
      }
    },
    staleTime:       15_000,
    refetchInterval: 30_000,
  });
}

// ---- Map CLOB position to our internal Position type -----------------------

export function clobToPosition(p: UserPosition): Position {
  const market = p.market;
  const side   = p.side;

  return {
    id:           `${market.conditionId}-${side}`,
    marketId:     market.conditionId ?? market.id,
    question:     market.question ?? "",
    side,
    shares:       Math.round(p.size),
    entryPrice:   p.avgPrice,
    currentPrice: side === "YES"
      ? parseFloat(market.outcomePrices?.[0] ?? String(p.avgPrice))
      : parseFloat(market.outcomePrices?.[1] ?? String(p.avgPrice)),
    category:     "Politics" as Position["category"], // simplified
    resolveDate:  market.endDate ?? "",
    status:       market.closed ? (p.cashPnl > 0 ? "resolved_yes" : "resolved_no") : "open",
  };
}

// ---- Source 2: Direct on-chain CTF balance reads --------------------------

function usePublishedMarkets() {
  return useQuery({
    queryKey:  ["published-markets"],
    queryFn:   async (): Promise<PublicMarket[]> => {
      const res = await fetch("/api/markets/published");
      if (!res.ok) return [];
      const data = await res.json();
      return data.markets ?? [];
    },
    staleTime:       30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Read YES + NO balances for every published market in a single batched
 * eth_call (via useReadContracts). Then materialise non-zero positions.
 */
export function useOnChainPositions(address: Address | undefined): {
  positions: Position[];
  isLoading: boolean;
} {
  const chainId   = useChainId();
  const contracts = getAddresses(chainId);
  const { data: markets, isLoading: marketsLoading } = usePublishedMarkets();

  // Build flat list of token IDs (yes, no, yes, no, ...) in market order.
  const tokenContracts = (markets ?? []).flatMap(m => {
    const list: { tokenId: bigint; market: PublicMarket; side: "YES" | "NO" }[] = [];
    if (m.yesTokenId) list.push({ tokenId: BigInt(m.yesTokenId), market: m, side: "YES" });
    if (m.noTokenId)  list.push({ tokenId: BigInt(m.noTokenId),  market: m, side: "NO"  });
    return list;
  });

  const { data: balances, isLoading: balancesLoading } = useReadContracts({
    contracts: tokenContracts.map(t => ({
      address:      contracts.CTF,
      abi:          CTF_ABI,
      functionName: "balanceOf" as const,
      args:         [address ?? "0x0000000000000000000000000000000000000000", t.tokenId] as const,
    })),
    query: { enabled: !!address && tokenContracts.length > 0, refetchInterval: 30_000 },
  });

  const positions: Position[] = [];
  if (address && balances) {
    for (let i = 0; i < tokenContracts.length; i++) {
      const result = balances[i];
      if (result.status !== "success") continue;
      const raw = result.result as bigint;
      if (raw === 0n) continue;

      const { market, side } = tokenContracts[i];
      // CTF outcome tokens use 6 decimals (USDC-denominated). 1 share = 1 USDC at win.
      const shares = Number(raw) / 1e6;
      // Current mid price from the market's stored yesPrice (admin-set).
      const yesMid = market.yesPrice / 100;
      const currentPrice = side === "YES" ? yesMid : 1 - yesMid;

      // Entry price unknown without trade history — use current as conservative
      // placeholder so PnL reads 0 until we have on-chain trade events indexed.
      // TODO: index OrderFilled events to recover true entry prices.
      const entryPrice = currentPrice;

      let status: Position["status"] = "open";
      if (market.resolved) {
        const won = market.resolvedOutcome === side;
        status = won ? "resolved_yes" : "resolved_no";
      }

      positions.push({
        id:           `${market.conditionId}-${side}`,
        marketId:     market.id,
        question:     market.question,
        side,
        shares,
        entryPrice,
        currentPrice: market.resolved
          ? (market.resolvedOutcome === side ? 1 : 0)
          : currentPrice,
        category:     market.category as Position["category"],
        resolveDate:  market.endDate,
        status,
      });
    }
  }

  return {
    positions,
    isLoading: Boolean(address) && (marketsLoading || balancesLoading),
  };
}

// ---- Combined hook used by Portfolio page ----------------------------------

export interface PortfolioData {
  positions:    Position[];
  isLoading:    boolean;
  isOnChain:    boolean;
  totalValue:   number;
  totalPnL:     number;
  totalPnLPct:  number;
}

export function usePortfolio(address: Address | undefined): PortfolioData {
  const { positions, isLoading } = useOnChainPositions(address);

  const openPositions = positions.filter(p => p.status === "open");
  const totalValue = openPositions.reduce((s, p) => s + p.shares * p.currentPrice, 0);
  const totalPnL   = openPositions.reduce((s, p) => s + p.shares * (p.currentPrice - p.entryPrice), 0);
  const totalEntry = openPositions.reduce((s, p) => s + p.shares * p.entryPrice, 0);
  const totalPnLPct = totalEntry > 0 ? (totalPnL / totalEntry) * 100 : 0;

  return {
    positions,
    isLoading,
    isOnChain:   true,
    totalValue,
    totalPnL,
    totalPnLPct,
  };
}
