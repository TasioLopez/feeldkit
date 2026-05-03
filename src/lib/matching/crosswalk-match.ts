import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";
import type { CandidateSignals } from "@/lib/matching/inference/scorer";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";

export async function crosswalkMatch(
  repo: IFieldRepository,
  fieldKey: string,
  inputValueKey: string,
): Promise<{ value: FieldValue; confidence: number } | null> {
  const crosswalks = await repo.getCrosswalksByFrom(fieldKey, inputValueKey);
  const first = crosswalks[0];
  if (!first) {
    return null;
  }
  const resolved = await repo.resolveCrosswalkTarget(first);
  if (!resolved) {
    return null;
  }
  return {
    value: resolved.value,
    confidence: first.confidence,
  };
}

export async function crosswalkMatchWithSignals(
  repo: IFieldRepository,
  fieldKey: string,
  inputValueKey: string,
): Promise<CandidateSignals[]> {
  const crosswalks = await repo.getCrosswalksByFrom(fieldKey, inputValueKey);
  if (crosswalks.length === 0) return [];
  const candidates: CandidateSignals[] = [];
  for (const entry of crosswalks) {
    const resolved = await repo.resolveCrosswalkTarget(entry);
    if (!resolved) continue;
    candidates.push({
      value: resolved.value,
      signals: [
        makeSignal({
          kind: "crosswalk",
          source: entry.source ?? "field_crosswalks",
          rawScore: entry.confidence,
          weight: DEFAULT_WEIGHTS.crosswalk,
          ref: { table: "field_crosswalks", id: entry.id },
          metadata: { crosswalk_type: entry.crosswalkType },
        }),
      ],
    });
  }
  return candidates;
}
