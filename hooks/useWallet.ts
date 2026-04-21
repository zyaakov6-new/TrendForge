"use client";

/**
 * useWallet - convenience wrapper for wallet state.
 *
 * Now uses useUSDCBalance for correct on-chain balance reads
 * with proper block-level refresh.
 */

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { polygon } from "wagmi/chains";
import { useUSDCBalance } from "./useUSDCBalance";

export function useWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  const isWrongNetwork =
    isConnected && chainId !== polygon.id && chainId !== 80002;

  // Real USDC balance - reads directly from contract, refreshes on every block
  const { formatted: formattedBalance, loading: isBalanceLoading } =
    useUSDCBalance(address);

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
    formattedBalance,   // always a string: "1,842.50" | "0.00" | "-"
    isBalanceLoading,
    truncatedAddress,
  };
}
