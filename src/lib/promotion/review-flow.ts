import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/governance/audit";
import { applyPromotion } from "@/lib/promotion/engine";
import {
  createPromotionProposal,
  deriveProposalStatusFromScope,
  getOrgPromotionSettings,
} from "@/lib/promotion/repository";
import type {
  PromotionApplyResult,
  PromotionPayload,
  PromotionScope,
  PromotionSourceKind,
  PromotionTargetTable,
} from "@/lib/promotion/types";

export type PromoteReviewArgs = {
  admin: SupabaseClient;
  sourceKind: PromotionSourceKind;
  sourceId: string;
  organizationId: string;
  actorId: string;
  payload: PromotionPayload;
  /** Optional override; default reads from `org_promotion_settings`. */
  scopeOverride?: PromotionScope;
};

export type PromoteReviewOutcome = {
  ok: boolean;
  error?: string;
  scope: PromotionScope;
  apply?: PromotionApplyResult;
  auditLogId: string | null;
  proposalId: string | null;
  pendingGlobal: boolean;
};

/**
 * High-level "promote this approval" flow used by the review/proposal actions.
 *
 *   1. Resolve scope from `org_promotion_settings` (or override).
 *   2. Apply the change via `applyPromotion` (org-scoped or global table).
 *   3. Write `audit_logs` (review.approve / enrichment_proposal.approve).
 *   4. Insert `promotion_proposals` row reflecting the resulting state.
 *   5. Insert `promoted_decisions` ledger row so the existing undo path works.
 *
 * If scope='org' and the org permits global propose (default: true), an
 * additional `pending_global` proposal row is written so a platform admin can
 * later curate it (Wave 2).
 */
export async function promoteReviewApproval(args: PromoteReviewArgs): Promise<PromoteReviewOutcome> {
  const settings = await getOrgPromotionSettings(args.admin, args.organizationId);

  const scope: PromotionScope =
    args.scopeOverride ?? (settings.defaultScope === "global" && !settings.optOutGlobalPropose ? "global" : "org");

  const apply = await applyPromotion({
    admin: args.admin,
    scope,
    organizationId: args.organizationId,
    actorId: args.actorId,
    payload: args.payload,
  });
  if (!apply.ok || !apply.targetId) {
    return {
      ok: false,
      error: apply.error ?? "promotion_apply_failed",
      scope,
      apply,
      auditLogId: null,
      proposalId: null,
      pendingGlobal: false,
    };
  }

  const action =
    args.sourceKind === "review"
      ? scope === "global"
        ? "review.approve.global"
        : "review.approve.org"
      : scope === "global"
        ? "enrichment_proposal.approve.global"
        : "enrichment_proposal.approve.org";

  const entityType = args.sourceKind === "review" ? "mapping_reviews" : "enrichment_proposals";

  const auditLogId = await writeAudit({
    organizationId: args.organizationId,
    actorId: args.actorId,
    action,
    entityType,
    entityId: args.sourceId,
    before: apply.snapshotBefore,
    after: apply.snapshotAfter ?? null,
  });

  const targetTable: PromotionTargetTable = args.payload.target;
  const proposal = await createPromotionProposal(args.admin, {
    sourceKind: args.sourceKind,
    sourceId: args.sourceId,
    organizationId: args.organizationId,
    targetTable,
    payload: serializePayload(args.payload, apply.targetId, apply.resolvedTable),
    status: deriveProposalStatusFromScope(scope),
    auditLogId,
    actorId: args.actorId,
  });

  await args.admin.from("promoted_decisions").insert({
    source_kind: args.sourceKind,
    source_id: args.sourceId,
    organization_id: args.organizationId,
    target_table: apply.resolvedTable,
    target_id: apply.targetId,
    snapshot_before: apply.snapshotBefore as Record<string, unknown>,
    snapshot_after: (apply.snapshotAfter ?? {}) as Record<string, unknown>,
    audit_log_id: auditLogId,
    created_by: args.actorId,
  });

  if (entityType === "mapping_reviews" && auditLogId) {
    await args.admin
      .from("mapping_reviews")
      .update({ decision_audit_id: auditLogId })
      .eq("id", args.sourceId)
      .eq("organization_id", args.organizationId);
  }

  let pendingGlobal = false;
  if (scope === "org" && !settings.optOutGlobalPropose) {
    await createPromotionProposal(args.admin, {
      sourceKind: args.sourceKind,
      sourceId: args.sourceId,
      organizationId: args.organizationId,
      targetTable,
      payload: serializePayload(args.payload, null, targetTable),
      status: "pending_global",
      auditLogId,
      actorId: args.actorId,
    });
    pendingGlobal = true;
  }

  return {
    ok: true,
    scope,
    apply,
    auditLogId,
    proposalId: proposal?.id ?? null,
    pendingGlobal,
  };
}

function serializePayload(
  payload: PromotionPayload,
  targetId: string | null,
  resolvedTable: string,
): Record<string, unknown> {
  return {
    ...(payload as unknown as Record<string, unknown>),
    target_id: targetId,
    resolved_table: resolvedTable,
  };
}
