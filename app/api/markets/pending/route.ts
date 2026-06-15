/**
 * GET  /api/markets/pending  → list markets (admin only)
 * POST /api/markets/pending  → submit a market to the queue (public)
 *
 * Auth:
 *   GET:  requires x-admin-wallet header matching ADMIN_WALLET env var
 *   POST: public (any user can submit from the AI Generator)
 *         rate-limited to 20 submissions / IP / hour
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import * as store from "@/lib/pending-store";
import type { PendingMarket, SubmitMarketBody, ModerationStatus } from "@/types/pending-market";

// ── Auth helper ───────────────────────────────────────────────────────────────

function isAdmin(req: NextRequest): boolean {
  const wallet = req.headers.get("x-admin-wallet") ?? "";
  const adminWallet = process.env.ADMIN_WALLET ?? "";
  if (!adminWallet) return false; // env not set → locked
  return wallet.toLowerCase() === adminWallet.toLowerCase();
}

// ── Rate limiter (POST only, per IP) ─────────────────────────────────────────

const WINDOW_MS  = 60 * 60 * 1_000; // 1 hour
const MAX_SUBMIT = 20;

interface Bucket { count: number; resetAt: number }
const submitBuckets = new Map<string, Bucket>();

function submitRateCheck(ip: string): { ok: boolean } {
  const now = Date.now();
  if (submitBuckets.size > 500) {
    for (const [k, b] of submitBuckets) if (now >= b.resetAt) submitBuckets.delete(k);
  }
  let b = submitBuckets.get(ip);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    submitBuckets.set(ip, b);
  }
  if (b.count >= MAX_SUBMIT) return { ok: false };
  b.count++;
  return { ok: true };
}

// ── GET /api/markets/pending ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status   = (searchParams.get("status")   ?? "all") as ModerationStatus | "all";
  const category = searchParams.get("category")  ?? undefined;
  const search   = searchParams.get("search")    ?? undefined;

  const [markets, counts] = await Promise.all([
    store.getAll({ status, category, search }),
    store.counts(),
  ]);

  return NextResponse.json({ markets, counts, total: markets.length });
}

// ── POST /api/markets/pending ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { ok } = submitRateCheck(ip);
  if (!ok) {
    return NextResponse.json(
      { error: "Too many submissions. Try again in an hour." },
      { status: 429 }
    );
  }

  let body: SubmitMarketBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { market, topic, submittedBy } = body;

  if (!market || typeof market.question !== "string" || !topic) {
    return NextResponse.json(
      { error: "Missing required fields: market, topic" },
      { status: 400 }
    );
  }

  // Sanitize submittedBy — must be a valid Ethereum address
  const cleanAddress =
    typeof submittedBy === "string" && /^0x[0-9a-fA-F]{40}$/.test(submittedBy)
      ? submittedBy.toLowerCase()
      : undefined;

  const pending: PendingMarket = {
    ...market,
    id:          randomUUID(),
    status:      "pending",
    topic:       topic.slice(0, 300),
    submittedAt: new Date().toISOString(),
    submittedBy: cleanAddress,
  };

  await store.add(pending);

  return NextResponse.json({ id: pending.id, market: pending }, { status: 201 });
}
