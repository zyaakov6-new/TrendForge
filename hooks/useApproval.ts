"use client";

/**
 * useApproval - ERC-20 approval check and approve flow.
 *
 * Before any trade or market creation that moves USDC:
 *   1. Check current allowance (useAllowance)
 *   2. If allowance < amount needed, call approve()
 *   3. Wait for confirmation, then proceed with the main transaction
 *
 * We approve maxUint256 once so users only ever approve once per wallet.
 * This is the standard UX on Polymarket and Uniswap.
 */

import { useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { maxUint256 } from "viem";
import type { Address } from "viem";
import { ERC20_ABI } from "@/lib/abis";
import { getAddresses } from "@/lib/contracts";

// ---- Check current allowance ------------------------------------------------

export function useAllowance(
  owner:   Address | undefined,
  spender: Address | undefined,
  token:   Address | undefined,
) {
  return useReadContract({
    address:      token,
    abi:          ERC20_ABI,
    functionName: "allowance",
    args:         owner && spender ? [owner, spender] : undefined,
    query: {
      enabled:   Boolean(owner && spender && token),
      staleTime: 15_000,
    },
  });
}

// ---- Full approval flow hook ------------------------------------------------

export type ApprovalState =
  | "idle"
  | "checking"
  | "approval_needed"
  | "approving"
  | "waiting_confirmation"
  | "approved"
  | "error";

export interface UseApprovalReturn {
  state:            ApprovalState;
  needsApproval:    boolean;
  approve:          () => void;
  isApproving:      boolean;
  approveTxHash:    `0x${string}` | undefined;
  error:            string | null;
  reset:            () => void;
}

export function useUSDCApproval(
  owner:   Address | undefined,
  amount:  bigint,           // USDC amount in 6-decimal units needed for the trade
): UseApprovalReturn {
  const chainId   = useChainId();
  const contracts = getAddresses(chainId);

  const [approveError, setApproveError] = useState<string | null>(null);

  // 1. Read current allowance
  const { data: allowance, isLoading: isCheckingAllowance } = useAllowance(
    owner,
    contracts.EXCHANGE,
    contracts.USDC,
  );

  const needsApproval = allowance !== undefined
    ? allowance < amount
    : false;

  // 2. Write contract - approve maxUint256 once (standard DeFi UX)
  const {
    writeContract,
    data: approveTxHash,
    isPending: isWritePending,
    reset: resetWrite,
  } = useWriteContract();

  // 3. Wait for approval transaction confirmation
  const { isLoading: isWaitingConfirm } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  function approve() {
    setApproveError(null);
    writeContract(
      {
        address:      contracts.USDC,
        abi:          ERC20_ABI,
        functionName: "approve",
        args:         [contracts.EXCHANGE, maxUint256],
      },
      {
        onError: (e) => setApproveError(e.message),
      }
    );
  }

  // Derive state
  let state: ApprovalState = "idle";
  if (isCheckingAllowance)  state = "checking";
  else if (needsApproval && !approveTxHash && !isWritePending) state = "approval_needed";
  else if (isWritePending)  state = "approving";
  else if (isWaitingConfirm && approveTxHash) state = "waiting_confirmation";
  else if (approveTxHash && !isWaitingConfirm) state = "approved";
  if (approveError)         state = "error";

  return {
    state,
    needsApproval,
    approve,
    isApproving:   isWritePending || isWaitingConfirm,
    approveTxHash,
    error:         approveError,
    reset: () => {
      setApproveError(null);
      resetWrite();
    },
  };
}
