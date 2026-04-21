/**
 * CLOB (Central Limit Order Book) client for TrendForge / Kuest
 *
 * Handles EIP-712 order signing and submission to the Polymarket-compatible
 * CLOB API. This is how actual trades execute.
 *
 * Flow:
 *   1. Build an Order struct
 *   2. Sign it with signTypedDataAsync (wagmi)
 *   3. POST to /order with the signature
 *   4. CLOB engine matches the order against resting orders
 *   5. On fill: CTF Exchange contract settles the trade on-chain
 *
 * Kuest note:
 *   Kuest self-hosted CLOB has the same API format as Polymarket CLOB.
 *   Set NEXT_PUBLIC_CLOB_BASE_URL to your Kuest CLOB backend URL.
 *
 * API key note:
 *   Polymarket CLOB requires an API key for order placement (free signup).
 *   Key derivation: sign "This message attests that I control the given wallet"
 *   with your wallet to get the API key. See deriveApiKey() below.
 *
 * TODO: Set NEXT_PUBLIC_CLOB_API_KEY via Vercel env after deriving your key.
 */

import { API, getAddresses, USDC_DECIMALS } from "./contracts";
import { ORDER_TYPES, SIDE, SIG_TYPE } from "./abis";
import type { Address } from "viem";

const CLOB_BASE = process.env.NEXT_PUBLIC_CLOB_BASE_URL ?? API.CLOB_BASE;

// ---- Types ------------------------------------------------------------------

export interface ClobOrder {
  salt:          bigint;
  maker:         Address;
  signer:        Address;
  taker:         Address;    // zero address for public orders
  tokenId:       bigint;     // YES or NO outcome token ID
  makerAmount:   bigint;     // USDC amount in 6-decimal units (BUY side)
  takerAmount:   bigint;     // shares amount (BUY side)
  expiration:    bigint;     // unix timestamp, 0 = no expiry
  nonce:         bigint;
  feeRateBps:    bigint;     // 0 = no fee (fee collected by exchange separately)
  side:          0 | 1;      // SIDE.BUY | SIDE.SELL
  signatureType: 0 | 1 | 2;  // SIG_TYPE.EOA for normal wallets
}

export interface SignedOrder extends ClobOrder {
  signature: `0x${string}`;
}

export interface OrderBookLevel {
  price: number;
  size:  number;
}

export interface OrderBook {
  market:   string;
  asset_id: string;
  bids:     OrderBookLevel[];
  asks:     OrderBookLevel[];
  hash:     string;
}

export interface OrderResult {
  success:   boolean;
  orderId?:  string;
  status?:   "matched" | "delayed" | "unmatched";
  errorMsg?: string;
}

// ---- Order construction -----------------------------------------------------

/**
 * Build a limit BUY order for YES or NO outcome tokens.
 *
 * @param maker        - wallet address placing the order
 * @param tokenId      - YES or NO token ID from CLOB market
 * @param usdcAmount   - amount in USDC (human units, e.g. 50.0)
 * @param pricePerShare - expected price 0-1 (e.g. 0.67 for 67c)
 * @param side         - SIDE.BUY or SIDE.SELL
 */
export function buildLimitOrder(
  maker: Address,
  tokenId: string,
  usdcAmount: number,
  pricePerShare: number,
  side: 0 | 1 = SIDE.BUY,
): ClobOrder {
  const usdcUnits  = BigInt(Math.round(usdcAmount * 10 ** USDC_DECIMALS));
  const shareUnits = BigInt(Math.round((usdcAmount / pricePerShare) * 10 ** USDC_DECIMALS));

  return {
    salt:          BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
    maker,
    signer:        maker,
    taker:         "0x0000000000000000000000000000000000000000" as Address,
    tokenId:       BigInt(tokenId),
    makerAmount:   side === SIDE.BUY ? usdcUnits  : shareUnits,
    takerAmount:   side === SIDE.BUY ? shareUnits : usdcUnits,
    expiration:    0n, // no expiry
    nonce:         0n,
    feeRateBps:    0n, // fees collected by exchange contract separately
    side,
    signatureType: SIG_TYPE.EOA,
  };
}

