import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ABSENT_SNAPSHOT,
  isAbsentSnapshot,
  resolveOrgTable,
  type PromotionApplyResult,
  type PromotionPayload,
  type PromotionResolvedTargetTable,
  type PromotionScope,
} from "@/lib/promotion/types";

export type ApplyPromotionArgs = {
  admin: SupabaseClient;
  scope: PromotionScope;
  organizationId: string;
  actorId: string | null;
  payload: PromotionPayload;
};

/**
 * Apply a promotion to either the org-scoped table (`org_field_*`) or the
 * canonical/global table (`field_*`). Captures `snapshotBefore` so undo can
 * restore prior state.
 */
export async function applyPromotion(args: ApplyPromotionArgs): Promise<PromotionApplyResult> {
  const { payload, scope } = args;
  const resolvedTable: PromotionResolvedTargetTable =
    scope === "org" ? resolveOrgTable(payload.target) : payload.target;

  if (payload.target === "field_aliases") {
    return scope === "org"
      ? upsertOrgAlias(args, resolvedTable)
      : upsertGlobalAlias(args, resolvedTable);
  }
  if (payload.target === "field_values") {
    return scope === "org"
      ? upsertOrgValue(args, resolvedTable)
      : upsertGlobalValue(args, resolvedTable);
  }
  return scope === "org"
    ? upsertOrgCrosswalk(args, resolvedTable)
    : upsertGlobalCrosswalk(args, resolvedTable);
}

async function upsertOrgAlias(
  args: ApplyPromotionArgs,
  resolvedTable: PromotionResolvedTargetTable,
): Promise<PromotionApplyResult> {
  const payload = args.payload as Extract<PromotionPayload, { target: "field_aliases" }>;
  const hasGlobalValue = Boolean(payload.fieldValueId);
  const hasOrgValue = Boolean(payload.orgFieldValueId);
  if (hasGlobalValue === hasOrgValue) {
    return {
      ok: false,
      scope: args.scope,
      resolvedTable,
      targetId: null,
      snapshotBefore: ABSENT_SNAPSHOT,
      snapshotAfter: null,
      error: "org_alias_requires_exactly_one_value_ref",
    };
  }
  const { data: before } = await args.admin
    .from("org_field_aliases")
    .select("id, field_value_id, org_field_value_id, field_type_id, alias, normalized_alias, locale, source, confidence, status, created_at, updated_at")
    .eq("organization_id", args.organizationId)
    .eq("field_type_id", payload.fieldTypeId)
    .eq("normalized_alias", payload.normalizedAlias)
    .maybeSingle();

  const snapshotBefore = before ? (before as Record<string, unknown>) : ABSENT_SNAPSHOT;

  const { data: after, error } = await args.admin
    .from("org_field_aliases")
    .upsert(
      {
        organization_id: args.organizationId,
        field_type_id: payload.fieldTypeId,
        field_value_id: payload.fieldValueId ?? null,
        org_field_value_id: payload.orgFieldValueId ?? null,
        alias: payload.alias,
        normalized_alias: payload.normalizedAlias,
        locale: payload.locale ?? null,
        source: payload.source ?? "review_approval",
        confidence: payload.confidence ?? 0.95,
        status: "active",
        updated_at: new Date().toISOString(),
        created_by: args.actorId,
      },
      { onConflict: "organization_id,field_type_id,normalized_alias" },
    )
    .select("id")
    .single();

  if (error || !after?.id) {
    return {
      ok: false,
      scope: args.scope,
      resolvedTable,
      targetId: null,
      snapshotBefore,
      snapshotAfter: null,
      error: error?.message ?? "upsert_failed",
    };
  }

  return {
    ok: true,
    scope: args.scope,
    resolvedTable,
    targetId: after.id as string,
    snapshotBefore,
    snapshotAfter: { id: after.id, ...payload },
  };
}

