import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type AuditAction =
  | "review.approve"
  | "review.reject"
  | "review.undo"
  | "policy.update"
  | "policy.delete"
  | "field_lock.update"
  | "flow_override.create"
  | "flow_override.update"
  | "flow_override.delete"
  | "flow.retire"
  | "flow.rollback"
  | (string & {});

export type AuditEntityType =
  | "mapping_reviews"
  | "promoted_decisions"
  | "org_policy_overrides"
  | "org_field_locks"
  | "flow_pack_overrides"
  | "flow_pack_versions"
  | "flow_packs"
  | (string & {});

export type WriteAuditArgs = {
  organizationId: string | null;
  actorId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  before?: unknown;
  after?: unknown;
};

/**
 * Append a row to `audit_logs` and return its id so callers can link it onto
 * the affected entity (e.g. mapping_reviews.decision_audit_id).
 *
 * Returns null if the service-role client is not configured (local/dev with
 * Supabase disabled), so that governance writes can degrade gracefully without
 * blocking the user-facing action.
 */
export async function writeAudit(args: WriteAuditArgs): Promise<string | null> {
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return null;
  }
  const { data, error } = await admin
    .from("audit_logs")
    .insert({
      organization_id: args.organizationId,
      actor_id: args.actorId,
      action: args.action,
      entity_type: args.entityType,
      entity_id: args.entityId,
      before: (args.before as Record<string, unknown> | null | undefined) ?? null,
      after: (args.after as Record<string, unknown> | null | undefined) ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return null;
  }
  return data.id as string;
}
