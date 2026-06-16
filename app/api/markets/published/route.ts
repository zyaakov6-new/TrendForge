/**
 * GET /api/markets/published — public list of on-chain published markets.
 *
 * Returns only the fields a non-admin user needs to (a) browse markets and
 * (b) read their own on-chain positions:
 *   id, conditionId, questionId, yesTokenId, noTokenId, question, category,
 *   endDate, yesPrice, resolved, resolvedOutcome
 *
 * Anything moderation-related (submittedBy, rejectionReason, reviewedBy,
 * aiReasoning, etc.) is intentionally omitted.
 */

import { NextResponse } from "next/server";
import * as store from "@/lib/pending-store";

export interface PublicMarket {
  id:               string;
  conditionId:      string;
  questionId?:      string;
  yesTokenId?:      string;
  noTokenId?:       string;
  question:         string;
  category:         string;
  endDate:          string;
  yesPrice:         number;
  resolved?:        boolean;
  resolvedOutcome?: "YES" | "NO";
}

export async function GET() {
  const all = await store.getAll({ status: "published" });

  const markets: PublicMarket[] = all
    .filter(m => !!m.conditionId)
    .map(m => ({
      id:              m.id,
      conditionId:     m.conditionId!,
      questionId:      m.questionId,
      yesTokenId:      m.yesTokenId,
      noTokenId:       m.noTokenId,
      question:        m.question,
      category:        m.category,
      endDate:         m.endDate,
      yesPrice:        m.yesPrice,
      resolved:        m.resolved,
      resolvedOutcome: m.resolvedOutcome,
    }));

  return NextResponse.json({ markets });
}
