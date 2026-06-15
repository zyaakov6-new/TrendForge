/**
 * Order store — persists admin-signed maker orders for TrendForge markets.
 *
 * Admin pre-signs SELL YES and SELL NO orders and stores them here.
 * Users fetch the best available order and call CTF Exchange.fillOrder() directly.
 *
 * Storage: Upstash Redis when env vars are present, in-memory fallback otherwise.
 * Key pattern: trendforge:orders:{conditionId}:{YES|NO} → JSON array of StoredOrder
 */

export interface StoredOrder {
  /** The conditionId of the market */
  conditionId:   string;
  /** Which outcome this is a SELL order for */
  outcomeSide:   "YES" | "NO";
  /** ERC-1155 token ID for this outcome */
  tokenId:       string;
  /** The signed EIP-712 order (all fields as strings for JSON serialisation) */
  salt:          string;
  maker:         string;
  signer:        string;
  taker:         string;
  makerAmount:   string;   // shares in 6-decimal units (what admin gives)
  takerAmount:   string;   // USDC in 6-decimal units (what admin receives)
  expiration:    string;
  nonce:         string;
  feeRateBps:    string;
  side:          number;   // 1 = SELL
  signatureType: number;   // 0 = EOA
  signature:     string;   // 0x... EIP-712 signature
  /** Remaining fill capacity (starts == makerAmount, decreases as orders fill) */
  remaining:     string;
  createdAt:     string;
}

// ---- In-memory fallback -------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __tf_orders__: Map<string, StoredOrder[]> | undefined;
}

function getMemStore(): Map<string, StoredOrder[]> {
  if (!global.__tf_orders__) global.__tf_orders__ = new Map();
  return global.__tf_orders__;
}

function orderKey(conditionId: string, side: "YES" | "NO") {
  return `${conditionId}:${side}`;
}

// ---- Redis backend -----------------------------------------------------------

let _redis: import("@upstash/redis").Redis | null = null;

async function getRedis() {
  if (_redis) return _redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import("@upstash/redis");
  _redis = new Redis({ url, token });
  return _redis;
}

const REDIS_PREFIX = "trendforge:orders";

// ---- Public API --------------------------------------------------------------

/** Return all stored orders for a given market + side, best first (highest remaining) */
export async function getOrders(
  conditionId: string,
  side: "YES" | "NO",
): Promise<StoredOrder[]> {
  const redis = await getRedis();
  if (redis) {
    const raw = await redis.get<StoredOrder[]>(`${REDIS_PREFIX}:${orderKey(conditionId, side)}`);
    return raw ?? [];
  }
  return getMemStore().get(orderKey(conditionId, side)) ?? [];
}

/** Return the best available order (most remaining capacity) */
export async function getBestOrder(
  conditionId: string,
  side: "YES" | "NO",
): Promise<StoredOrder | null> {
  const orders = await getOrders(conditionId, side);
  const active = orders.filter(o => BigInt(o.remaining) > 0n);
  if (!active.length) return null;
  active.sort((a, b) => Number(BigInt(b.remaining) - BigInt(a.remaining)));
  return active[0];
}

/** Store a new maker order (replaces any existing order for same conditionId + side) */
export async function addOrder(order: StoredOrder): Promise<void> {
  const orders = await getOrders(order.conditionId, order.outcomeSide);
  // Replace existing order from same maker for same market + side
  const idx = orders.findIndex(o => o.maker.toLowerCase() === order.maker.toLowerCase());
  if (idx >= 0) orders[idx] = order;
  else orders.push(order);

  const redis = await getRedis();
  const key = orderKey(order.conditionId, order.outcomeSide);
  if (redis) {
    await redis.set(`${REDIS_PREFIX}:${key}`, orders);
  } else {
    getMemStore().set(key, orders);
  }
}

/** Reduce remaining capacity after a fill */
export async function recordFill(
  conditionId: string,
  side: "YES" | "NO",
  makerAddress: string,
  fillAmount: bigint,
): Promise<void> {
  const orders = await getOrders(conditionId, side);
  const order = orders.find(o => o.maker.toLowerCase() === makerAddress.toLowerCase());
  if (!order) return;
  const newRemaining = BigInt(order.remaining) - fillAmount;
  order.remaining = (newRemaining > 0n ? newRemaining : 0n).toString();

  const redis = await getRedis();
  const key = orderKey(conditionId, side);
  if (redis) {
    await redis.set(`${REDIS_PREFIX}:${key}`, orders);
  } else {
    getMemStore().set(key, orders);
  }
}
