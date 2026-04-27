import { normalizeText, tokenSet } from "@/lib/matching/normalize-text";
import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";

function jaccardScore(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) {
    return 0;
  }
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

export async function fuzzyMatch(
  repo: IFieldRepository,
  fieldKey: string,
  input: string,
): Promise<{ value: FieldValue; confidence: number } | null> {
  const normalized = normalizeText(input);
  if (!normalized) {
    return null;
  }
  const inputTokens = tokenSet(normalized);
  let best: { value: FieldValue; confidence: number } | null = null;

  const values = await repo.getValuesByFieldKey(fieldKey);
  for (const item of values) {
    const score = jaccardScore(inputTokens, tokenSet(item.label));
    if (!best || score > best.confidence) {
      best = { value: item, confidence: score };
    }
  }
  if (!best || best.confidence < 0.45) {
    return null;
  }
  return best;
}
