import type { DomainKey } from "@/lib/matching/inference/weights";

export type OrgFieldLockMode = "require_review" | "disable_auto_apply";

export type OrgPolicyOverride = {
  id: string;
  organizationId: string;
  domain: DomainKey;
  matched: number;
  suggested: number;
  notes: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type OrgFieldLock = {
  id: string;
  organizationId: string;
  fieldKey: string;
  mode: OrgFieldLockMode;
  reason: string | null;
  createdAt: string;
  createdBy: string | null;
};

export type FlowPackOverrideAction = "skip" | "replace" | "lock" | "pin_version";

export type FlowPackOverrideRow = {
  id: string;
  organizationId: string;
  flowPackId: string;
  flowPackVersionId: string | null;
  ordinal: number | null;
  action: FlowPackOverrideAction;
  payload: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
};

export const DOMAIN_KEYS: readonly DomainKey[] = [
  "default",
  "industry",
  "geo",
  "standards",
  "jobs",
  "company",
  "tech",
  "web",
];

export function isDomainKey(value: string): value is DomainKey {
  return (DOMAIN_KEYS as readonly string[]).includes(value);
}