async function upsertGlobalAlias(
  args: ApplyPromotionArgs,
  resolvedTable: PromotionResolvedTargetTable,
): Promise<PromotionApplyResult> {
  const payload = args.payload as Extract<PromotionPayload, { target: "field_aliases" }>;
  if (!payload.fieldValueId) {
    return {
      ok: false,
      scope: args.scope,
      resolvedTable,
      targetId: null,
      snapshotBefore: ABSENT_SNAPSHOT,
      snapshotAfter: null,
      error: "global_alias_requires_field_value_id",
    };
  }
  const { data: before } = await args.admin
    .from("field_aliases")
    .select("id, field_value_id, field_type_id, alias, normalized_alias, locale, source, confidence, status, created_at, updated_at")
    .eq("field_type_id", payload.fieldTypeId)
    .eq("normalized_alias", payload.normalizedAlias)
    .maybeSingle();

  const snapshotBefore = before ? (before as Record<string, unknown>) : ABSENT_SNAPSHOT;

  const { error } = await args.admin.from("field_aliases").upsert(
    {
      field_value_id: payload.fieldValueId,
      field_type_id: payload.fieldTypeId,
      alias: payload.alias,
      normalized_alias: payload.normalizedAlias,
      locale: payload.locale ?? null,
      source: payload.source ?? "review_approval",
      confidence: payload.confidence ?? 0.95,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "field_type_id,normalized_alias" },
  );

  if (error) {
    return {
      ok: false,
      scope: args.scope,
      resolvedTable,
      targetId: null,
      snapshotBefore,
      snapshotAfter: null,
      error: error.message,
    };
  }

  const { data: after } = await args.admin
    .from("field_aliases")
    .select("id, field_value_id, field_type_id, alias, normalized_alias, locale, source, confidence, status, created_at, updated_at")
    .eq("field_type_id", payload.fieldTypeId)
    .eq("normalized_alias", payload.normalizedAlias)
    .maybeSingle();

  return {
    ok: true,
    scope: args.scope,
    resolvedTable,
    targetId: (after?.id as string) ?? null,
    snapshotBefore,
    snapshotAfter: (after as Record<string, unknown> | null) ?? null,
  };
}

async function upsertOrgValue(
  args: ApplyPromotionArgs,
  resolvedTable: PromotionResolvedTargetTable,
): Promise<PromotionApplyResult> {
  const payload = args.payload as Extract<PromotionPayload, { target: "field_values" }>;
  const { data: before } = await args.admin
    .from("org_field_values")
    .select("id, field_type_id, key, label, normalized_label, locale, description, status, metadata, source, created_at, updated_at")
    .eq("organization_id", args.organizationId)
    .eq("field_type_id", payload.fieldTypeId)
    .eq("key", payload.key)
    .maybeSingle();

  const snapshotBefore = before ? (before as Record<string, unknown>) : ABSENT_SNAPSHOT;

  const { data: after, error } = await args.admin
    .from("org_field_values")
    .upsert(
      {
        organization_id: args.organizationId,
        field_type_id: payload.fieldTypeId,
        key: payload.key,
        label: payload.label,
        normalized_label: payload.normalizedLabel,
        locale: payload.locale ?? null,
        description: payload.description ?? null,
        status: "active",
        metadata: payload.metadata ?? {},
        source: payload.source ?? "ai_proposal",
        updated_at: new Date().toISOString(),
        created_by: args.actorId,
      },
      { onConflict: "organization_id,field_type_id,key" },
    )
    .select("id")
    .single();

  if (error || !after?.id) {
    return {
      ok: false,
      scope: args.scope,
      resolvedTable,
      targetId: null,
      snapshotBefore,
      snapshotAfter: null,
      error: error?.message ?? "upsert_failed",
    };
  }

  return {
    ok: true,
    scope: args.scope,
    resolvedTable,
    targetId: after.id as string,
    snapshotBefore,
    snapshotAfter: { id: after.id, ...payload },
  };
}

async function upsertGlobalValue(
  args: ApplyPromotionArgs,
  resolvedTable: PromotionResolvedTargetTable,
): Promise<PromotionApplyResult> {
  const payload = args.payload as Extract<PromotionPayload, { target: "field_values" }>;
  const { data: before } = await args.admin
    .from("field_values")
    .select("id, field_type_id, key, label, normalized_label, locale, description, status, metadata, source, created_at, updated_at")
    .eq("field_type_id", payload.fieldTypeId)
    .eq("key", payload.key)
    .maybeSingle();

  const snapshotBefore = before ? (before as Record<string, unknown>) : ABSENT_SNAPSHOT;

  const { data: after, error } = await args.admin
    .from("field_values")
    .upsert(
      {
        field_type_id: payload.fieldTypeId,
        key: payload.key,
        label: payload.label,
        normalized_label: payload.normalizedLabel,
        locale: payload.locale ?? null,
        description: payload.description ?? null,
        sort_order: 0,
        status: "active",
        metadata: payload.metadata ?? {},
        source: payload.source ?? "ai_proposal",
      },
      { onConflict: "field_type_id,key" },
    )
    .select("id")
    .single();

  if (error || !after?.id) {
    return {
      ok: false,
      scope: args.scope,
      resolvedTable,
      targetId: null,
      snapshotBefore,
      snapshotAfter: null,
      error: error?.message ?? "upsert_failed",
    };
  }

  return {
    ok: true,
    scope: args.scope,
    resolvedTable,
    targetId: after.id as string,
    snapshotBefore,
    snapshotAfter: { id: after.id, ...payload },
  };
}

