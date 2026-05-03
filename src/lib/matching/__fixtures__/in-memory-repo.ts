import { normalizeText } from "@/lib/matching/normalize-text";
import type { FieldAlias, FieldCrosswalk, FieldPack, FieldType, FieldValue } from "@/lib/domain/types";
import type { IFieldRepository, RecentDecision } from "@/lib/repositories/field-repository.interface";

/** Minimal in-memory repo for matcher / engine unit tests (mirrors StaticFieldRepository at a smaller scale). */
export class InMemoryFieldRepository implements IFieldRepository {
  packs: FieldPack[] = [];
  fieldTypes: FieldType[] = [];
  fieldValues: FieldValue[] = [];
  fieldAliases: FieldAlias[] = [];
  fieldCrosswalks: FieldCrosswalk[] = [];
  recentDecisions: RecentDecision[] = [];

  async getPacks(): Promise<FieldPack[]> {
    return this.packs;
  }

  async getPackByKey(packKey: string): Promise<FieldPack | null> {
    return this.packs.find((p) => p.key === packKey) ?? null;
  }

  async getFieldTypes(): Promise<FieldType[]> {
    return this.fieldTypes;
  }

  async getFieldTypeByKey(fieldKey: string): Promise<FieldType | null> {
    return this.fieldTypes.find((t) => t.key === fieldKey) ?? null;
  }

  async getValuesByFieldKey(fieldKey: string): Promise<FieldValue[]> {
    const type = await this.getFieldTypeByKey(fieldKey);
    if (!type) return [];
    return this.fieldValues.filter((v) => v.fieldTypeId === type.id);
  }

  async searchValues(fieldKey: string, query: string) {
    const norm = normalizeText(query);
    const values = await this.getValuesByFieldKey(fieldKey);
    return values
      .filter((v) => v.normalizedLabel.includes(norm) || v.key.includes(norm))
      .map((value) => ({ value }));
  }

  async getAliasesForType(fieldTypeId: string): Promise<FieldAlias[]> {
    return this.fieldAliases.filter((a) => a.fieldTypeId === fieldTypeId);
  }

  async getCrosswalksByFrom(fieldKey: string, valueKey: string): Promise<FieldCrosswalk[]> {
    const type = await this.getFieldTypeByKey(fieldKey);
    if (!type) return [];
    const fromValue = this.fieldValues.find((v) => v.fieldTypeId === type.id && v.key === valueKey);
    if (!fromValue) return [];
    return this.fieldCrosswalks.filter((c) => c.fromValueId === fromValue.id);
  }

  async resolveCrosswalkTarget(entry: FieldCrosswalk) {
    const fieldType = this.fieldTypes.find((t) => t.id === entry.toFieldTypeId);
    const value = this.fieldValues.find((v) => v.id === entry.toValueId);
    if (!fieldType || !value) return null;
    return { fieldType, value };
  }

  async getValueParents(valueId: string, maxDepth = 6): Promise<FieldValue[]> {
    const out: FieldValue[] = [];
    let current = this.fieldValues.find((v) => v.id === valueId);
    const seen = new Set<string>();
    for (let i = 0; i < maxDepth; i += 1) {
      if (!current || seen.has(current.id)) break;
      seen.add(current.id);
      if (i > 0) out.push(current);
      if (!current.parentId) break;
      current = this.fieldValues.find((v) => v.id === current?.parentId);
    }
    return out;
  }

  async getRecentDecisionsFor(fieldTypeId: string, normalizedInput: string): Promise<RecentDecision[]> {
    return this.recentDecisions.filter((d) => {
      const value = this.fieldValues.find((v) => v.id === d.valueId);
      if (!value) return false;
      if (value.fieldTypeId !== fieldTypeId) return false;
      const inputAliases = this.fieldAliases.filter(
        (a) => a.fieldValueId === value.id && a.normalizedAlias === normalizedInput,
      );
      return inputAliases.length > 0 || value.normalizedLabel === normalizedInput;
    });
  }

  async getCrosswalksByFromValueId(valueId: string, toFieldTypeId?: string): Promise<FieldCrosswalk[]> {
    return this.fieldCrosswalks.filter((entry) => {
      if (entry.fromValueId !== valueId) return false;
      if (toFieldTypeId && entry.toFieldTypeId !== toFieldTypeId) return false;
      return true;
    });
  }

  addType(partial: Partial<FieldType> & { key: string }): FieldType {
    const id = partial.id ?? `ft-${this.fieldTypes.length + 1}`;
    const type: FieldType = {
      id,
      fieldPackId: partial.fieldPackId ?? "p-1",
      key: partial.key,
      name: partial.name ?? partial.key,
      description: partial.description ?? "",
      kind: partial.kind ?? "taxonomy",
      status: partial.status ?? "active",
      isPublic: partial.isPublic ?? true,
      supportsHierarchy: partial.supportsHierarchy ?? false,
      supportsRelationships: partial.supportsRelationships ?? false,
      supportsLocale: partial.supportsLocale ?? false,
      supportsValidation: partial.supportsValidation ?? false,
      supportsCrosswalks: partial.supportsCrosswalks ?? false,
      metadataSchema: partial.metadataSchema ?? {},
    };
    this.fieldTypes.push(type);
    return type;
  }

  addValue(partial: Partial<FieldValue> & { fieldTypeId: string; key: string; label: string }): FieldValue {
    const id = partial.id ?? `v-${this.fieldValues.length + 1}`;
    const value: FieldValue = {
      id,
      fieldTypeId: partial.fieldTypeId,
      key: partial.key,
      label: partial.label,
      normalizedLabel: partial.normalizedLabel ?? normalizeText(partial.label),
      locale: partial.locale ?? null,
      description: partial.description ?? null,
      parentId: partial.parentId ?? null,
      sortOrder: partial.sortOrder ?? 0,
      status: partial.status ?? "active",
      metadata: partial.metadata ?? {},
      source: partial.source ?? null,
      sourceId: partial.sourceId ?? null,
    };
    this.fieldValues.push(value);
    return value;
  }

  addAlias(partial: Partial<FieldAlias> & { fieldTypeId: string; fieldValueId: string; alias: string }): FieldAlias {
    const id = partial.id ?? `a-${this.fieldAliases.length + 1}`;
    const alias: FieldAlias = {
      id,
      fieldValueId: partial.fieldValueId,
      fieldTypeId: partial.fieldTypeId,
      alias: partial.alias,
      normalizedAlias: partial.normalizedAlias ?? normalizeText(partial.alias),
      locale: partial.locale ?? null,
      source: partial.source ?? "manual",
      confidence: partial.confidence ?? 0.95,
      status: partial.status ?? "active",
    };
    this.fieldAliases.push(alias);
    return alias;
  }

  addCrosswalk(partial: Partial<FieldCrosswalk> & {
    fromFieldTypeId: string;
    fromValueId: string;
    toFieldTypeId: string;
    toValueId: string;
    crosswalkType: string;
    confidence: number;
  }): FieldCrosswalk {
    const id = partial.id ?? `cw-${this.fieldCrosswalks.length + 1}`;
    const crosswalk: FieldCrosswalk = {
      id,
      fromFieldTypeId: partial.fromFieldTypeId,
      fromValueId: partial.fromValueId,
      toFieldTypeId: partial.toFieldTypeId,
      toValueId: partial.toValueId,
      crosswalkType: partial.crosswalkType,
      confidence: partial.confidence,
      source: partial.source ?? null,
      metadata: partial.metadata ?? {},
    };
    this.fieldCrosswalks.push(crosswalk);
    return crosswalk;
  }
}
