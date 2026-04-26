/**
 * PATCH /api/markets/pending/[id]
 *   Update status, edit fields, record on-chain result.
 *   Admin only.
 *
 * DELETE /api/markets/pending/[id]
 *   Hard-delete a market from the queue.
 *   Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import * as store from "@/lib/pending-store";
import type { PendingMarketPatch } from "@/types/pending-market";

function isAdmin(req: NextRequest): boolean {
  const wallet      = req.headers.get("x-admin-wallet") ?? "";
  const adminWallet = process.env.ADMIN_WALLET ?? "";
  if (!adminWallet) return false;
  return wallet.toLowerCase() === adminWallet.toLowerCase();
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: PendingMarketPatch;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Stamp review metadata when changing status
  if (body.status && body.status !== "pending") {
    body.reviewedAt  = body.reviewedAt  ?? new Date().toISOString();
    body.reviewedBy  = body.reviewedBy  ?? req.headers.get("x-admin-wallet") ?? undefined;
  }

  const updated = store.patch(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  return NextResponse.json({ market: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const market = store.getById(id);
  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  // Only allow deleting rejected markets to prevent accidental data loss
  if (market.status !== "rejected") {
    return NextResponse.json(
      { error: "Can only delete rejected markets. Reject first." },
      { status: 409 }
    );
  }

  store.patch(id, { status: "rejected" }); // Keep but could hard-delete here
  return NextResponse.json({ ok: true });
}