async function upsertOrgCrosswalk(
  args: ApplyPromotionArgs,
  resolvedTable: PromotionResolvedTargetTable,
): Promise<PromotionApplyResult> {
  const payload = args.payload as Extract<PromotionPayload, { target: "field_crosswalks" }>;
  const { data: before } = await args.admin
    .from("org_field_crosswalks")
    .select("id, from_field_type_id, from_value_id, to_field_type_id, to_value_id, crosswalk_type, confidence, source, metadata, created_at, updated_at")
    .eq("organization_id", args.organizationId)
    .eq("from_value_id", payload.fromValueId)
    .eq("to_value_id", payload.toValueId)
    .eq("crosswalk_type", payload.crosswalkType)
    .maybeSingle();

  const snapshotBefore = before ? (before as Record<string, unknown>) : ABSENT_SNAPSHOT;

  const { data: after, error } = await args.admin
    .from("org_field_crosswalks")
    .upsert(
      {
        organization_id: args.organizationId,
        from_field_type_id: payload.fromFieldTypeId,
        from_value_id: payload.fromValueId,
        to_field_type_id: payload.toFieldTypeId,
        to_value_id: payload.toValueId,
        crosswalk_type: payload.crosswalkType,
        confidence: payload.confidence ?? 0.85,
        source: payload.source ?? "review_approval",
        metadata: payload.metadata ?? {},
        updated_at: new Date().toISOString(),
        created_by: args.actorId,
      },
      { onConflict: "organization_id,from_value_id,to_value_id,crosswalk_type" },
    )
    .select("id")
    .single();

  if (error || !after?.id) {
    return {
      ok: false,
      scope: args.scope,
      resolvedTable,
      targetId: null,
      snapshotBefore,
      snapshotAfter: null,
      error: error?.message ?? "upsert_failed",
    };
  }

  return {
    ok: true,
    scope: args.scope,
    resolvedTable,
    targetId: after.id as string,
    snapshotBefore,
    snapshotAfter: { id: after.id, ...payload },
  };
}

async function upsertGlobalCrosswalk(
  args: ApplyPromotionArgs,
  resolvedTable: PromotionResolvedTargetTable,
): Promise<PromotionApplyResult> {
  const payload = args.payload as Extract<PromotionPayload, { target: "field_crosswalks" }>;
  const { data: before } = await args.admin
    .from("field_crosswalks")
    .select("id, from_field_type_id, from_value_id, to_field_type_id, to_value_id, crosswalk_type, confidence, source, metadata, created_at, updated_at")
    .eq("from_value_id", payload.fromValueId)
    .eq("to_value_id", payload.toValueId)
    .eq("crosswalk_type", payload.crosswalkType)
    .maybeSingle();

  const snapshotBefore = before ? (before as Record<string, unknown>) : ABSENT_SNAPSHOT;

  const { data: after, error } = await args.admin
    .from("field_crosswalks")
    .upsert(
      {
        from_field_type_id: payload.fromFieldTypeId,
        from_value_id: payload.fromValueId,
        to_field_type_id: payload.toFieldTypeId,
        to_value_id: payload.toValueId,
        crosswalk_type: payload.crosswalkType,
        confidence: payload.confidence ?? 0.85,
        source: payload.source ?? "review_approval",
        metadata: payload.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "from_value_id,to_value_id,crosswalk_type" },
    )
    .select("id")
    .single();

  if (error || !after?.id) {
    return {
      ok: false,
      scope: args.scope,
      resolvedTable,
      targetId: null,
      snapshotBefore,
      snapshotAfter: null,
      error: error?.message ?? "upsert_failed",
    };
  }

  return {
    ok: true,
    scope: args.scope,
    resolvedTable,
    targetId: after.id as string,
    snapshotBefore,
    snapshotAfter: { id: after.id, ...payload },
  };
}

/**
 * Reverse a promotion using its `snapshot_before` and the resolved table the
 * promotion landed in (org or global). Used by review/proposal undo flows.
 */
export async function revertPromotion(args: {
  admin: SupabaseClient;
  resolvedTable: PromotionResolvedTargetTable;
  targetId: string;
  snapshotBefore: unknown;
}): Promise<{ ok: boolean; error?: string }> {
  const { admin, resolvedTable, targetId, snapshotBefore } = args;
  if (isAbsentSnapshot(snapshotBefore)) {
    const { error } = await admin.from(resolvedTable).delete().eq("id", targetId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  if (!snapshotBefore || typeof snapshotBefore !== "object") {
    return { ok: false, error: "Invalid snapshot_before payload." };
  }
  const snap = snapshotBefore as Record<string, unknown>;
  const update: Record<string, unknown> = { ...snap };
  delete update.id;
  delete update.created_at;
  update.updated_at = new Date().toISOString();
  const { error } = await admin.from(resolvedTable).update(update).eq("id", targetId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
