import type { IFieldRepository, RecentDecision } from "@/lib/repositories/field-repository.interface";
import type { Signal } from "@/lib/matching/inference/signal";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";

export type PriorSummary = {
  decisions: RecentDecision[];
  countByValueId: Map<string, number>;
  lastByValueId: Map<string, string>;
};

export async function loadPriors(
  repo: IFieldRepository,
  fieldTypeId: string | null,
  normalizedInput: string,
): Promise<PriorSummary> {
  if (!fieldTypeId || !normalizedInput) {
    return { decisions: [], countByValueId: new Map(), lastByValueId: new Map() };
  }
  const decisions = await repo.getRecentDecisionsFor(fieldTypeId, normalizedInput, 25);
  const countByValueId = new Map<string, number>();
  const lastByValueId = new Map<string, string>();
  for (const decision of decisions) {
    if (decision.status === "rejected") continue;
    const prevCount = countByValueId.get(decision.valueId) ?? 0;
    countByValueId.set(decision.valueId, prevCount + 1);
    const prevLast = lastByValueId.get(decision.valueId);
    if (!prevLast || decision.createdAt > prevLast) {
      lastByValueId.set(decision.valueId, decision.createdAt);
    }
  }
  return { decisions, countByValueId, lastByValueId };
}

export function priorSignalForValue(priors: PriorSummary, valueId: string): Signal | null {
  const count = priors.countByValueId.get(valueId);
  if (!count) return null;
  const rawScore = Math.min(1, count / 5);
  return makeSignal({
    kind: "prior_decision",
    source: "field_aliases+mapping_reviews",
    rawScore,
    weight: DEFAULT_WEIGHTS.prior_decision,
    metadata: { count, last_decision_at: priors.lastByValueId.get(valueId) ?? null },
  });
}

export function priorTotalForValueIds(priors: PriorSummary, valueIds: Iterable<string>): number {
  let total = 0;
  for (const id of valueIds) {
    total += priors.countByValueId.get(id) ?? 0;
  }
  return total;
}
