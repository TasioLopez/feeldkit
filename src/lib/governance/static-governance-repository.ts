import type { IGovernanceRepository } from "@/lib/governance/governance-repository.interface";
import type { OrgFieldLock, OrgPolicyOverride, FlowPackOverrideRow } from "@/lib/governance/types";

export class StaticGovernanceRepository implements IGovernanceRepository {
  constructor(
    private readonly policyOverrides: OrgPolicyOverride[] = [],
    private readonly fieldLocks: OrgFieldLock[] = [],
    private readonly flowOverrides: FlowPackOverrideRow[] = [],
  ) {}

  async listOrgPolicyOverrides(organizationId: string): Promise<OrgPolicyOverride[]> {
    return this.policyOverrides.filter((r) => r.organizationId === organizationId);
  }

  async getOrgPolicyOverride(organizationId: string, domain: string): Promise<OrgPolicyOverride | null> {
    return (
      this.policyOverrides.find((r) => r.organizationId === organizationId && r.domain === domain) ?? null
    );
  }

  async listOrgFieldLocks(organizationId: string): Promise<OrgFieldLock[]> {
    return this.fieldLocks.filter((r) => r.organizationId === organizationId);
  }

  async getOrgFieldLock(organizationId: string, fieldKey: string): Promise<OrgFieldLock | null> {
    return this.fieldLocks.find((r) => r.organizationId === organizationId && r.fieldKey === fieldKey) ?? null;
  }

  async listFlowPackOverrides(organizationId: string, flowPackId?: string): Promise<FlowPackOverrideRow[]> {
    let rows = this.flowOverrides.filter((r) => r.organizationId === organizationId);
    if (flowPackId) {
      rows = rows.filter((r) => r.flowPackId === flowPackId);
    }
    return rows;
  }
}
