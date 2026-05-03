import { fieldAliases, fieldCrosswalks, fieldPacks, fieldTypes, fieldValues } from "@/data/v1";
import { normalizeText } from "@/lib/matching/normalize-text";
import type { FieldAlias, FieldCrosswalk, FieldPack, FieldType, FieldValue } from "@/lib/domain/types";
import type { IFieldRepository, RecentDecision } from "@/lib/repositories/field-repository.interface";

const typeByKey = new Map(fieldTypes.map((entry) => [entry.key, entry]));
const valueById = new Map(fieldValues.map((entry) => [entry.id, entry]));

export class StaticFieldRepository implements IFieldRepository {
  async getPacks(): Promise<FieldPack[]> {
    return fieldPacks;
  }

  async getPackByKey(packKey: string): Promise<FieldPack | null> {
    return fieldPacks.find((entry) => entry.key === packKey) ?? null;
  }

  async getFieldTypes(): Promise<FieldType[]> {
    return fieldTypes;
  }

  async getFieldTypeByKey(fieldKey: string): Promise<FieldType | null> {
    return typeByKey.get(fieldKey) ?? null;
  }

  async getValuesByFieldKey(fieldKey: string): Promise<FieldValue[]> {
    const type = await this.getFieldTypeByKey(fieldKey);
    if (!type) {
      return [];
    }
    return fieldValues.filter((entry) => entry.fieldTypeId === type.id);
  }

  async searchValues(fieldKey: string, query: string): Promise<Array<{ value: FieldValue; alias?: FieldAlias }>> {
    const normalized = normalizeText(query);
    if (!normalized) {
      return [];
    }
    const values = await this.getValuesByFieldKey(fieldKey);
    const ids = new Set(values.map((entry) => entry.id));
    const aliases = fieldAliases.filter((entry) => ids.has(entry.fieldValueId));

    const byValue = values
      .filter((entry) => entry.normalizedLabel.includes(normalized) || entry.key.includes(normalized))
      .map((entry) => ({ value: entry }));
    const byAlias = aliases
      .filter((entry) => entry.normalizedAlias.includes(normalized))
      .map((entry) => ({ value: valueById.get(entry.fieldValueId)!, alias: entry }));
    return [...byValue, ...byAlias];
  }

  async getAliasesForType(fieldTypeId: string): Promise<FieldAlias[]> {
    return fieldAliases.filter((entry) => entry.fieldTypeId === fieldTypeId);
  }

  async getCrosswalksByFrom(fieldKey: string, valueKey: string): Promise<FieldCrosswalk[]> {
    const type = await this.getFieldTypeByKey(fieldKey);
    if (!type) {
      return [];
    }
    const fromValue = fieldValues.find((entry) => entry.fieldTypeId === type.id && entry.key === valueKey);
    if (!fromValue) {
      return [];
    }
    return fieldCrosswalks.filter((entry) => entry.fromValueId === fromValue.id);
  }

  async resolveCrosswalkTarget(entry: FieldCrosswalk): Promise<{ fieldType: FieldType; value: FieldValue } | null> {
    const fieldType = fieldTypes.find((type) => type.id === entry.toFieldTypeId);
    const value = fieldValues.find((candidate) => candidate.id === entry.toValueId);
    if (!fieldType || !value) {
      return null;
    }
    return { fieldType, value };
  }

  async getValueParents(valueId: string, maxDepth = 6): Promise<FieldValue[]> {
    const chain: FieldValue[] = [];
    let current = valueById.get(valueId);
    const seen = new Set<string>();
    for (let depth = 0; depth < maxDepth; depth += 1) {
      if (!current || seen.has(current.id)) break;
      seen.add(current.id);
      if (depth > 0) chain.push(current);
      if (!current.parentId) break;
      current = valueById.get(current.parentId);
    }
    return chain;
  }

  async getRecentDecisionsFor(fieldTypeId: string, normalizedInput: string, _limit = 25): Promise<RecentDecision[]> {
    void _limit;
    const decisions: RecentDecision[] = [];
    for (const alias of fieldAliases) {
      if (alias.fieldTypeId !== fieldTypeId) continue;
      if (alias.normalizedAlias !== normalizedInput) continue;
      decisions.push({
        valueId: alias.fieldValueId,
        status: "alias",
        source: alias.source ?? "field_aliases",
        createdAt: new Date().toISOString(),
      });
    }
    return decisions;
  }

  async getCrosswalksByFromValueId(valueId: string, toFieldTypeId?: string): Promise<FieldCrosswalk[]> {
    return fieldCrosswalks.filter((entry) => {
      if (entry.fromValueId !== valueId) return false;
      if (toFieldTypeId && entry.toFieldTypeId !== toFieldTypeId) return false;
      return true;
    });
  }
}
