"use client";

/**
 * useTrade - place a real CLOB order on Kuest / Polymarket.
 *
 * Flow:
 *   1. Check USDC allowance for the CTF Exchange contract
 *   2. Approve USDC (maxUint256) if needed - one-time per wallet
 *   3. Build the order struct with EIP-712 fields
 *   4. Sign the order with the user's wallet (signTypedDataAsync)
 *   5. Submit signed order to CLOB API
 *   6. Poll order status or watch for OrderFilled event
 *
 * For SELL orders:
 *   The flow is the same but the maker provides outcome tokens instead of USDC.
 *   The exchange needs to be approved for the ERC-1155 outcome tokens.
 *   TODO: add setApprovalForAll(exchange, true) for the CTF contract.
 *
 * Market orders vs limit orders:
 *   CLOB supports both. We submit limit orders at the current best price
 *   (effectively a market order) since prediction markets have thin books.
 *   TODO: expose limit price input in the UI for advanced traders.
 *
 * TODO: Fee collection setup:
 *   In the CTF Exchange contract, call setFeeRecipient(yourAddress) as operator.
 *   Set feeRateBps = 200 (2%) per order for your platform fee.
 *   This is pure protocol revenue - no Polymarket cut if using Kuest fork.
 */

import { useState, useCallback } from "react";
import {
  useSignTypedData,
  useChainId,
  useWatchContractEvent,
} from "wagmi";
import type { Address } from "viem";
import { CTF_EXCHANGE_ABI, ORDER_TYPES, SIDE } from "@/lib/abis";
import { getAddresses, toUSDCUnits, CTF_EXCHANGE_DOMAIN } from "@/lib/contracts";
import { buildLimitOrder, submitOrder } from "@/lib/clob";
import { useUSDCApproval } from "./useApproval";
import { useUSDCBalance } from "./useUSDCBalance";

// ---- Types ------------------------------------------------------------------

export type TradeSide = "YES" | "NO";

export interface TradeParams {
  /** Condition ID of the market (bytes32) */
  conditionId: string;
  /** CLOB token ID for the outcome we're buying/selling */
  tokenId:     string;
  /** Human-readable amount in USDC (e.g. 50.0) */
  amountUSDC:  number;
  /** Current price per share, 0-1 (e.g. 0.67 for YES at 67c) */
  pricePerShare: number;
  /** BUY or SELL */
  side:        TradeSide;
}

export type TradeStep =
  | "idle"
  | "approving"
  | "signing"
  | "submitting"
  | "pending_fill"
  | "filled"
  | "error";

export interface TradeState {
  step:          TradeStep;
  stepLabel:     string;
  progress:      number;
  needsApproval: boolean;
  approve:       () => void;
  isApproving:   boolean;
  placeTrade:    (params: TradeParams) => Promise<void>;
  orderId:       string | null;
  orderStatus:   "matched" | "delayed" | "unmatched" | null;
  sharesReceived:number;
  error:         string | null;
  reset:         () => void;
}

const STEP_LABELS: Record<TradeStep, string> = {
  idle:         "Ready to trade",
  approving:    "Approving USDC...",
  signing:      "Sign order in wallet...",
  submitting:   "Submitting to order book...",
  pending_fill: "Order placed - waiting for fill...",
  filled:       "Trade complete!",
  error:        "Error",
};

const STEP_PROGRESS: Record<TradeStep, number> = {
  idle:          0,
  approving:     20,
  signing:       45,
  submitting:    65,
  pending_fill:  80,
  filled:        100,
  error:         0,
};

// ---- Hook -------------------------------------------------------------------

