"use client";

/**
 * useUserPositions - read real user positions from Kuest CLOB API + CTF contract.
 *
 * Two data sources combined:
 *
 *   1. CLOB API /positions?user=0x...
 *      Returns current open positions with avg price, current value, P&L.
 *      This is the fastest and most convenient.
 *
 *   2. CTF.balanceOf(user, tokenId) for each known market
 *      Direct on-chain read - ground truth, no API required.
 *      Slower (one call per market) but works without a running CLOB.
 *
 * For the portfolio page, we use source 1 and fall back to mock data.
 * Source 2 is shown as a commented example for full on-chain integration.
 */

import { useQuery } from "@tanstack/react-query";
import { useReadContracts, useChainId } from "wagmi";
import type { Address } from "viem";
import { fetchUserPositions, type UserPosition } from "@/lib/kuest-api";
import { POSITIONS, type Position } from "@/lib/mock-data";
import { CTF_ABI } from "@/lib/abis";
import { getAddresses } from "@/lib/contracts";

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

// ---- Source 2: Direct on-chain CTF balance read ----------------------------
//
// Use this when the CLOB API is unavailable or you want ground-truth data.
// Requires knowing the tokenIds for each market upfront.
//
// Example:
//
//   const tokenIds = markets.map(m => [m.yesTokenId, m.noTokenId]).flat()
//   const { data } = useReadContracts({
//     contracts: tokenIds.map(tokenId => ({
//       address:      CTF_ADDRESS,
//       abi:          CTF_ABI,
//       functionName: "balanceOf",
//       args:         [userAddress, BigInt(tokenId)],
//     })),
//   })
//   // data[i].result = balance of tokenIds[i] for userAddress
//
// TODO: implement full on-chain portfolio read when Kuest testnet is live

// ---- Combined hook used by Portfolio page ----------------------------------

export interface PortfolioData {
  positions:    Position[];
  isLoading:    boolean;
  isOnChain:    boolean;      // true = real data, false = mock fallback
  totalValue:   number;
  totalPnL:     number;
  totalPnLPct:  number;
}

export function usePortfolio(address: Address | undefined): PortfolioData {
  const { data: clobPositions, isLoading } = useClobPositions(address);

  let positions: Position[];
  let isOnChain: boolean;

  if (clobPositions && clobPositions.length > 0) {
    positions = clobPositions.map(clobToPosition);
    isOnChain = true;
  } else {
    // Fallback to mock while building out / on testnet without CLOB
    positions = POSITIONS;
    isOnChain = false;
  }

  const totalValue = positions
    .filter(p => p.status === "open")
    .reduce((s, p) => s + p.shares * p.currentPrice, 0);

  const totalPnL = positions
    .filter(p => p.status === "open")
    .reduce((s, p) => s + p.shares * (p.currentPrice - p.entryPrice), 0);

  const totalEntry = positions
    .filter(p => p.status === "open")
    .reduce((s, p) => s + p.shares * p.entryPrice, 0);

  const totalPnLPct = totalEntry > 0
    ? (totalPnL / totalEntry) * 100
    : 0;

  return {
    positions,
    isLoading: isLoading && Boolean(address),
    isOnChain,
    totalValue,
    totalPnL,
    totalPnLPct,
  };
}
