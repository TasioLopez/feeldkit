# Mapping Intelligence Master Plan

## Objective
Deliver a production-grade mapping intelligence platform that minimizes manual
field mapping work while preserving explainability and governance.

## Current State
- Canonical pack model exists (`field_packs`, `field_types`, `field_values`, aliases, crosswalks).
- Review workflows and enrichment proposals exist.
- Industry concept layer exists (`industry_concepts`, `industry_concept_codes`, `industry_concept_edges`).
- Admin tools exist for enrichment and industry edge review.
- Phase 1 closed: consumer fields (`company_industry`, `company_country`, `company_employee_size_band`) carry `feeldkit.canonical_ref.v1`, modular standards packs replaced the legacy monolith, country bundle crosswalks deterministic, dashboard surfaces canonical refs.
- Phase 2 in flight: Inference Engine V1 ships per-signal scoring, per-domain policy, `explain.v1` on every normalize/translate response, prior-decision and hierarchy boosts, and a general `translateOne` (see [INFERENCE_POLICY.md](INFERENCE_POLICY.md), [EXPLAIN_CONTRACT.md](EXPLAIN_CONTRACT.md)).
- Known gap: deterministic flagship flow packs not formalized for top integration routes (Phase 3).

## Target State
- Reliable source ingestion with strict quality gates.
- Explicit canonical field reuse across packs.
- Deterministic flow packs for common routes.
- Probabilistic inference for long-tail variation.
- Review-by-exception and promotion loop for continuous quality gains.
- Developer-facing integration surface (SDK/docs/examples) for rapid adoption.

## Workstreams and Phases

### Phase 0 - Source Reliability and Coverage Recovery
Scope:
- Harden upstream adapters with fallback and snapshot strategies.
- Add parse drift detection and critical count thresholds.
- Make import reports include source freshness and warnings.
Exit criteria:
- Critical source systems no longer ingest at zero unexpectedly.
- `verify:pack-health` passes mandatory thresholds for production.

### Phase 1 - Canonical Reuse and Field References
Scope:
- Add explicit field reference/reuse model.
- Link company/person app fields to canonical industry/jobs/geo/standards fields.
- Define precedence rules for canonical values vs local overrides.
Exit criteria:
- Shared domains reference canonical field spaces instead of duplicate lists.

### Phase 2 - Inference Engine V1
Scope:
- Expand scoring with metadata, hierarchy, alias density, and prior decisions.
- Improve low-confidence routing and review queue shaping.
- Emit richer trace payloads in normalize/translate outputs.
Exit criteria:
- Better high-confidence hit rate with stable precision.
- Lower manual review load for known common inputs.

### Phase 3 - Flow Packs V1 (Deterministic Baseline)
Scope:
- Define flow-pack schema and version model.
- Ship first flagship flow pack: `linkedin_salesnav -> hubspot`.
- Add deterministic tests and sample fixtures.
Exit criteria:
- Stable deterministic mappings for common fields in flagship flow.

### Phase 4 - Confidence Policy and Governance
Scope:
- Domain-specific policy thresholds (industry/jobs/geo/company facets).
- Auto-apply policy plus review queue policy.
- Rollback controls for promoted decisions and imports.
Exit criteria:
- Review is focused on edge ambiguity rather than standard mappings.

### Phase 5 - Learning and Promotion Loop
Scope:
- Convert approved reviews into reusable aliases/crosswalk updates.
- Add promotion controls and changelog/versioning.
- Track promotion impact metrics.
Exit criteria:
- Repeated mapping cases require less manual intervention over time.

### Phase 6 - Developer Productization
Scope:
- Publish API usage patterns and SDK helpers.
- Provide integration examples for common source/target routes.
- Add simulation endpoint/workflow for pre-deployment validation.
Exit criteria:
- Developers can implement common routes quickly with low custom code.

### Phase 7 - Operations and SLIs
Scope:
- Track match rate, low-confidence rate, manual-review latency, false-map rate.
- Alert on quality regressions and source drift.
- Define SLOs for translation quality and latency.
Exit criteria:
- Reliable operating baseline with measurable service quality.

## Risks and Mitigations
- Upstream source format drift -> snapshots, parser tests, drift alerts.
- Overfitting mappings to one CRM -> canonical-first architecture and system adapters.
- Unsafe auto-apply -> domain confidence thresholds and review fallback.
- Opaque behavior -> mandatory trace/provenance outputs and audit logs.

## Definition of Done
- Canonical coverage for core domains is healthy and verified.
- Flagship deterministic flow pack works end-to-end.
- Inference + review loop demonstrably reduces manual work.
- Developer documentation and examples enable quick onboarding.
