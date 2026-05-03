import type { SignalKind } from "@/lib/matching/inference/signal";

export type DomainKey =
  | "default"
  | "industry"
  | "geo"
  | "standards"
  | "jobs"
  | "company"
  | "tech"
  | "web";

/**
 * Default per-signal weights. Tuned so that with `FEELDKIT_INFERENCE_V1=0` (or default disabled mode)
 * the legacy single-signal scores reproduce the previous matcher confidence values almost exactly.
 *
 * - Strong evidence (exact_value=1.0, exact_alias up to 0.99, metadata_code=0.97) keeps weight near 1
 *   so the scorer mirrors the old behavior when only a single matcher fires.
 * - Soft signals (hierarchy_match, alias_source_trust) carry small weights; they are tie-breakers.
 * - prior_decision is bounded to a +0.10 boost ceiling via the scorer cap.
 */
export const DEFAULT_WEIGHTS: Record<SignalKind, number> = {
  exact_value: 1.0,
  exact_alias: 1.0,
  metadata_code: 1.0,
  fuzzy_label: 1.0,
  fuzzy_alias: 1.0,
  parser: 1.0,
  validator: 1.0,
  crosswalk: 1.0,
  concept_graph: 1.0,
  prior_decision: 0.1,
  hierarchy_match: 0.05,
  locale_preference: 0.05,
  alias_source_trust: 0.05,
  context_country: 0.08,
  context_locale: 0.05,
};

const DOMAIN_OVERRIDES: Partial<Record<DomainKey, Partial<Record<SignalKind, number>>>> = {
  industry: {
    concept_graph: 1.0,
    hierarchy_match: 0.08,
    prior_decision: 0.12,
  },
  geo: {
    metadata_code: 1.0,
    context_country: 0.1,
    fuzzy_label: 0.9,
  },
  standards: {
    metadata_code: 1.0,
    fuzzy_label: 0.9,
  },
  company: {
    prior_decision: 0.15,
  },
};

export function weightsForDomain(domain: DomainKey): Record<SignalKind, number> {
  const overrides = DOMAIN_OVERRIDES[domain] ?? {};
  return { ...DEFAULT_WEIGHTS, ...overrides };
}
