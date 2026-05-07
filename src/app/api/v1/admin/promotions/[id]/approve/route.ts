import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { writeAudit } from "@/lib/governance/audit";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { applyPromotion } from "@/lib/promotion/engine";
import {
  getPromotionProposal,
  setProposalStatus,
} from "@/lib/promotion/repository";
import type { PromotionPayload, PromotionProposalRow } from "@/lib/promotion/types";
import { normalizeText } from "@/lib/matching/normalize-text";

const bodySchema = z
  .object({
    notes: z.string().optional(),
  })
  .optional();

/**
 * Curator approve: promotes a `pending_global` proposal to `approved_global`,
 * re-applying the change to the canonical/global table and writing audit +
 * `promoted_decisions` rows.
 *
 * Authorization: API key scope `admin:promotions`. The caller is treated as a
 * platform-level curator; org-scoped admins should not have this scope unless
 * explicitly granted.
 */
export const POST = createScopedHandler("admin:promotions", async (request) => {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const proposalId = segments[4];
  if (!proposalId || segments[5] !== "approve") {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const proposal = await getPromotionProposal(admin, proposalId);
  if (!proposal) {
    return NextResponse.json({ error: "proposal_not_found" }, { status: 404 });
  }
  if (proposal.status !== "pending_global") {
    return NextResponse.json(
      { error: "invalid_state", message: `Proposal status is ${proposal.status}; only pending_global can be approved.` },
      { status: 409 },
    );
  }

  const apiKeyId = request.headers.get("x-feeldkit-api-key-id");
  const curatorId = apiKeyId ?? null;

  const payload = decodePayload(proposal.targetTable, proposal.payload);
  if (!payload) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const apply = await applyPromotion({
    admin,
    scope: "global",
    organizationId: proposal.organizationId,
    actorId: curatorId,
    payload,
  });
  if (!apply.ok || !apply.targetId) {
    return NextResponse.json({ error: apply.error ?? "apply_failed" }, { status: 500 });
  }

  const auditId = await writeAudit({
    organizationId: proposal.organizationId,
    actorId: curatorId,
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
    created_by: curatorId,
  });

  const aliasResult = await maybePromoteGlobalAliasForEnrichmentValue({
    admin,
    proposal,
    globalValueId: apply.targetId,
    actorId: curatorId,
    auditLogId: auditId,
  });
  if (!aliasResult.ok) {
    return NextResponse.json({ error: aliasResult.error ?? "alias_apply_failed" }, { status: 500 });
  }

  await setProposalStatus(admin, {
    proposalId: proposal.id,
    status: "approved_global",
    curatorId,
    curatorNotes: parsed.data?.notes ?? null,
    auditLogId: auditId,
  });

  return NextResponse.json({ ok: true, target_id: apply.targetId, resolved_table: apply.resolvedTable });
});

function decodePayload(
  targetTable: PromotionPayload["target"],
  payload: Record<string, unknown>,
): PromotionPayload | null {
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

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

async function maybePromoteGlobalAliasForEnrichmentValue(args: {
  admin: ReturnType<typeof getSupabaseServiceClient>;
  proposal: PromotionProposalRow;
  globalValueId: string;
  actorId: string | null;
  auditLogId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { admin, proposal } = args;
  if (!admin || proposal.sourceKind !== "enrichment_proposal" || proposal.targetTable !== "field_values") {
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
