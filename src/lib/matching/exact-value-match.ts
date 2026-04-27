import { normalizeText } from "@/lib/matching/normalize-text";
import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";

export async function exactValueMatch(
  repo: IFieldRepository,
  fieldKey: string,
  input: string,
): Promise<{ value: FieldValue; confidence: number } | null> {
  const normalized = normalizeText(input);
  const values = await repo.getValuesByFieldKey(fieldKey);
  const hit = values.find((entry) => entry.normalizedLabel === normalized || normalizeText(entry.key) === normalized);
  if (!hit) {
    return null;
  }
  return { value: hit, confidence: 1 };
}
