import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OrgPromotionSettings,
  PromotionProposalRow,
  PromotionProposalStatus,
  PromotionScope,
  PromotionSourceKind,
  PromotionTargetTable,
} from "@/lib/promotion/types";

const SETTINGS_COLS =
  "organization_id, opt_out_global_propose, default_scope, notes, updated_at, updated_by";

const PROPOSAL_COLS =
  "id, source_kind, source_id, organization_id, target_table, payload, status, audit_log_id, curator_id, curator_decision_at, curator_notes, superseded_by, created_at, created_by";

function mapSettings(row: Record<string, unknown> | null): OrgPromotionSettings | null {
  if (!row) return null;
  const scope = (row.default_scope as string) === "global" ? "global" : "org";
  return {
    organizationId: row.organization_id as string,
    optOutGlobalPropose: Boolean(row.opt_out_global_propose),
    defaultScope: scope,
    notes: (row.notes as string | null) ?? null,
    updatedAt: (row.updated_at as string) ?? new Date(0).toISOString(),
    updatedBy: (row.updated_by as string | null) ?? null,
  };
}

function mapProposal(row: Record<string, unknown>): PromotionProposalRow {
  return {
    id: row.id as string,
    sourceKind: row.source_kind as PromotionSourceKind,
    sourceId: row.source_id as string,
    organizationId: row.organization_id as string,
    targetTable: row.target_table as PromotionTargetTable,
    payload: (row.payload as Record<string, unknown>) ?? {},
    status: row.status as PromotionProposalStatus,
    auditLogId: (row.audit_log_id as string | null) ?? null,
    curatorId: (row.curator_id as string | null) ?? null,
    curatorDecisionAt: (row.curator_decision_at as string | null) ?? null,
    curatorNotes: (row.curator_notes as string | null) ?? null,
    supersededBy: (row.superseded_by as string | null) ?? null,
    createdAt: (row.created_at as string) ?? new Date(0).toISOString(),
    createdBy: (row.created_by as string | null) ?? null,
  };
}

export const DEFAULT_PROMOTION_SETTINGS: OrgPromotionSettings = {
  organizationId: "",
  optOutGlobalPropose: false,
  defaultScope: "org",
  notes: null,
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
};

export async function getOrgPromotionSettings(
  admin: SupabaseClient,
  organizationId: string,
): Promise<OrgPromotionSettings> {
  const { data } = await admin
    .from("org_promotion_settings")
    .select(SETTINGS_COLS)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (
    mapSettings(data as Record<string, unknown> | null) ?? {
      ...DEFAULT_PROMOTION_SETTINGS,
      organizationId,
    }
  );
}

export async function upsertOrgPromotionSettings(
  admin: SupabaseClient,
  args: {
    organizationId: string;
    optOutGlobalPropose: boolean;
    defaultScope: PromotionScope;
    notes?: string | null;
    actorId: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin.from("org_promotion_settings").upsert(
    {
      organization_id: args.organizationId,
      opt_out_global_propose: args.optOutGlobalPropose,
      default_scope: args.defaultScope,
      notes: args.notes ?? null,
      updated_at: new Date().toISOString(),
      updated_by: args.actorId,
    },
    { onConflict: "organization_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Decide what proposal status fits the org's settings + scope used by the engine.
 *  - org-scope writes always start as `approved_org`.
 *  - global-scope writes for orgs with default_scope=global start as
 *    `approved_global` (the engine wrote directly to global tables).
 *  - if default_scope=global but opt_out_global_propose=true, scope is forced
 *    back to `org`; callers should respect this before calling applyPromotion.
 */
export function deriveProposalStatusFromScope(scope: PromotionScope): PromotionProposalStatus {
  return scope === "global" ? "approved_global" : "approved_org";
}

export async function createPromotionProposal(
  admin: SupabaseClient,
  args: {
    sourceKind: PromotionSourceKind;
    sourceId: string;
    organizationId: string;
    targetTable: PromotionTargetTable;
    payload: Record<string, unknown>;
    status: PromotionProposalStatus;
    auditLogId?: string | null;
    actorId: string | null;
  },
): Promise<PromotionProposalRow | null> {
  const { data, error } = await admin
    .from("promotion_proposals")
    .insert({
      source_kind: args.sourceKind,
      source_id: args.sourceId,
      organization_id: args.organizationId,
      target_table: args.targetTable,
      payload: args.payload,
      status: args.status,
      audit_log_id: args.auditLogId ?? null,
      created_by: args.actorId,
    })
    .select(PROPOSAL_COLS)
    .single();
  if (error || !data) return null;
  return mapProposal(data as Record<string, unknown>);
}

export async function listPromotionProposals(
  admin: SupabaseClient,
  filters: {
    organizationId?: string | null;
    status?: PromotionProposalStatus[];
    targetTable?: PromotionTargetTable;
    sourceKind?: PromotionSourceKind;
    limit?: number;
  } = {},
): Promise<PromotionProposalRow[]> {
  let q = admin
    .from("promotion_proposals")
    .select(PROPOSAL_COLS)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(filters.limit ?? 100, 1), 500));
  if (filters.organizationId) q = q.eq("organization_id", filters.organizationId);
  if (filters.status && filters.status.length > 0) q = q.in("status", filters.status);
  if (filters.targetTable) q = q.eq("target_table", filters.targetTable);
  if (filters.sourceKind) q = q.eq("source_kind", filters.sourceKind);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((row) => mapProposal(row as Record<string, unknown>));
}

export async function getPromotionProposal(
  admin: SupabaseClient,
  proposalId: string,
): Promise<PromotionProposalRow | null> {
  const { data } = await admin
    .from("promotion_proposals")
    .select(PROPOSAL_COLS)
    .eq("id", proposalId)
    .maybeSingle();
  if (!data) return null;
  return mapProposal(data as Record<string, unknown>);
}

export async function setProposalStatus(
  admin: SupabaseClient,
  args: {
    proposalId: string;
    status: PromotionProposalStatus;
    curatorId?: string | null;
    curatorNotes?: string | null;
    auditLogId?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const update: Record<string, unknown> = {
    status: args.status,
  };
  if (args.curatorId !== undefined) update.curator_id = args.curatorId;
  if (args.curatorNotes !== undefined) update.curator_notes = args.curatorNotes;
  if (args.auditLogId !== undefined) update.audit_log_id = args.auditLogId;
  if (args.status === "approved_global" || args.status === "rejected") {
    update.curator_decision_at = new Date().toISOString();
  }
  const { error } = await admin.from("promotion_proposals").update(update).eq("id", args.proposalId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markProposalSuperseded(
  admin: SupabaseClient,
  args: { proposalId: string; supersededBy: string },
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin
    .from("promotion_proposals")
    .update({ status: "superseded", superseded_by: args.supersededBy })
    .eq("id", args.proposalId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
