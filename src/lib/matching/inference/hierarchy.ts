import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";
import type { Signal } from "@/lib/matching/inference/signal";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";
import { normalizeText, tokenSet } from "@/lib/matching/normalize-text";

/**
 * Emit a hierarchy_match signal when the input shares tokens with one of the candidate value's parents.
 * Helps tie-break sibling values in deep taxonomies (industry hierarchies, sub-industries, etc.).
 */
export async function hierarchySignalsFor(
  repo: IFieldRepository,
  candidate: FieldValue,
  normalizedInput: string,
): Promise<Signal[]> {
  if (!candidate.parentId || !normalizedInput) return [];
  const parents = await repo.getValueParents(candidate.id, 4);
  if (parents.length === 0) return [];
  const inputTokens = tokenSet(normalizedInput);
  if (inputTokens.size === 0) return [];
  const signals: Signal[] = [];
  for (const parent of parents) {
    const parentTokens = tokenSet(normalizeText(parent.label));
    if (parentTokens.size === 0) continue;
    let intersection = 0;
    for (const token of parentTokens) {
      if (inputTokens.has(token)) intersection += 1;
    }
    if (intersection === 0) continue;
    const rawScore = intersection / Math.max(parentTokens.size, 1);
    if (rawScore < 0.34) continue;
    signals.push(
      makeSignal({
        kind: "hierarchy_match",
        source: "field_values.parent_id",
        rawScore,
        weight: DEFAULT_WEIGHTS.hierarchy_match,
        ref: { table: "field_values", id: parent.id },
        metadata: { parent_label: parent.label, parent_key: parent.key },
      }),
    );
    break;
  }
  return signals;
}
