import { normalizeText } from "@/lib/matching/normalize-text";
import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";

export async function exactAliasMatch(
  repo: IFieldRepository,
  fieldKey: string,
  input: string,
): Promise<{ value: FieldValue; confidence: number } | null> {
  const type = await repo.getFieldTypeByKey(fieldKey);
  if (!type) {
    return null;
  }
  const normalized = normalizeText(input);
  const aliases = await repo.getAliasesForType(type.id);
  const hit = aliases.find((entry) => entry.normalizedAlias === normalized);
  if (!hit) {
    return null;
  }
  const values = await repo.getValuesByFieldKey(fieldKey);
  const value = values.find((entry) => entry.id === hit.fieldValueId);
  if (!value) {
    return null;
  }
  return { value, confidence: Math.min(0.99, hit.confidence) };
}
