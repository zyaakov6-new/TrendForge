/**
 * GET  /api/clob/orders?conditionId=xxx&side=YES  — best available maker order
 * POST /api/clob/orders                            — admin stores a signed order
 */

import { NextRequest, NextResponse } from "next/server";
import * as orderStore from "@/lib/order-store";
import type { StoredOrder } from "@/lib/order-store";

function isAdmin(req: NextRequest): boolean {
  const wallet = req.headers.get("x-admin-wallet") ?? "";
  const admin  = process.env.ADMIN_WALLET ?? "";
  if (!admin) return false;
  return wallet.toLowerCase() === admin.toLowerCase();
}

export async function GET(req: NextRequest) {
  const conditionId = req.nextUrl.searchParams.get("conditionId");
  const side        = req.nextUrl.searchParams.get("side") as "YES" | "NO" | null;

  if (!conditionId || (side !== "YES" && side !== "NO")) {
    return NextResponse.json(
      { error: "conditionId and side (YES|NO) are required" },
      { status: 400 }
    );
  }

  const order = await orderStore.getBestOrder(conditionId, side);

  if (!order) {
    return NextResponse.json({ order: null }, { status: 200 });
  }

  return NextResponse.json({ order });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: StoredOrder;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.conditionId || !body.outcomeSide || !body.signature) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await orderStore.addOrder(body);
  return NextResponse.json({ ok: true });
}
