"use client";

/**
 * useSeedLiquidity — admin places initial YES and NO sell orders for a market.
 *
 * Flow:
 *   1. Ensure admin has CTF.setApprovalForAll(EXCHANGE, true) — one-time
 *   2. Sign a SELL YES order at the specified price
 *   3. Sign a SELL NO  order at (1 - yesPrice + spread)
 *   4. POST both signed orders to /api/clob/orders
 *
 * After seeding, users can call CTF Exchange.fillOrder() against these orders.
 * Admin must hold YES and NO tokens (from splitPosition during market creation).
 */

import { useState, useCallback } from "react";
import { useSignTypedData, useChainId } from "wagmi";
import type { Address } from "viem";
import { CTF_EXCHANGE_DOMAIN } from "@/lib/contracts";
import { ORDER_TYPES, SIDE, SIG_TYPE } from "@/lib/abis";
import { useCTFApproval } from "./useApproval";
import type { StoredOrder } from "@/lib/order-store";

export interface SeedParams {
  conditionId:   string;
  yesTokenId:    string;
  noTokenId:     string;
  /** YES price as a fraction 0-1 (e.g. 0.67 for 67¢) */
  yesPrice:      number;
  /** USDC amount of YES tokens to offer (e.g. 200 means 200 YES shares at resolution) */
  yesLiquidity:  number;
  /** USDC amount of NO tokens to offer */
  noLiquidity:   number;
  /** Spread added on top of fair price — admin's revenue (e.g. 0.02 = 2¢ spread) */
  spread?:       number;
}

export type SeedStep = "idle" | "approving" | "signing_yes" | "signing_no" | "storing" | "done" | "error";

export interface SeedState {
  step:      SeedStep;
  stepLabel: string;
  error:     string | null;
  seed:      (params: SeedParams) => Promise<void>;
  reset:     () => void;
}

const LABELS: Record<SeedStep, string> = {
  idle:        "Ready",
  approving:   "Approving token transfer...",
  signing_yes: "Sign YES sell order in wallet...",
  signing_no:  "Sign NO sell order in wallet...",
  storing:     "Storing orders...",
  done:        "Liquidity seeded!",
  error:       "Error",
};

const USDC_DEC = 6;

export function useSeedLiquidity(admin: Address | undefined): SeedState {
  const chainId = useChainId();
  const [step,  setStep]  = useState<SeedStep>("idle");
  const [error, setError] = useState<string | null>(null);

  const ctfApproval = useCTFApproval(admin);
  const { signTypedDataAsync } = useSignTypedData();

  const seed = useCallback(async (params: SeedParams) => {
    if (!admin) { setError("Wallet not connected"); return; }
    setError(null);

    try {
      // Step 1: CTF approval so Exchange can transfer admin's outcome tokens
      if (ctfApproval.needsApproval) {
        setStep("approving");
        ctfApproval.approve();
        await new Promise<void>((res, rej) => {
          const t = Date.now();
          const iv = setInterval(() => {
            if (!ctfApproval.needsApproval) { clearInterval(iv); res(); }
            else if (ctfApproval.error)     { clearInterval(iv); rej(new Error(ctfApproval.error)); }
            else if (Date.now() - t > 120_000) { clearInterval(iv); rej(new Error("Approval timed out")); }
          }, 800);
        });
      }

      const domain  = CTF_EXCHANGE_DOMAIN(chainId);
      const spread  = params.spread ?? 0.02;
      const sellYes = Math.min(0.99, params.yesPrice + spread / 2);
      const sellNo  = Math.min(0.99, (1 - params.yesPrice) + spread / 2);

      const makeOrder = (tokenId: string, pricePerShare: number, liquidity: number) => {
        const makerAmt = BigInt(Math.round(liquidity * 10 ** USDC_DEC));
        const takerAmt = BigInt(Math.round(liquidity * pricePerShare * 10 ** USDC_DEC));
        return {
          salt:          BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
          maker:         admin,
          signer:        admin,
          taker:         "0x0000000000000000000000000000000000000000" as Address,
          tokenId:       BigInt(tokenId),
          makerAmount:   makerAmt,  // YES/NO tokens admin gives
          takerAmount:   takerAmt,  // USDC admin receives
          expiration:    0n,
          nonce:         0n,
          feeRateBps:    0n,
          side:          SIDE.SELL as 0 | 1,
          signatureType: SIG_TYPE.EOA as 0 | 1 | 2,
        };
      };

      // Step 2: Sign YES sell order
      setStep("signing_yes");
      const yesMsg = makeOrder(params.yesTokenId, sellYes, params.yesLiquidity);
      const yesSig = await signTypedDataAsync({
        domain,
        types:       ORDER_TYPES,
        primaryType: "Order",
        message:     yesMsg,
      });

      // Step 3: Sign NO sell order
      setStep("signing_no");
      const noMsg = makeOrder(params.noTokenId, sellNo, params.noLiquidity);
      const noSig = await signTypedDataAsync({
        domain,
        types:       ORDER_TYPES,
        primaryType: "Order",
        message:     noMsg,
      });

      // Step 4: Store both orders
      setStep("storing");
      const adminWallet = admin;

      const toStored = (
        msg:         typeof yesMsg,
        sig:         `0x${string}`,
        outcomeSide: "YES" | "NO",
        tokenId:     string,
      ): StoredOrder => ({
        conditionId:   params.conditionId,
        outcomeSide,
        tokenId,
        salt:          msg.salt.toString(),
        maker:         msg.maker,
        signer:        msg.signer,
        taker:         msg.taker,
        makerAmount:   msg.makerAmount.toString(),
        takerAmount:   msg.takerAmount.toString(),
        expiration:    msg.expiration.toString(),
        nonce:         msg.nonce.toString(),
        feeRateBps:    msg.feeRateBps.toString(),
        side:          msg.side,
        signatureType: msg.signatureType,
        signature:     sig,
        remaining:     msg.makerAmount.toString(),
        createdAt:     new Date().toISOString(),
      });

      const yesOrder = toStored(yesMsg, yesSig, "YES", params.yesTokenId);
      const noOrder  = toStored(noMsg,  noSig,  "NO",  params.noTokenId);

      await Promise.all([
        fetch("/api/clob/orders", {
          method:  "POST",
          headers: { "Content-Type": "application/json", "x-admin-wallet": adminWallet },
          body:    JSON.stringify(yesOrder),
        }),
        fetch("/api/clob/orders", {
          method:  "POST",
          headers: { "Content-Type": "application/json", "x-admin-wallet": adminWallet },
          body:    JSON.stringify(noOrder),
        }),
      ]);

      setStep("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("rejected") || msg.includes("denied")) setStep("idle");
      else { setError(msg); setStep("error"); }
    }
  }, [admin, chainId, ctfApproval, signTypedDataAsync]);

  return {
    step,
    stepLabel: LABELS[step],
    error,
    seed,
    reset: () => { setStep("idle"); setError(null); ctfApproval.reset(); },
  };
}
