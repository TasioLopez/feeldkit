import type { MappingStatus } from "@/lib/domain/types";
import type { PolicyDecision } from "@/lib/matching/inference/policy";
import type { ScoredCandidate } from "@/lib/matching/inference/scorer";
import type { Signal } from "@/lib/matching/inference/signal";

export type ExplainV1Decision = {
  status: MappingStatus;
  band: "high" | "mid" | "low";
  needs_review: boolean;
};

export type ExplainV1Winner = {
  value_id: string | null;
  key: string | null;
  label: string | null;
  final_score: number;
} | null;

export type ExplainV1Alternate = {
  value_id: string;
  key: string;
  label: string;
  final_score: number;
};

export type ExplainV1Signal = {
  kind: string;
  source: string;
  raw_score: number;
  weight: number;
  contribution: number;
  ref?: { table: string; id: string };
  metadata?: Record<string, unknown>;
};

export type ExplainV1 = {
  version: "1";
  field_key: string;
  resolved_field_key: string;
  decision: ExplainV1Decision;
  winner: ExplainV1Winner;
  alternates: ExplainV1Alternate[];
  signals: ExplainV1Signal[];
  policy: { domain: string; thresholds: { matched: number; suggested: number }; reason: string };
  priors: { decision_count: number; last_decision_at: string | null };
};

function toSignalView(signal: Signal): ExplainV1Signal {
  return {
    kind: signal.kind,
    source: signal.source,
    raw_score: Number(signal.rawScore.toFixed(4)),
    weight: Number(signal.weight.toFixed(4)),
    contribution: Number(signal.contribution.toFixed(4)),
    ref: signal.ref,
    metadata: signal.metadata,
  };
}

export function buildExplain(args: {
  fieldKey: string;
  resolvedFieldKey: string;
  decision: PolicyDecision;
  winner: ScoredCandidate | null;
  alternates: ScoredCandidate[];
  policyDomain: string;
  priorDecisionCount: number;
  lastDecisionAt: string | null;
}): ExplainV1 {
  const winner: ExplainV1Winner = args.winner
    ? {
        value_id: args.winner.value.id,
        key: args.winner.value.key,
        label: args.winner.value.label,
        final_score: Number(args.winner.finalScore.toFixed(4)),
      }
    : null;

  const winnerSignals = args.winner ? args.winner.signals.map(toSignalView) : [];
  const alternates: ExplainV1Alternate[] = args.alternates
    .filter((cand) => cand.value && cand !== args.winner)
    .slice(0, 4)
    .map((cand: ScoredCandidate) => ({
      value_id: cand.value.id,
      key: cand.value.key,
      label: cand.value.label,
      final_score: Number(cand.finalScore.toFixed(4)),
    }));

  return {
    version: "1",
    field_key: args.fieldKey,
    resolved_field_key: args.resolvedFieldKey,
    decision: {
      status: args.decision.status,
      band: args.decision.band,
      needs_review: args.decision.needsReview,
    },
    winner,
    alternates,
    signals: winnerSignals,
    policy: {
      domain: args.policyDomain,
      thresholds: args.decision.thresholds,
      reason: args.decision.reason,
    },
    priors: { decision_count: args.priorDecisionCount, last_decision_at: args.lastDecisionAt },
  };
}

export function emptyExplain(fieldKey: string, resolvedFieldKey: string): ExplainV1 {
  return {
    version: "1",
    field_key: fieldKey,
    resolved_field_key: resolvedFieldKey,
    decision: { status: "unmatched", band: "low", needs_review: true },
    winner: null,
    alternates: [],
    signals: [],
    policy: { domain: "default", thresholds: { matched: 0.9, suggested: 0.65 }, reason: "no candidates" },
    priors: { decision_count: 0, last_decision_at: null },
  };
}
