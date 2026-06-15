/**
 * Pending market store — dual-backend: Upstash Redis (production) or in-memory+/tmp (dev).
 *
 * Backend selection (automatic):
 *   - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set → Redis (Vercel-safe, persistent)
 *   - Otherwise → in-memory Map + /tmp JSON warm-start cache (works for local dev / single-process)
 *
 * To enable Redis:
 *   1. Create a free database at https://upstash.com
 *   2. Copy the REST URL and token to your .env.local (and Vercel env vars)
 *      UPSTASH_REDIS_REST_URL=https://...
 *      UPSTASH_REDIS_REST_TOKEN=...
 */

import type { PendingMarket, ModerationStatus, PendingMarketPatch } from "@/types/pending-market";

const REDIS_KEY = "trendforge:pending";

// ── Detect backend ────────────────────────────────────────────────────────────

function hasRedis(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

// Lazy-initialised Redis client — only imported when env vars are present
// so the module doesn't crash in dev without Upstash credentials.
let _redis: import("@upstash/redis").Redis | null = null;

async function getRedis(): Promise<import("@upstash/redis").Redis> {
  if (_redis) return _redis;
  const { Redis } = await import("@upstash/redis");
  _redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return _redis;
}

// ── Redis implementation ──────────────────────────────────────────────────────

async function redisGetAll(filter?: {
  status?: ModerationStatus | "all";
  category?: string;
  search?: string;
}): Promise<PendingMarket[]> {
  const redis = await getRedis();
  const raw = await redis.hgetall<Record<string, PendingMarket>>(REDIS_KEY);
  let list = raw ? Object.values(raw) : [];

  list = list.sort(byNewest);

  if (filter?.status && filter.status !== "all") {
    list = list.filter(m => m.status === filter.status);
  }
  if (filter?.category) {
    list = list.filter(m => m.category === filter.category);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(
      m => m.question.toLowerCase().includes(q) ||
           m.topic.toLowerCase().includes(q) ||
           m.tags?.some(t => t.includes(q))
    );
  }
  return list;
}

async function redisGetById(id: string): Promise<PendingMarket | null> {
  const redis = await getRedis();
  return redis.hget<PendingMarket>(REDIS_KEY, id);
}

async function redisAdd(market: PendingMarket): Promise<void> {
  const redis = await getRedis();
  await redis.hset(REDIS_KEY, { [market.id]: market });
}

async function redisPatch(id: string, update: PendingMarketPatch): Promise<PendingMarket | null> {
  const redis = await getRedis();
  const existing = await redis.hget<PendingMarket>(REDIS_KEY, id);
  if (!existing) return null;
  const updated: PendingMarket = { ...existing, ...update };
  await redis.hset(REDIS_KEY, { [id]: updated });
  return updated;
}

async function redisCounts(): Promise<Record<ModerationStatus | "all", number>> {
  const list = await redisGetAll();
  return tally(list);
}

// ── In-memory + /tmp implementation ──────────────────────────────────────────

import fs   from "fs";
import path from "path";

declare global {
  // eslint-disable-next-line no-var
  var __tf_pending__: Map<string, PendingMarket> | undefined;
}

const memStore: Map<string, PendingMarket> =
  global.__tf_pending__ ?? (global.__tf_pending__ = new Map());

const TMP_PATH = path.join(
  process.env.TMPDIR ?? (process.platform === "win32" ? "C:\\Windows\\Temp" : "/tmp"),
  "trendforge-pending.json"
);

let loaded = false;

function hydrate(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw  = fs.readFileSync(TMP_PATH, "utf8");
    const list: PendingMarket[] = JSON.parse(raw);
    for (const m of list) memStore.set(m.id, m);
  } catch { /* file doesn't exist yet */ }
}

function persist(): void {
  try {
    fs.writeFileSync(TMP_PATH, JSON.stringify(Array.from(memStore.values()), null, 2), "utf8");
  } catch { /* non-critical */ }
}

async function memGetAll(filter?: {
  status?: ModerationStatus | "all";
  category?: string;
  search?: string;
}): Promise<PendingMarket[]> {
  hydrate();
  let list = Array.from(memStore.values()).sort(byNewest);

  if (filter?.status && filter.status !== "all") {
    list = list.filter(m => m.status === filter.status);
  }
  if (filter?.category) {
    list = list.filter(m => m.category === filter.category);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(
      m => m.question.toLowerCase().includes(q) ||
           m.topic.toLowerCase().includes(q) ||
           m.tags?.some(t => t.includes(q))
    );
  }
  return list;
}

async function memGetById(id: string): Promise<PendingMarket | null> {
  hydrate();
  return memStore.get(id) ?? null;
}

async function memAdd(market: PendingMarket): Promise<void> {
  hydrate();
  memStore.set(market.id, market);
  persist();
}

async function memPatch(id: string, update: PendingMarketPatch): Promise<PendingMarket | null> {
  hydrate();
  const existing = memStore.get(id);
  if (!existing) return null;
  const updated: PendingMarket = { ...existing, ...update };
  memStore.set(id, updated);
  persist();
  return updated;
}

async function memCounts(): Promise<Record<ModerationStatus | "all", number>> {
  hydrate();
  return tally(Array.from(memStore.values()));
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function byNewest(a: PendingMarket, b: PendingMarket): number {
  return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
}

function tally(list: PendingMarket[]): Record<ModerationStatus | "all", number> {
  return {
    all:       list.length,
    pending:   list.filter(m => m.status === "pending").length,
    approved:  list.filter(m => m.status === "approved").length,
    rejected:  list.filter(m => m.status === "rejected").length,
    published: list.filter(m => m.status === "published").length,
  };
}

// ── Public API (always async) ─────────────────────────────────────────────────

export async function getAll(filter?: {
  status?: ModerationStatus | "all";
  category?: string;
  search?: string;
}): Promise<PendingMarket[]> {
  return hasRedis() ? redisGetAll(filter) : memGetAll(filter);
}

export async function getById(id: string): Promise<PendingMarket | null> {
  return hasRedis() ? redisGetById(id) : memGetById(id);
}

export async function add(market: PendingMarket): Promise<void> {
  return hasRedis() ? redisAdd(market) : memAdd(market);
}

export async function patch(id: string, update: PendingMarketPatch): Promise<PendingMarket | null> {
  return hasRedis() ? redisPatch(id, update) : memPatch(id, update);
}

export async function counts(): Promise<Record<ModerationStatus | "all", number>> {
  return hasRedis() ? redisCounts() : memCounts();
}