// ---- CLOB API calls ---------------------------------------------------------

/** Fetch the order book for a token (YES or NO side) */
export async function fetchOrderBook(tokenId: string): Promise<OrderBook | null> {
  try {
    const res = await fetch(
      `${CLOB_BASE}/order-book?token_id=${tokenId}`,
      { next: { revalidate: 3 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Fetch mid-market price for a token */
export async function fetchTokenPrice(tokenId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${CLOB_BASE}/price?token_id=${tokenId}&side=BUY`,
      { next: { revalidate: 3 } }
    );
    if (!res.ok) return null;
    const data: { price: string } = await res.json();
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

/**
 * Submit a signed order to the CLOB.
 *
 * Requires NEXT_PUBLIC_CLOB_API_KEY (derived from wallet signature).
 * For Polymarket mainnet: get key at https://polymarket.com/profile
 * For Kuest self-hosted: API key auth depends on your backend config.
 *
 * TODO: Implement API key derivation flow (one-time per wallet):
 *   const msg = "This message attests that I control the given wallet"
 *   const sig = await signMessageAsync({ message: msg })
 *   → POST /auth/derive-api-key { signature, nonce }
 *   → save returned { apiKey, secret, passphrase } to localStorage
 */
export async function submitOrder(
  signed: SignedOrder,
  chainId: number,
): Promise<OrderResult> {
  const apiKey = process.env.NEXT_PUBLIC_CLOB_API_KEY ?? "";

  const body = {
    order: {
      salt:          signed.salt.toString(),
      maker:         signed.maker,
      signer:        signed.signer,
      taker:         signed.taker,
      tokenId:       signed.tokenId.toString(),
      makerAmount:   signed.makerAmount.toString(),
      takerAmount:   signed.takerAmount.toString(),
      expiration:    signed.expiration.toString(),
      nonce:         signed.nonce.toString(),
      feeRateBps:    signed.feeRateBps.toString(),
      side:          signed.side === SIDE.BUY ? "BUY" : "SELL",
      signatureType: signed.signatureType,
      signature:     signed.signature,
    },
    owner:    signed.maker,
    orderType: "GTC", // Good Till Cancelled - standard limit order
  };

  const res = await fetch(`${CLOB_BASE}/order`, {
    method:  "POST",
    headers: {
      "Content-Type":      "application/json",
      "POLY_ADDRESS":      signed.maker,
      "POLY_SIGNATURE":    apiKey,
      "POLY_TIMESTAMP":    String(Math.floor(Date.now() / 1000)),
      "POLY_NONCE":        "0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, errorMsg: err };
  }

  const data: { orderId: string; status: "matched" | "delayed" | "unmatched" } =
    await res.json();
  return { success: true, orderId: data.orderId, status: data.status };
}

/**
 * Register a newly created market with the CLOB.
 * Called after CTF.prepareCondition() to make the market tradable.
 *
 * TODO: This endpoint requires admin/operator access on Polymarket mainnet.
 * For Kuest self-hosted, this is an open endpoint on your own CLOB.
 */
export async function registerMarketWithClob(
  conditionId: string,
  questionId: string,
  question: string,
  description: string,
  resolutionCriteria: string,
  endDate: string,
  yesTokenId: string,
  noTokenId: string,
): Promise<{ success: boolean; marketId?: string; error?: string }> {
  const apiKey = process.env.NEXT_PUBLIC_CLOB_API_KEY ?? "";

  try {
    const res = await fetch(`${CLOB_BASE}/create-market`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "POLY_ADDRESS":   apiKey,
        "POLY_SIGNATURE": apiKey,
        "POLY_TIMESTAMP": String(Math.floor(Date.now() / 1000)),
        "POLY_NONCE":     "0",
      },
      body: JSON.stringify({
        conditionId,
        questionId,
        question,
        description,
        resolutionCriteria,
        endDate,
        outcomes: ["Yes", "No"],
        clobTokenIds: [yesTokenId, noTokenId],
        // AI-generated flag - stored as custom metadata on Kuest
        tags: ["ai-generated", "trendforge"],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: errText };
    }

    const data: { marketId: string } = await res.json();
    return { success: true, marketId: data.marketId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
