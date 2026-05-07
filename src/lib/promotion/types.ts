export type PromotionScope = "org" | "global";

export type PromotionTargetTable = "field_aliases" | "field_values" | "field_crosswalks";

export type PromotionSourceKind = "review" | "enrichment_proposal";

export type PromotionProposalStatus =
  | "approved_org"
  | "pending_global"
  | "approved_global"
  | "rejected"
  | "superseded";

export type PromotionProposalRow = {
  id: string;
  sourceKind: PromotionSourceKind;
  sourceId: string;
  organizationId: string;
  targetTable: PromotionTargetTable;
  payload: Record<string, unknown>;
  status: PromotionProposalStatus;
  auditLogId: string | null;
  curatorId: string | null;
  curatorDecisionAt: string | null;
  curatorNotes: string | null;
  supersededBy: string | null;
  createdAt: string;
  createdBy: string | null;
};

export type OrgPromotionSettings = {
  organizationId: string;
  optOutGlobalPropose: boolean;
  defaultScope: PromotionScope;
  notes: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type FieldAliasPromotionPayload = {
  target: "field_aliases";
  fieldTypeId: string;
  fieldValueId?: string | null;
  orgFieldValueId?: string | null;
  alias: string;
  normalizedAlias: string;
  locale?: string | null;
  source?: string | null;
  confidence?: number;
};

export type FieldValuePromotionPayload = {
  target: "field_values";
  fieldTypeId: string;
  key: string;
  label: string;
  normalizedLabel: string;
  locale?: string | null;
  description?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown>;
};

export type FieldCrosswalkPromotionPayload = {
  target: "field_crosswalks";
  fromFieldTypeId: string;
  fromValueId: string;
  toFieldTypeId: string;
  toValueId: string;
  crosswalkType: string;
  confidence?: number;
  source?: string | null;
  metadata?: Record<string, unknown>;
};

export type PromotionPayload =
  | FieldAliasPromotionPayload
  | FieldValuePromotionPayload
  | FieldCrosswalkPromotionPayload;

export type PromotionResolvedTargetTable =
  | PromotionTargetTable
  | "org_field_aliases"
  | "org_field_values"
  | "org_field_crosswalks";

export type PromotionApplyResult = {
  ok: boolean;
  scope: PromotionScope;
  resolvedTable: PromotionResolvedTargetTable;
  targetId: string | null;
  snapshotBefore: Record<string, unknown> | { absent: true };
  snapshotAfter: Record<string, unknown> | null;
  error?: string;
};

export const ABSENT_SNAPSHOT = { absent: true as const };

export function isAbsentSnapshot(value: unknown): value is { absent: true } {
  return Boolean(value && typeof value === "object" && (value as { absent?: unknown }).absent === true);
}

export function resolveOrgTable(target: PromotionTargetTable): PromotionResolvedTargetTable {
  if (target === "field_aliases") return "org_field_aliases";
  if (target === "field_values") return "org_field_values";
  return "org_field_crosswalks";
}
