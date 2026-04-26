/**
 * Moderation queue types for TrendForge.
 *
 * Flow: AI Generator → pending queue → admin review → on-chain publish
 */

import type { GeneratedMarket } from "./generated-market";

export type ModerationStatus = "pending" | "approved" | "rejected" | "published";

/**
 * A GeneratedMarket that has been submitted to the moderation queue.
 * Admin can edit any GeneratedMarket field before approving.
 */
export interface PendingMarket extends GeneratedMarket {
  /** Unique ID (crypto.randomUUID) */
  id: string;
  status: ModerationStatus;
  /** Original user-entered topic string */
  topic: string;
  /** ISO datetime of submission */
  submittedAt: string;
  /** Wallet address of the submitter (user who generated the market) */
  submittedBy?: string;
  /** ISO datetime of admin review */
  reviewedAt?: string;
  /** Wallet address of the admin who acted */
  reviewedBy?: string;
  /** Set when status = "rejected" */
  rejectionReason?: string;
  /** Set when status = "published" (after on-chain tx) */
  conditionId?: string;
  txHash?: string;
  clobMarketId?: string;
}

/**
 * Body accepted by PATCH /api/markets/pending/[id]
 * Partial — only fields that change need to be sent.
 */
export interface PendingMarketPatch {
  status?: ModerationStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  // On-chain publish result
  conditionId?: string;
  txHash?: string;
  clobMarketId?: string;
  // Editable AI fields
  question?: string;
  questionHe?: string | null;
  description?: string;
  resolutionCriteria?: string;
  endDate?: string;
  yesPrice?: number;
  suggestedLiquidityUSDC?: number;
  tags?: string[];
  outcomes?: string[];
}

export interface SubmitMarketBody {
  market: GeneratedMarket;
  topic: string;
  submittedBy?: string;
}
