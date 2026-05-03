import { normalizeText } from "@/lib/matching/normalize-text";
import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";
import type { CandidateSignals } from "@/lib/matching/inference/scorer";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";

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

export async function exactValueMatchWithSignals(
  repo: IFieldRepository,
  fieldKey: string,
  input: string,
): Promise<CandidateSignals[]> {
  const normalized = normalizeText(input);
  if (!normalized) return [];
  const values = await repo.getValuesByFieldKey(fieldKey);
  const hits = values.filter((entry) => entry.normalizedLabel === normalized || normalizeText(entry.key) === normalized);
  if (hits.length === 0) return [];
  return hits.map((value) => ({
    value,
    signals: [
      makeSignal({
        kind: "exact_value",
        source: "field_values",
        rawScore: 1,
        weight: DEFAULT_WEIGHTS.exact_value,
        ref: { table: "field_values", id: value.id },
        metadata: { matched: value.normalizedLabel === normalized ? "label" : "key" },
      }),
    ],
  }));
}
