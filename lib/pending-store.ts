/**
 * Pending market store — MVP in-memory + /tmp JSON persistence.
 *
 * Why this approach:
 *  - Zero new dependencies; works in local dev and on Vercel day-1.
 *  - Module-level Map is a singleton within a Node.js process.
 *  - /tmp JSON acts as a best-effort warm-start cache across invocations.
 *  - For Vercel deployments with multiple Lambda instances, each instance
 *    starts with an empty store and re-hydrates from /tmp if it was warmed.
 *    This is fine for a solo founder's low-traffic moderation workflow.
 *
 * ──────────────────────────────────────────────────────────────────
 * UPGRADING TO UPSTASH REDIS (recommended for production):
 *
 *   npm install @upstash/redis
 *
 *   Add to .env.local / Vercel:
 *     UPSTASH_REDIS_REST_URL=https://...
 *     UPSTASH_REDIS_REST_TOKEN=...
 *
 *   Then replace the four exported functions below with:
 *
 *     import { Redis } from "@upstash/redis";
 *     const redis = new Redis({ url: ..., token: ... });
 *
 *     const KEY = "trendforge:pending";
 *
 *     export async function getAll() {
 *       const obj = await redis.hgetall<Record<string,PendingMarket>>(KEY) ?? {};
 *       return Object.values(obj).sort(byDate);
 *     }
 *     export async function getById(id) { return redis.hget(KEY, id); }
 *     export async function add(m)      { await redis.hset(KEY, { [m.id]: m }); }
 *     export async function patch(id, p) {
 *       const m = await redis.hget<PendingMarket>(KEY, id);
 *       if (!m) return null;
 *       const updated = { ...m, ...p };
 *       await redis.hset(KEY, { [id]: updated });
 *       return updated;
 *     }
 * ──────────────────────────────────────────────────────────────────
 *
 * UPGRADING TO SUPABASE:
 *   npm install @supabase/supabase-js
 *
 *   Create a `pending_markets` table with columns matching PendingMarket.
 *   Replace the functions with supabase.from("pending_markets").select / insert / update.
 * ──────────────────────────────────────────────────────────────────
 */

import fs   from "fs";
import path from "path";
import type { PendingMarket, ModerationStatus, PendingMarketPatch } from "@/types/pending-market";

// ── Singleton Map ─────────────────────────────────────────────────────────────
// Use global to survive Next.js hot-reload in dev (modules are re-evaluated
// but global persists for the lifetime of the Node.js process).
declare global {
  // eslint-disable-next-line no-var
  var __tf_pending__: Map<string, PendingMarket> | undefined;
}

const store: Map<string, PendingMarket> =
  global.__tf_pending__ ?? (global.__tf_pending__ = new Map());

// ── /tmp persistence ──────────────────────────────────────────────────────────

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
    for (const m of list) store.set(m.id, m);
  } catch {
    // File doesn't exist yet — that's fine
  }
}

function persist(): void {
  try {
    const list = Array.from(store.values());
    fs.writeFileSync(TMP_PATH, JSON.stringify(list, null, 2), "utf8");
  } catch {
    // /tmp write failed — non-critical, in-memory still works
  }
}

// ── Sorting helper ────────────────────────────────────────────────────────────

function byNewest(a: PendingMarket, b: PendingMarket): number {
  return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAll(filter?: {
  status?: ModerationStatus | "all";
  category?: string;
  search?: string;
}): PendingMarket[] {
  hydrate();

  let list = Array.from(store.values()).sort(byNewest);

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

export function getById(id: string): PendingMarket | null {
  hydrate();
  return store.get(id) ?? null;
}

export function add(market: PendingMarket): void {
  hydrate();
  store.set(market.id, market);
  persist();
}

export function patch(id: string, update: PendingMarketPatch): PendingMarket | null {
  hydrate();
  const existing = store.get(id);
  if (!existing) return null;
  const updated: PendingMarket = { ...existing, ...update };
  store.set(id, updated);
  persist();
  return updated;
}

export function counts(): Record<ModerationStatus | "all", number> {
  hydrate();
  const list = Array.from(store.values());
  return {
    all:       list.length,
    pending:   list.filter(m => m.status === "pending").length,
    approved:  list.filter(m => m.status === "approved").length,
    rejected:  list.filter(m => m.status === "rejected").length,
    published: list.filter(m => m.status === "published").length,
  };
}
