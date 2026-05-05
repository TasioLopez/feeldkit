import type { SupabaseClient } from "@supabase/supabase-js";
import type { IGovernanceRepository } from "@/lib/governance/governance-repository.interface";
import type { FlowPackOverrideRow, OrgFieldLock, OrgFieldLockMode, OrgPolicyOverride } from "@/lib/governance/types";
import { isDomainKey } from "@/lib/governance/types";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return NaN;
}

export class SupabaseGovernanceRepository implements IGovernanceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listOrgPolicyOverrides(organizationId: string): Promise<OrgPolicyOverride[]> {
    const { data, error } = await this.client
      .from("org_policy_overrides")
      .select("id, organization_id, domain, matched, suggested, notes, updated_at, updated_by")
      .eq("organization_id", organizationId)
      .order("domain");
    if (error || !data) return [];
    return data
      .map((row) => this.mapPolicyRow(row as Record<string, unknown>))
      .filter((r): r is OrgPolicyOverride => r !== null);
  }

  async getOrgPolicyOverride(organizationId: string, domain: string): Promise<OrgPolicyOverride | null> {
    const { data, error } = await this.client
      .from("org_policy_overrides")
      .select("id, organization_id, domain, matched, suggested, notes, updated_at, updated_by")
      .eq("organization_id", organizationId)
      .eq("domain", domain)
      .maybeSingle();
    if (error || !data) return null;
    return this.mapPolicyRow(data as Record<string, unknown>);
  }

  private mapPolicyRow(row: Record<string, unknown>): OrgPolicyOverride | null {
    const domain = row.domain as string;
    if (!isDomainKey(domain)) return null;
    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      domain,
      matched: num(row.matched),
      suggested: num(row.suggested),
      notes: (row.notes as string | null) ?? null,
      updatedAt: (row.updated_at as string) ?? new Date(0).toISOString(),
      updatedBy: (row.updated_by as string | null) ?? null,
    };
  }

  async listOrgFieldLocks(organizationId: string): Promise<OrgFieldLock[]> {
    const { data, error } = await this.client
      .from("org_field_locks")
      .select("id, organization_id, field_key, mode, reason, created_at, created_by")
      .eq("organization_id", organizationId)
      .order("field_key");
    if (error || !data) return [];
    return data.map((row) => this.mapLockRow(row as Record<string, unknown>));
  }

  async getOrgFieldLock(organizationId: string, fieldKey: string): Promise<OrgFieldLock | null> {
    const { data, error } = await this.client
      .from("org_field_locks")
      .select("id, organization_id, field_key, mode, reason, created_at, created_by")
      .eq("organization_id", organizationId)
      .eq("field_key", fieldKey)
      .maybeSingle();
    if (error || !data) return null;
    return this.mapLockRow(data as Record<string, unknown>);
  }

  private mapLockRow(row: Record<string, unknown>): OrgFieldLock {
    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      fieldKey: row.field_key as string,
      mode: row.mode as OrgFieldLockMode,
      reason: (row.reason as string | null) ?? null,
      createdAt: (row.created_at as string) ?? new Date(0).toISOString(),
      createdBy: (row.created_by as string | null) ?? null,
    };
  }

  async listFlowPackOverrides(organizationId: string, flowPackId?: string): Promise<FlowPackOverrideRow[]> {
    let q = this.client
      .from("flow_pack_overrides")
      .select(
        "id, organization_id, flow_pack_id, flow_pack_version_id, ordinal, action, payload, notes, created_at, created_by",
      )
      .eq("organization_id", organizationId)
      .order("flow_pack_id");
    if (flowPackId) {
      q = q.eq("flow_pack_id", flowPackId);
    }
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id as string,
      organizationId: row.organization_id as string,
      flowPackId: row.flow_pack_id as string,
      flowPackVersionId: (row.flow_pack_version_id as string | null) ?? null,
      ordinal: row.ordinal === null || row.ordinal === undefined ? null : Number(row.ordinal),
      action: row.action as FlowPackOverrideRow["action"],
      payload: (row.payload as Record<string, unknown>) ?? {},
      notes: (row.notes as string | null) ?? null,
      createdAt: (row.created_at as string) ?? new Date(0).toISOString(),
      createdBy: (row.created_by as string | null) ?? null,
    }));
  }
}
