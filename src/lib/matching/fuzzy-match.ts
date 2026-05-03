import { normalizeText, tokenSet } from "@/lib/matching/normalize-text";
import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";
import type { CandidateSignals } from "@/lib/matching/inference/scorer";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";

const FUZZY_FLOOR = 0.45;

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
  if (!best || best.confidence < FUZZY_FLOOR) {
    return null;
  }
  return best;
}

/**
 * Inference variant: scores against label tokens AND key tokens, returns top candidates with
 * separate fuzzy_label / fuzzy_alias signals. Aliases are mixed in through `getAliasesForType`.
 */
export async function fuzzyMatchWithSignals(
  repo: IFieldRepository,
  fieldKey: string,
  input: string,
): Promise<CandidateSignals[]> {
  const normalized = normalizeText(input);
  if (!normalized) return [];
  const inputTokens = tokenSet(normalized);
  if (inputTokens.size === 0) return [];

  const values = await repo.getValuesByFieldKey(fieldKey);
  if (values.length === 0) return [];
  const type = await repo.getFieldTypeByKey(fieldKey);
  const aliases = type ? await repo.getAliasesForType(type.id) : [];
  const aliasesByValueId = new Map<string, typeof aliases>();
  for (const alias of aliases) {
    const list = aliasesByValueId.get(alias.fieldValueId) ?? [];
    list.push(alias);
    aliasesByValueId.set(alias.fieldValueId, list);
  }

  const scored: Array<{ value: FieldValue; score: number; via: "label" | "alias"; aliasId?: string }> = [];
  for (const item of values) {
    const labelScore = jaccardScore(inputTokens, tokenSet(item.label));
    const keyScore = jaccardScore(inputTokens, tokenSet(item.key.replace(/[_-]+/g, " ")));
    const labelOrKey = Math.max(labelScore, keyScore);
    if (labelOrKey >= FUZZY_FLOOR) {
      scored.push({ value: item, score: labelOrKey, via: "label" });
    }
    const valueAliases = aliasesByValueId.get(item.id) ?? [];
    let bestAlias: { score: number; aliasId: string } | null = null;
    for (const alias of valueAliases) {
      const aliasScore = jaccardScore(inputTokens, tokenSet(alias.alias));
      if (aliasScore >= FUZZY_FLOOR && (!bestAlias || aliasScore > bestAlias.score)) {
        bestAlias = { score: aliasScore, aliasId: alias.id };
      }
    }
    if (bestAlias) {
      scored.push({ value: item, score: bestAlias.score, via: "alias", aliasId: bestAlias.aliasId });
    }
  }
  if (scored.length === 0) return [];

  scored.sort((a, b) => b.score - a.score);
  const TOP_N = 5;
  const dedup = new Map<string, CandidateSignals>();
  for (const entry of scored.slice(0, TOP_N * 2)) {
    const candidate = dedup.get(entry.value.id) ?? { value: entry.value, signals: [] };
    if (entry.via === "label") {
      candidate.signals.push(
        makeSignal({
          kind: "fuzzy_label",
          source: "field_values.label+key",
          rawScore: entry.score,
          weight: DEFAULT_WEIGHTS.fuzzy_label,
          ref: { table: "field_values", id: entry.value.id },
          metadata: { jaccard: entry.score },
        }),
      );
    } else if (entry.via === "alias" && entry.aliasId) {
      candidate.signals.push(
        makeSignal({
          kind: "fuzzy_alias",
          source: "field_aliases.alias",
          rawScore: entry.score,
          weight: DEFAULT_WEIGHTS.fuzzy_alias,
          ref: { table: "field_aliases", id: entry.aliasId },
          metadata: { jaccard: entry.score },
        }),
      );
    }
    dedup.set(entry.value.id, candidate);
  }
  return Array.from(dedup.values()).slice(0, TOP_N);
}
