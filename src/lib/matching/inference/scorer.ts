import type { FieldValue } from "@/lib/domain/types";
import type { Signal, SignalKind } from "@/lib/matching/inference/signal";

export type CandidateSignals = {
  value: FieldValue;
  signals: Signal[];
};

export type ScoredCandidate = {
  value: FieldValue;
  signals: Signal[];
  finalScore: number;
};

const PRIOR_BOOST_CAP = 0.1;
const HIERARCHY_BOOST_CAP = 0.06;
const SOFT_BOOST_CAP = 0.15;

const BASE_SIGNAL_KINDS = new Set<SignalKind>([
  "exact_value",
  "exact_alias",
  "metadata_code",
  "fuzzy_label",
  "fuzzy_alias",
  "parser",
  "validator",
  "crosswalk",
  "concept_graph",
]);

function sumByKind(signals: Signal[], filter: (kind: SignalKind) => boolean): number {
  let total = 0;
  for (const signal of signals) {
    if (filter(signal.kind)) total += signal.contribution;
  }
  return total;
}

function clampNonNegative(score: number): number {
  return score < 0 ? 0 : score;
}

/**
 * Convert a candidate's signals into a final score capped at 1.0.
 * Approach:
 *   - The strongest base evidence signal (exact value, alias, metadata, etc.) anchors the score.
 *   - Soft signals (locale, hierarchy, prior decisions, context) add bounded boosts.
 *   - This keeps backwards compatibility with the legacy single-matcher behavior in the common case.
 */
export function scoreCandidate(candidate: CandidateSignals): ScoredCandidate {
  let baseEvidence = 0;
  for (const signal of candidate.signals) {
    if (BASE_SIGNAL_KINDS.has(signal.kind)) {
      baseEvidence = Math.max(baseEvidence, signal.contribution);
    }
  }

  const priorBoost = Math.min(
    PRIOR_BOOST_CAP,
    clampNonNegative(sumByKind(candidate.signals, (k) => k === "prior_decision")),
  );
  const hierarchyBoost = Math.min(
    HIERARCHY_BOOST_CAP,
    clampNonNegative(sumByKind(candidate.signals, (k) => k === "hierarchy_match")),
  );
  const softBoost = Math.min(
    SOFT_BOOST_CAP,
    clampNonNegative(
      sumByKind(candidate.signals, (k) =>
        k === "locale_preference" ||
        k === "alias_source_trust" ||
        k === "context_country" ||
        k === "context_locale",
      ),
    ),
  );

  const finalScore = Math.min(1, baseEvidence + priorBoost + hierarchyBoost + softBoost);
  return { value: candidate.value, signals: candidate.signals, finalScore };
}

export function scoreCandidates(candidates: CandidateSignals[]): ScoredCandidate[] {
  return candidates
    .map(scoreCandidate)
    .sort((a, b) => b.finalScore - a.finalScore);
}
