import type { FieldAlias, FieldCrosswalk, FieldPack, FieldType, FieldValue } from "@/lib/domain/types";

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
}
