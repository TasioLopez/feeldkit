import { normalizeText } from "@/lib/matching/normalize-text";
import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";
import type { CandidateSignals } from "@/lib/matching/inference/scorer";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";

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

export async function metadataCodeMatchWithSignals(
  repo: IFieldRepository,
  fieldKey: string,
  input: string,
): Promise<CandidateSignals[]> {
  const normalized = normalizeText(input);
  if (!normalized) return [];
  const values = await repo.getValuesByFieldKey(fieldKey);
  const candidates: CandidateSignals[] = [];
  for (const item of values) {
    for (const key of metadataKeys) {
      const value = item.metadata[key];
      if (typeof value === "string" && normalizeText(value) === normalized) {
        candidates.push({
          value: item,
          signals: [
            makeSignal({
              kind: "metadata_code",
              source: `field_values.metadata.${key}`,
              rawScore: 0.97,
              weight: DEFAULT_WEIGHTS.metadata_code,
              ref: { table: "field_values", id: item.id },
              metadata: { code_key: key, code_value: value },
            }),
          ],
        });
        break;
      }
    }
  }
  return candidates;
}
