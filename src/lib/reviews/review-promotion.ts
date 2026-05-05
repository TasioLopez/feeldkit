import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/governance/audit";

/** Marker stored in `promoted_decisions.snapshot_before` when no alias row existed pre-approval. */
export const PROMOTED_ALIAS_ABSENT = { absent: true as const };

export type FieldAliasRowSnapshot = {
  id: string;
  field_value_id: string;
  field_type_id: string;
  alias: string;
  normalized_alias: string;
  locale: string | null;
  source: string | null;
  confidence: number;
  status: string;
  created_at: string;
  updated_at: string;
};

function isAbsentSnapshot(value: unknown): value is { absent: true } {
  return Boolean(value && typeof value === "object" && (value as { absent?: unknown }).absent === true);
}

export async function fetchAliasRowForReview(
  admin: SupabaseClient,
  fieldTypeId: string,
  normalizedAlias: string,
): Promise<FieldAliasRowSnapshot | null> {
  const { data, error } = await admin
    .from("field_aliases")
    .select(
      "id, field_value_id, field_type_id, alias, normalized_alias, locale, source, confidence, status, created_at, updated_at",
    )
    .eq("field_type_id", fieldTypeId)
    .eq("normalized_alias", normalizedAlias)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    field_value_id: row.field_value_id as string,
    field_type_id: row.field_type_id as string,
    alias: row.alias as string,
    normalized_alias: row.normalized_alias as string,
    locale: (row.locale as string | null) ?? null,
    source: (row.source as string | null) ?? null,
    confidence: Number(row.confidence ?? 0),
    status: row.status as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export type PromoteReviewAliasArgs = {
  admin: SupabaseClient;
  reviewId: string;
  organizationId: string;
  actorId: string;
  fieldTypeId: string;
  normalizedAlias: string;
  /** Captured before the alias upsert — required so undo can restore prior state. */
  snapshotBefore: FieldAliasRowSnapshot | typeof PROMOTED_ALIAS_ABSENT;
};

/**
 * After `mapping_reviews` is marked approved and `field_aliases` upserted, record audit + promoted_decision.
 */
export async function recordReviewAliasPromotion(args: PromoteReviewAliasArgs): Promise<void> {
  const { admin, reviewId, organizationId, actorId, fieldTypeId, normalizedAlias, snapshotBefore } = args;

  const afterLookup = await fetchAliasRowForReview(admin, fieldTypeId, normalizedAlias);
  const aliasId = afterLookup?.id;
  if (!aliasId) {
    return;
  }

  const auditId = await writeAudit({
    organizationId,
    actorId,
    action: "review.approve",
    entityType: "mapping_reviews",
    entityId: reviewId,
    before: snapshotBefore,
    after: afterLookup,
  });

  await admin.from("promoted_decisions").insert({
    source_kind: "review",
    source_id: reviewId,
    organization_id: organizationId,
    target_table: "field_aliases",
    target_id: aliasId,
    snapshot_before: snapshotBefore as unknown as Record<string, unknown>,
    snapshot_after: afterLookup as unknown as Record<string, unknown>,
    audit_log_id: auditId,
    created_by: actorId,
  });

  if (auditId) {
    await admin
      .from("mapping_reviews")
      .update({ decision_audit_id: auditId })
      .eq("id", reviewId)
      .eq("organization_id", organizationId);
  }
}

export type UndoPromotedReviewArgs = {
  admin: SupabaseClient;
  reviewId: string;
  organizationId: string;
  actorId: string;
};

export async function undoPromotedReviewDecision(args: UndoPromotedReviewArgs): Promise<{ ok: boolean; error?: string }> {
  const { admin, reviewId, organizationId, actorId } = args;

  const { data: promo, error: promoError } = await admin
    .from("promoted_decisions")
    .select("id, target_table, target_id, snapshot_before, organization_id, reverted_at")
    .eq("source_kind", "review")
    .eq("source_id", reviewId)
    .eq("organization_id", organizationId)
    .is("reverted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (promoError || !promo) {
    return { ok: false, error: "No revertible promotion found for this review." };
  }

  if ((promo.target_table as string) !== "field_aliases") {
    return { ok: false, error: "Unsupported promotion target." };
  }

  const targetId = promo.target_id as string;
  const snapshotBefore = promo.snapshot_before as unknown;

  if (isAbsentSnapshot(snapshotBefore)) {
    const { error: delErr } = await admin.from("field_aliases").delete().eq("id", targetId);
    if (delErr) {
      return { ok: false, error: delErr.message };
    }
  } else if (snapshotBefore && typeof snapshotBefore === "object") {
    const snap = snapshotBefore as Record<string, unknown>;
    const { error: updErr } = await admin
      .from("field_aliases")
      .update({
        field_value_id: snap.field_value_id,
        field_type_id: snap.field_type_id,
        alias: snap.alias,
        normalized_alias: snap.normalized_alias,
        locale: snap.locale ?? null,
        source: snap.source ?? null,
        confidence: snap.confidence ?? 0.9,
        status: snap.status ?? "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetId);
    if (updErr) {
      return { ok: false, error: updErr.message };
    }
  } else {
    return { ok: false, error: "Invalid promotion snapshot." };
  }

  const undoAuditId = await writeAudit({
    organizationId,
    actorId,
    action: "review.undo",
    entityType: "mapping_reviews",
    entityId: reviewId,
    before: { promotion_id: promo.id, target_id: targetId },
    after: { restored_snapshot: snapshotBefore },
  });

  const { error: resetErr } = await admin
    .from("mapping_reviews")
    .update({
      status: "pending",
      selected_value_id: null,
      reviewed_by: null,
      reviewed_at: null,
      notes: "Reverted via undo",
      decision_audit_id: undoAuditId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .eq("organization_id", organizationId);

  if (resetErr) {
    return { ok: false, error: resetErr.message };
  }

  await admin
    .from("promoted_decisions")
    .update({
      reverted_at: new Date().toISOString(),
      reverted_by: actorId,
    })
    .eq("id", promo.id as string);

  return { ok: true };
}