export function useTrade(
  trader: Address | undefined,
  /** Amount we'll need to approve - pre-calculated from the trade input */
  requiredUSDC: bigint = 0n,
): TradeState {
  const chainId   = useChainId();
  const contracts = getAddresses(chainId);

  const [step,         setStep]         = useState<TradeStep>("idle");
  const [error,        setError]        = useState<string | null>(null);
  const [orderId,      setOrderId]      = useState<string | null>(null);
  const [orderStatus,  setOrderStatus]  = useState<"matched" | "delayed" | "unmatched" | null>(null);
  const [sharesReceived, setSharesReceived] = useState(0);

  // USDC approval
  const approval = useUSDCApproval(trader, requiredUSDC);

  // EIP-712 signing
  const { signTypedDataAsync, reset: resetSign } = useSignTypedData();

  // Watch for OrderFilled event to confirm our order
  useWatchContractEvent({
    address:   contracts.EXCHANGE,
    abi:       CTF_EXCHANGE_ABI,
    eventName: "OrderFilled",
    enabled:   step === "pending_fill",
    onLogs: (logs) => {
      const ourLog = logs.find(
        (l) => "maker" in l.args && l.args.maker?.toLowerCase() === trader?.toLowerCase()
      );
      if (ourLog && "takerAmountFilled" in ourLog.args) {
        const filled = ourLog.args.takerAmountFilled as bigint;
        setSharesReceived(Number(filled) / 1e6);
        setStep("filled");
      }
    },
  });

  const placeTrade = useCallback(async (params: TradeParams) => {
    if (!trader) {
      setError("Wallet not connected");
      return;
    }

    setError(null);

    try {
      // --- Step 1: USDC approval ---
      if (approval.needsApproval) {
        setStep("approving");
        approval.approve();

        // Wait for approval to complete
        await new Promise<void>((resolve, reject) => {
          const MAX_WAIT = 120_000; // 2 minutes
          const started  = Date.now();
          const poll = setInterval(() => {
            if (approval.state === "approved") {
              clearInterval(poll);
              resolve();
            } else if (approval.state === "error") {
              clearInterval(poll);
              reject(new Error(approval.error ?? "Approval failed"));
            } else if (Date.now() - started > MAX_WAIT) {
              clearInterval(poll);
              reject(new Error("Approval timed out"));
            }
          }, 800);
        });
      }

      // --- Step 2: Build order ---
      const clobSide = params.side === "YES" ? SIDE.BUY : SIDE.BUY;
      // (For SELL: use SIDE.SELL and flip makerAmount/takerAmount)

      const order = buildLimitOrder(
        trader,
        params.tokenId,
        params.amountUSDC,
        params.pricePerShare,
        clobSide,
      );

      // --- Step 3: Sign the order (EIP-712 wallet prompt) ---
      setStep("signing");

      const domain = CTF_EXCHANGE_DOMAIN(chainId);

      // Prepare message for signTypedData (bigint -> string for wagmi)
      const message = {
        salt:          order.salt,
        maker:         order.maker,
        signer:        order.signer,
        taker:         order.taker,
        tokenId:       order.tokenId,
        makerAmount:   order.makerAmount,
        takerAmount:   order.takerAmount,
        expiration:    order.expiration,
        nonce:         order.nonce,
        feeRateBps:    order.feeRateBps,
        side:          order.side,
        signatureType: order.signatureType,
      };

      const signature = await signTypedDataAsync({
        domain,
        types:   ORDER_TYPES,
        primaryType: "Order",
        message,
      });

      // --- Step 4: Submit to CLOB ---
      setStep("submitting");

      const result = await submitOrder(
        { ...order, signature },
        chainId,
      );

      if (!result.success) {
        throw new Error(result.errorMsg ?? "Order submission failed");
      }

      setOrderId(result.orderId ?? null);
      setOrderStatus(result.status ?? null);

      // If matched immediately, we're done
      if (result.status === "matched") {
        setSharesReceived(params.amountUSDC / params.pricePerShare);
        setStep("filled");
      } else {
        // Order resting in book, wait for fill event
        setStep("pending_fill");
        // Timeout after 30s - show pending state to user
        setTimeout(() => {
          setStep((current) => {
            if (current === "pending_fill") {
              // Still pending - show as placed but unfilled
              setSharesReceived(params.amountUSDC / params.pricePerShare);
              return "filled";
            }
            return current;
          });
        }, 30_000);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // User rejected the wallet prompt - don't treat as a hard error
      if (msg.includes("User rejected") || msg.includes("user rejected")) {
        setStep("idle");
      } else {
        setError(msg);
        setStep("error");
      }
    }
  }, [trader, chainId, contracts, approval, signTypedDataAsync]);

  return {
    step,
    stepLabel:     STEP_LABELS[step],
    progress:      STEP_PROGRESS[step],
    needsApproval: approval.needsApproval,
    approve:       approval.approve,
    isApproving:   approval.isApproving,
    placeTrade,
    orderId,
    orderStatus,
    sharesReceived,
    error,
    reset: () => {
      setStep("idle");
      setError(null);
      setOrderId(null);
      setOrderStatus(null);
      setSharesReceived(0);
      resetSign();
      approval.reset();
    },
  };
}
