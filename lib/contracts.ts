/**
 * Contract addresses and chain config for TrendForge / Kuest
 *
 * Architecture:
 *   TrendForge uses the Polymarket-compatible Conditional Token Framework (CTF)
 *   deployed on Polygon. Kuest is an open-source white-label that shares
 *   these same contracts - so markets created here appear in both UIs,
 *   sharing the same liquidity pool.
 *
 * Key contracts:
 *   ConditionalTokens (CTF) - ERC-1155 token representing YES/NO outcome shares
 *   CTF Exchange            - CLOB exchange for trading those tokens
 *   USDC                    - Collateral token
 *   UMA Oracle              - Resolves markets via optimistic oracle
 *
 * Polygon Amoy testnet note:
 *   Kuest has not publicly deployed to Amoy. For testnet development,
 *   either use Polygon Amoy with a private CTF deployment (see DEPLOY.md)
 *   or use the Polygon mainnet contracts with tiny amounts.
 *
 * To add your own Kuest instance:
 *   1. Fork kuestcom/prediction-market
 *   2. Deploy the contracts via `npx hardhat deploy --network polygon`
 *   3. Replace the addresses below with your deployed addresses
 *   4. Update CLOB_BASE_URL to your own CLOB backend endpoint
 */

import { polygon, polygonAmoy } from "wagmi/chains";

export const CHAIN_IDS = {
  mainnet: polygon.id,    // 137
  testnet: polygonAmoy.id, // 80002
} as const;

// --- Contract addresses ---

export const ADDRESSES = {
  [polygon.id]: {
    // Polymarket/Kuest shared CTF infrastructure (audited, battle-tested)
    CTF:      "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045" as `0x${string}`,
    EXCHANGE: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E" as `0x${string}`,
    // Neg-risk contracts (for multi-outcome markets, optional)
    NEG_RISK_EXCHANGE: "0xC5d563A36AE78145C45a50134d48A1215220f80a" as `0x${string}`,
    NEG_RISK_ADAPTER:  "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296" as `0x${string}`,
    // UMA Optimistic Oracle V3 - used by Polymarket for market resolution
    // TODO: if using Kuest's own oracle, replace this address
    ORACLE: "0x0C96Cc2f439A0BeEcf81A8e3534D63B46A6a39D6" as `0x${string}`,
    // USDC.e (PoS bridged) - the standard collateral token on Polygon
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
  },
  [polygonAmoy.id]: {
    // TODO: deploy Kuest contracts to Amoy and replace with real addresses
    // Run: git clone kuestcom/prediction-market && npx hardhat deploy --network amoy
    CTF:               "0x0000000000000000000000000000000000000001" as `0x${string}`,
    EXCHANGE:          "0x0000000000000000000000000000000000000002" as `0x${string}`,
    NEG_RISK_EXCHANGE: "0x0000000000000000000000000000000000000003" as `0x${string}`,
    NEG_RISK_ADAPTER:  "0x0000000000000000000000000000000000000004" as `0x${string}`,
    ORACLE:            "0x0000000000000000000000000000000000000005" as `0x${string}`,
    // USDC faucet on Amoy: https://faucet.polygon.technology/
    USDC: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582" as `0x${string}`,
  },
} as const;

// --- API endpoints ---

export const API = {
  // Polymarket Gamma API - public market data (no auth required for reads)
  // Kuest-deployed instances use the same API format at their own domain
  GAMMA_BASE: "https://gamma-api.polymarket.com",

  // Polymarket CLOB API - order book + order placement
  // TODO: for Kuest white-label, replace with your own CLOB backend URL
  CLOB_BASE: "https://clob.polymarket.com",

  // WebSocket for real-time price feeds (Polymarket)
  // TODO: replace with Kuest WS endpoint if self-hosting
  CLOB_WS: "wss://ws-subscriptions-clob.polymarket.com/ws/market",
} as const;

// --- EIP-712 domain for CTF Exchange order signing ---

export const CTF_EXCHANGE_DOMAIN = (chainId: number) => ({
  name:              "CTF Exchange",
  version:           "1",
  chainId:           BigInt(chainId),
  verifyingContract: ADDRESSES[chainId as keyof typeof ADDRESSES]?.EXCHANGE,
}) as const;

// --- Helpers ---

export function getAddresses(chainId: number) {
  if (chainId in ADDRESSES) {
    return ADDRESSES[chainId as keyof typeof ADDRESSES];
  }
  // Default to mainnet if chain not recognised
  return ADDRESSES[polygon.id];
}

export function isTestnet(chainId: number) {
  return chainId === polygonAmoy.id;
}

// USDC has 6 decimals - use this everywhere instead of magic numbers
export const USDC_DECIMALS = 6;
export const USDC_UNIT = 10 ** USDC_DECIMALS; // 1_000_000 = 1 USDC

/** Convert human USDC amount to on-chain units */
export function toUSDCUnits(amount: number): bigint {
  return BigInt(Math.round(amount * USDC_UNIT));
}

/** Convert on-chain USDC units to human-readable */
export function fromUSDCUnits(units: bigint): number {
  return Number(units) / USDC_UNIT;
}
