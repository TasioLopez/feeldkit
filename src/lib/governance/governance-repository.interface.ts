import type { OrgFieldLock, OrgPolicyOverride, FlowPackOverrideRow } from "@/lib/governance/types";

export type IGovernanceRepository = {
  listOrgPolicyOverrides(organizationId: string): Promise<OrgPolicyOverride[]>;
  getOrgPolicyOverride(organizationId: string, domain: string): Promise<OrgPolicyOverride | null>;
  listOrgFieldLocks(organizationId: string): Promise<OrgFieldLock[]>;
  getOrgFieldLock(organizationId: string, fieldKey: string): Promise<OrgFieldLock | null>;
  listFlowPackOverrides(organizationId: string, flowPackId?: string): Promise<FlowPackOverrideRow[]>;
};
