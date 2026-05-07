"use server";

import { revalidatePath } from "next/cache";
import {
  assertPlatformAdminRole,
  getAdminActorContext,
} from "@/lib/auth/admin-context";
import { writeAudit } from "@/lib/governance/audit";
import { applyPromotion } from "@/lib/promotion/engine";
import { getPromotionProposal, setProposalStatus } from "@/lib/promotion/repository";
import type { PromotionPayload, PromotionProposalRow } from "@/lib/promotion/types";
import { normalizeText } from "@/lib/matching/normalize-text";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

function decodePayload(targetTable: string, payload: Record<string, unknown>): PromotionPayload | null {
  if (targetTable === "field_aliases") {
    if (!isString(payload.fieldTypeId) || !isString(payload.fieldValueId) || !isString(payload.alias) || !isString(payload.normalizedAlias)) {
      return null;
    }
    return {
      target: "field_aliases",
      fieldTypeId: payload.fieldTypeId,
      fieldValueId: payload.fieldValueId,
      alias: payload.alias,
      normalizedAlias: payload.normalizedAlias,
      locale: (payload.locale as string | null | undefined) ?? null,
      source: (payload.source as string | null | undefined) ?? "curator_approved",
      confidence: typeof payload.confidence === "number" ? payload.confidence : 0.95,
    };
  }
  if (targetTable === "field_values") {
    if (!isString(payload.fieldTypeId) || !isString(payload.key) || !isString(payload.label) || !isString(payload.normalizedLabel)) {
      return null;
    }
    return {
      target: "field_values",
      fieldTypeId: payload.fieldTypeId,
      key: payload.key,
      label: payload.label,
      normalizedLabel: payload.normalizedLabel,
      locale: (payload.locale as string | null | undefined) ?? null,
      description: (payload.description as string | null | undefined) ?? null,
      source: (payload.source as string | null | undefined) ?? "curator_approved",
      metadata: (payload.metadata as Record<string, unknown> | undefined) ?? {},
    };
  }
  if (targetTable === "field_crosswalks") {
    if (
      !isString(payload.fromFieldTypeId) ||
      !isString(payload.fromValueId) ||
      !isString(payload.toFieldTypeId) ||
      !isString(payload.toValueId) ||
      !isString(payload.crosswalkType)
    ) {
      return null;
    }
    return {
      target: "field_crosswalks",
      fromFieldTypeId: payload.fromFieldTypeId,
      fromValueId: payload.fromValueId,
      toFieldTypeId: payload.toFieldTypeId,
      toValueId: payload.toValueId,
      crosswalkType: payload.crosswalkType,
      confidence: typeof payload.confidence === "number" ? payload.confidence : 0.85,
      source: (payload.source as string | null | undefined) ?? "curator_approved",
      metadata: (payload.metadata as Record<string, unknown> | undefined) ?? {},
    };
  }
  return null;
}

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export async function approvePromotionProposalAction(formData: FormData): Promise<void> {
  const proposalId = String(formData.get("proposal_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  if (!proposalId) return;

  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertPlatformAdminRole(actor.role, "approve global promotion");
  } catch {
    return;
  }
  const admin = getSupabaseServiceClient();
  if (!admin) return;

  const proposal = await getPromotionProposal(admin, proposalId);
  if (!proposal || proposal.status !== "pending_global") return;

  const payload = decodePayload(proposal.targetTable, proposal.payload);
  if (!payload) return;

  const apply = await applyPromotion({
    admin,
    scope: "global",
    organizationId: proposal.organizationId,
    actorId: actor.userId,
    payload,
  });
  if (!apply.ok || !apply.targetId) return;

  const auditId = await writeAudit({
    organizationId: proposal.organizationId,
    actorId: actor.userId,
    action: "promotion.approve_global",
    entityType: "promotion_proposals",
    entityId: proposal.id,
    before: { status: proposal.status },
    after: { status: "approved_global", target_id: apply.targetId, resolved_table: apply.resolvedTable },
  });

  await admin.from("promoted_decisions").insert({
    source_kind: proposal.sourceKind,
    source_id: proposal.sourceId,
    organization_id: proposal.organizationId,
    target_table: apply.resolvedTable,
    target_id: apply.targetId,
    snapshot_before: apply.snapshotBefore as Record<string, unknown>,
    snapshot_after: (apply.snapshotAfter ?? {}) as Record<string, unknown>,
    audit_log_id: auditId,
    created_by: actor.userId,
  });

  const aliasResult = await maybePromoteGlobalAliasForEnrichmentValue({
    admin,
    proposal,
    globalValueId: apply.targetId,
    actorId: actor.userId,
    auditLogId: auditId,
  });
  if (!aliasResult.ok) return;

  await setProposalStatus(admin, {
    proposalId: proposal.id,
    status: "approved_global",
    curatorId: actor.userId,
    curatorNotes: notes ?? null,
    auditLogId: auditId,
  });

  revalidatePath("/dashboard/promotions");
  revalidatePath("/dashboard/promotions/registry");
}

export async function rejectPromotionProposalAction(formData: FormData): Promise<void> {
  const proposalId = String(formData.get("proposal_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  if (!proposalId) return;

  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertPlatformAdminRole(actor.role, "reject global promotion");
  } catch {
    return;
  }
  const admin = getSupabaseServiceClient();
  if (!admin) return;

  const proposal = await getPromotionProposal(admin, proposalId);
  if (!proposal || proposal.status !== "pending_global") return;

  const auditId = await writeAudit({
    organizationId: proposal.organizationId,
    actorId: actor.userId,
    action: "promotion.reject_global",
    entityType: "promotion_proposals",
    entityId: proposal.id,
    before: { status: proposal.status },
    after: { status: "rejected", reason: reason ?? null },
  });

  await setProposalStatus(admin, {
    proposalId: proposal.id,
    status: "rejected",
    curatorId: actor.userId,
    curatorNotes: reason ?? null,
    auditLogId: auditId,
  });

  revalidatePath("/dashboard/promotions");
}

async function maybePromoteGlobalAliasForEnrichmentValue(args: {
  admin: NonNullable<ReturnType<typeof getSupabaseServiceClient>>;
  proposal: PromotionProposalRow;
  globalValueId: string;
  actorId: string;
  auditLogId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { admin, proposal } = args;
  if (proposal.sourceKind !== "enrichment_proposal" || proposal.targetTable !== "field_values") {
    return { ok: true };
  }

  const { data: sourceProposal, error: sourceErr } = await admin
    .from("enrichment_proposals")
    .select("field_type_id, source_input")
    .eq("id", proposal.sourceId)
    .eq("organization_id", proposal.organizationId)
    .maybeSingle();
  if (sourceErr || !sourceProposal?.source_input || !sourceProposal?.field_type_id) {
    return { ok: false, error: sourceErr?.message ?? "enrichment_source_not_found" };
  }

  const aliasApply = await applyPromotion({
    admin,
    scope: "global",
    organizationId: proposal.organizationId,
    actorId: args.actorId,
    payload: {
      target: "field_aliases",
      fieldTypeId: sourceProposal.field_type_id as string,
      fieldValueId: args.globalValueId,
      alias: sourceProposal.source_input as string,
      normalizedAlias: normalizeText(sourceProposal.source_input as string),
      source: "curator_approved_ai_alias",
      confidence: 0.9,
    },
  });
  if (!aliasApply.ok || !aliasApply.targetId) {
    return { ok: false, error: aliasApply.error ?? "alias_apply_failed" };
  }

  await admin.from("promoted_decisions").insert({
    source_kind: proposal.sourceKind,
    source_id: proposal.sourceId,
    organization_id: proposal.organizationId,
    target_table: aliasApply.resolvedTable,
    target_id: aliasApply.targetId,
    snapshot_before: aliasApply.snapshotBefore as Record<string, unknown>,
    snapshot_after: (aliasApply.snapshotAfter ?? {}) as Record<string, unknown>,
    audit_log_id: args.auditLogId,
    created_by: args.actorId,
  });

  return { ok: true };
}
