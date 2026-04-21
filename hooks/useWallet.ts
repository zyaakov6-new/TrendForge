"use client";

/**
 * Convenience wallet hook
 *
 * Wraps wagmi primitives into a single hook so pages
 * don't import from 5 different places.
 *
 * Kuest integration: when adding USDC approval flow before first trade,
 * add useReadContract for USDC.allowance(owner, KUEST_ROUTER) here.
 */

import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { polygon } from "wagmi/chains";

// USDC contract addresses
export const USDC = {
  polygon: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as const,
  // TODO: add Polygon Amoy testnet USDC when Kuest testnet is configured
  polygonAmoy: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582" as const,
} as const;

export function useWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  // USDC balance on current chain
  const usdcAddress =
    chainId === polygon.id ? USDC.polygon : USDC.polygonAmoy;

  const { data: usdcBalance, isLoading: isBalanceLoading } = useBalance({
    address,
    token: usdcAddress,
    // TODO: useBalance doesn't auto-refetch on chain switch in all cases.
    // For production, also subscribe to Transfer events from USDC contract.
    query: { enabled: isConnected && Boolean(address) },
  });

  const isWrongNetwork =
    isConnected && chainId !== polygon.id && chainId !== 80002;

  const formattedBalance = usdcBalance
    ? parseFloat(usdcBalance.formatted).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null;

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  function switchToPolygon() {
    switchChain({ chainId: polygon.id });
  }

  return {
    address,
    isConnected,
    isConnecting: isConnecting || isReconnecting,
    chainId,
    isWrongNetwork,
    isSwitchingChain,
    switchToPolygon,
    usdcBalance,
    formattedBalance,
    isBalanceLoading,
    truncatedAddress,
  };
}
