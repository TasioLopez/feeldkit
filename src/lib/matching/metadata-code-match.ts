import { normalizeText } from "@/lib/matching/normalize-text";
import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";

const metadataKeys = ["iso2", "iso3", "code", "iso639_1", "iana"];

export async function metadataCodeMatch(
  repo: IFieldRepository,
  fieldKey: string,
  input: string,
): Promise<{ value: FieldValue; confidence: number } | null> {
  const normalized = normalizeText(input);
  const values = await repo.getValuesByFieldKey(fieldKey);
  for (const item of values) {
    for (const key of metadataKeys) {
      const value = item.metadata[key];
      if (typeof value === "string" && normalizeText(value) === normalized) {
        return { value: item, confidence: 0.97 };
      }
    }
  }
  return null;
}
