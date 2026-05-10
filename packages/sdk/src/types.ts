/**
 * Public response shapes returned by the FeeldKit HTTP API. These mirror the
 * server-side types in `src/lib/...` and are kept in sync intentionally so the
 * SDK can be published as a standalone npm package without depending on the
 * Next.js app source.
 */

export type ExplainV1Decision = {
  status: string;
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
  policy: {
    domain: string;
    thresholds: { matched: number; suggested: number };
    reason: string;
    thresholds_source?: "default" | "org_override";
    lock?: "require_review" | "disable_auto_apply" | null;
  };
  priors: { decision_count: number; last_decision_at: string | null };
};

export type NormalizeMatch = {
  id: string;
  key: string;
  label: string;
  metadata: Record<string, unknown>;
} | null;

export type NormalizeResponse = {
  field_key: string;
  input: string;
  normalized_input: string;
  status: string;
  confidence: number;
  needs_review: boolean;
  review_id?: string;
  match: NormalizeMatch;
  trace: {
    resolved_via: "canonical_ref" | null;
    consumer_field_key?: string;
    canonical_field_key?: string;
    prior_decision_count: number;
  };
  explain: ExplainV1;
};

export type TranslateCandidate = {
  field_value_id: string | null;
  key: string | null;
  label: string | null;
  via: "exact_value" | "crosswalk" | "concept_graph" | "inference" | string;
  score: number;
};

export type TranslateResponse = {
  from_field_key: string;
  to_field_key: string;
  input: string;
  candidates: TranslateCandidate[];
  explain: ExplainV1;
};

export type FlowFieldStatus = "matched" | "suggested" | "unmatched" | "unmapped" | "skipped";

export type FlowFieldOutput = {
  ordinal: number;
  kind: "direct" | "translate";
  source_field_key: string;
  target_field_key: string;
  status: FlowFieldStatus;
  value: string | null;
  confidence: number;
  reason: string | null;
  is_required: boolean;
  explain: ExplainV1 | null;
  trace?: { applied_overrides: string[] };
};

export type FlowTranslateResponse = {
  flow: { key: string; version: string };
  status: "ok" | "incomplete" | "not_found";
  fields: FlowFieldOutput[];
  unmapped: FlowFieldOutput[];
  trace: {
    engine_version: "1";
    deterministic_only: boolean;
    flow_pack_version_id: string | null;
    fallbacks: { translate_via_inference_count: number };
    applied_overrides?: string[];
  };
};

export type FlowSimulationCaseAssertions = {
  matched_targets?: string[];
  unmapped_targets?: string[];
  skipped_targets?: string[];
  status?: FlowTranslateResponse["status"];
};

export type FlowSimulationCase = {
  name: string;
  source_record: Record<string, unknown>;
  expected?: FlowSimulationCaseAssertions;
};

export type FlowSimulationCaseResult = {
  name: string;
  status: FlowTranslateResponse["status"];
  fields: FlowFieldOutput[];
  unmapped: FlowFieldOutput[];
  passed: boolean;
  failures: string[];
  would_be_reviews: number;
};

export type FlowSimulationResponse = {
  flow: { key: string; version: string };
  total_cases: number;
  passed_cases: number;
  cases: FlowSimulationCaseResult[];
  trace: {
    engine_version: "1";
    deterministic_only: boolean;
    flow_pack_version_id: string | null;
    dry_run: true;
    persisted_review_count: 0;
  };
};

export type SimulationProfileV1 = {
  schema: "feeldkit.simulation_profile.v1";
  flow_key: string;
  version?: string;
  cases: FlowSimulationCase[];
  organization_id?: string;
  context?: Record<string, unknown>;
};

export type ApiScope =
  | "read:packs"
  | "read:fields"
  | "read:flows"
  | "read:promoted-intelligence"
  | "normalize"
  | "validate"
  | "parse"
  | "admin:reviews"
  | "admin:fields"
  | "admin:policies"
  | "admin:flows"
  | "admin:promotions";

export type OrgConfigProfileV1 = {
  schema: "feeldkit.org_config_profile.v1";
  manifest: {
    exported_at: string;
    source_organization_id: string;
    feeldkit_app_version: string | null;
    schema_version: 1;
  };
  promotion_settings: {
    default_scope: "org" | "global";
    opt_out_global_propose: boolean;
    notes: string | null;
  };
  policy_overrides: Array<{
    domain: string;
    matched: number;
    suggested: number;
    notes: string | null;
  }>;
  field_locks: Array<{
    field_key: string;
    mode: "require_review" | "disable_auto_apply";
    reason: string | null;
  }>;
  flow_pack_overrides: Array<{
    flow_key: string;
    flow_pack_version: string | null;
    ordinal: number | null;
    action: "skip" | "replace" | "lock" | "pin_version";
    payload: Record<string, unknown>;
    notes: string | null;
  }>;
};

export type OrgConfigProfileImportResult = {
  ok: boolean;
  dry_run: boolean;
  applied: {
    promotion_settings: number;
    policy_overrides: number;
    field_locks: number;
    flow_pack_overrides: number;
  };
  conflicts: Array<{
    section: "policy_overrides" | "field_locks" | "flow_pack_overrides" | "promotion_settings";
    reason: string;
    detail?: Record<string, unknown>;
  }>;
  audit_id: string | null;
};

export type PromotedIntelligenceVersion = {
  id: string;
  version: string;
  released_at: string;
  total_entries: number;
  changelog: string | null;
  stats: Record<string, unknown>;
};

export type PromotedIntelligenceEntry = {
  id: string;
  version_id: string;
  promoted_decision_id: string | null;
  scope: "org" | "global";
  target_table: string;
  target_id: string | null;
  source_kind: "review" | "ai_proposal" | string;
  payload: Record<string, unknown>;
};

export type PromotionProposalRow = {
  id: string;
  source_kind: "review" | "ai_proposal" | string;
  source_id: string;
  organization_id: string;
  target_table: string;
  payload: Record<string, unknown>;
  status:
    | "approved_org"
    | "pending_global"
    | "approved_global"
    | "rejected"
    | "superseded";
  audit_log_id: string | null;
  curator_id: string | null;
  curator_decision_at: string | null;
  curator_notes: string | null;
  superseded_by: string | null;
  created_at: string;
  created_by: string | null;
};

export type ApiEnvelope<T> = T;
