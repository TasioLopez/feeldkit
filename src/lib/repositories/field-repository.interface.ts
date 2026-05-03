import type { FieldAlias, FieldCrosswalk, FieldPack, FieldType, FieldValue } from "@/lib/domain/types";

export type RecentDecision = {
  valueId: string;
  status: "approved" | "rejected" | "pending" | "alias";
  source: string | null;
  createdAt: string;
};

export interface IFieldRepository {
  getPacks(): Promise<FieldPack[]>;
  getPackByKey(packKey: string): Promise<FieldPack | null>;
  getFieldTypes(): Promise<FieldType[]>;
  getFieldTypeByKey(fieldKey: string): Promise<FieldType | null>;
  getValuesByFieldKey(fieldKey: string): Promise<FieldValue[]>;
  searchValues(fieldKey: string, query: string): Promise<Array<{ value: FieldValue; alias?: FieldAlias }>>;
  getAliasesForType(fieldTypeId: string): Promise<FieldAlias[]>;
  getCrosswalksByFrom(fieldKey: string, valueKey: string): Promise<FieldCrosswalk[]>;
  resolveCrosswalkTarget(entry: FieldCrosswalk): Promise<{ fieldType: FieldType; value: FieldValue } | null>;

  /** Walk the parent chain for a field value (capped depth). Used for hierarchy signals. */
  getValueParents(valueId: string, maxDepth?: number): Promise<FieldValue[]>;
  /** Recent prior decisions for a (field_type_id, normalized_input) tuple, drawn from mapping_reviews and field_aliases. */
  getRecentDecisionsFor(fieldTypeId: string, normalizedInput: string, limit?: number): Promise<RecentDecision[]>;
  /** Crosswalks anchored on a from-side value id (optionally filtered to a specific to-field type). Used by translate. */
  getCrosswalksByFromValueId(valueId: string, toFieldTypeId?: string): Promise<FieldCrosswalk[]>;
}
