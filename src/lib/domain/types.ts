export type PackCategory =
  | "taxonomy"
  | "standards"
  | "validation"
  | "normalization_map"
  | "crosswalk";

export type EntityStatus = "active" | "deprecated" | "draft" | "archived";

export type MappingStatus = "matched" | "suggested" | "unmatched" | "review";

export type ConfidenceLevel = "low" | "medium" | "high" | "verified";

export interface FieldPack {
  id: string;
  key: string;
  name: string;
  description: string;
  category: PackCategory;
  status: EntityStatus;
  version: string;
  sourceType: "manual" | "imported" | "hybrid";
  isPublic: boolean;
  isSystem: boolean;
  metadata: Record<string, unknown>;
}

export interface FieldType {
  id: string;
  fieldPackId: string;
  key: string;
  name: string;
  description: string;
  kind: "taxonomy" | "reference" | "validation" | "parser" | "map";
  status: EntityStatus;
  isPublic: boolean;
  supportsHierarchy: boolean;
  supportsRelationships: boolean;
  supportsLocale: boolean;
  supportsValidation: boolean;
  supportsCrosswalks: boolean;
  metadataSchema: Record<string, unknown>;
}

export interface FieldValue {
  id: string;
  fieldTypeId: string;
  key: string;
  label: string;
  normalizedLabel: string;
  locale: string | null;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  status: EntityStatus;
  metadata: Record<string, unknown>;
  source: string | null;
  sourceId: string | null;
}

export interface FieldAlias {
  id: string;
  fieldValueId: string;
  fieldTypeId: string;
  alias: string;
  normalizedAlias: string;
  locale: string | null;
  source: string | null;
  confidence: number;
  status: EntityStatus;
}

export interface FieldCrosswalk {
  id: string;
  fromFieldTypeId: string;
  fromValueId: string;
  toFieldTypeId: string;
  toValueId: string;
  crosswalkType: string;
  confidence: number;
  source: string | null;
  metadata: Record<string, unknown>;
}

export interface NormalizeRequest {
  fieldKey: string;
  input: string;
  context?: Record<string, unknown>;
  organizationId?: string;
}

export interface MatchResult {
  status: MappingStatus;
  confidence: number;
  needsReview: boolean;
  reason: string;
  value: FieldValue | null;
}

export interface ValidationResult {
  fieldKey: string;
  valid: boolean;
  errors: string[];
  normalizedValue?: string;
}

export interface ParseResult {
  fieldKey: string;
  input: string;
  parsed: Record<string, unknown>;
}

export type FlowFieldMappingKind = "direct" | "translate";

export interface FlowFieldMapping {
  id: string;
  flowPackVersionId: string;
  ordinal: number;
  kind: FlowFieldMappingKind;
  sourceFieldKey: string;
  targetFieldKey: string;
  transform: Record<string, unknown>;
  options: Record<string, unknown>;
  isRequired: boolean;
  status: EntityStatus;
}

export interface FlowPackVersion {
  id: string;
  flowPackId: string;
  version: string;
  changelog: string | null;
  definition: Record<string, unknown>;
  sourceSnapshot: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface FlowPack {
  id: string;
  key: string;
  name: string;
  description: string;
  sourceSystem: string;
  targetSystem: string;
  status: EntityStatus;
  isSystem: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
