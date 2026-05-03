/**
 * Inference signal types. Each matcher emits zero or more signals per candidate value.
 * The scorer sums weighted signal contributions to reach a final score.
 */

export type SignalKind =
  | "exact_value"
  | "exact_alias"
  | "metadata_code"
  | "fuzzy_label"
  | "fuzzy_alias"
  | "parser"
  | "validator"
  | "crosswalk"
  | "concept_graph"
  | "prior_decision"
  | "hierarchy_match"
  | "locale_preference"
  | "alias_source_trust"
  | "context_country"
  | "context_locale";

export const SIGNAL_KINDS: readonly SignalKind[] = [
  "exact_value",
  "exact_alias",
  "metadata_code",
  "fuzzy_label",
  "fuzzy_alias",
  "parser",
  "validator",
  "crosswalk",
  "concept_graph",
  "prior_decision",
  "hierarchy_match",
  "locale_preference",
  "alias_source_trust",
  "context_country",
  "context_locale",
] as const;

export type SignalRef = { table: string; id: string };

export type Signal = {
  kind: SignalKind;
  source: string;
  rawScore: number;
  weight: number;
  contribution: number;
  ref?: SignalRef;
  metadata?: Record<string, unknown>;
};

export function makeSignal(args: {
  kind: SignalKind;
  source: string;
  rawScore: number;
  weight: number;
  ref?: SignalRef;
  metadata?: Record<string, unknown>;
}): Signal {
  const contribution = args.rawScore * args.weight;
  return {
    kind: args.kind,
    source: args.source,
    rawScore: args.rawScore,
    weight: args.weight,
    contribution,
    ref: args.ref,
    metadata: args.metadata,
  };
}
