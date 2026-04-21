"use client";

/**
 * useUSDCBalance - reads USDC balance directly from the USDC contract.
 *
 * Why not use wagmi's useBalance({ token })?
 *   - useBalance with a token address calls eth_call to the token contract,
 *     but it can fail silently on testnet where the token doesn't exist.
 *   - This hook uses useReadContract directly, gives clearer loading/error
 *     states, and auto-selects the right USDC address per chain.
 *   - It also refetches every block (via watchBlockNumber) so the balance
 *     stays live after a trade or deposit.
 */

import { useReadContract, useChainId, useBlockNumber } from "wagmi";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ERC20_ABI } from "@/lib/abis";
import { getAddresses, USDC_DECIMALS } from "@/lib/contracts";
import type { Address } from "viem";

export interface USDCBalance {
  raw:       bigint | undefined;
  formatted: string;             // "1,842.50"
  loading:   boolean;
  error:     boolean;
  refetch:   () => void;
}

export function useUSDCBalance(address: Address | undefined): USDCBalance {
  const chainId    = useChainId();
  const qc         = useQueryClient();
  const contracts  = getAddresses(chainId);

  const {
    data,
    isLoading,
    isError,
    queryKey,
    refetch,
  } = useReadContract({
    address:      contracts.USDC,
    abi:          ERC20_ABI,
    functionName: "balanceOf",
    args:         address ? [address] : undefined,
    query: {
      enabled:    Boolean(address),
      staleTime:  10_000,    // 10s
      gcTime:     60_000,
    },
  });

  // Refetch on every new block so balance updates after trades
  const { data: blockNumber } = useBlockNumber({ watch: true });
  useEffect(() => {
    if (blockNumber) {
      qc.invalidateQueries({ queryKey });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockNumber]);

  const formatted = data !== undefined
    ? (Number(data) / 10 ** USDC_DECIMALS).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : address
      ? "0.00"   // connected but no USDC yet
      : "-";     // not connected

  return {
    raw:       data,
    formatted,
    loading:   isLoading,
    error:     isError,
    refetch,
  };
}
