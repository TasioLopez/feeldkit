# Mapping Intelligence Master Plan

## Objective
Deliver a production-grade mapping intelligence platform that minimizes manual
field mapping work while preserving explainability and governance.

## Current State
- Canonical pack model exists (`field_packs`, `field_types`, `field_values`, aliases, crosswalks).
- Review workflows and enrichment proposals exist.
- Industry concept layer exists (`industry_concepts`, `industry_concept_codes`, `industry_concept_edges`).
- Admin tools exist for enrichment and industry edge review.
- **Phase 1 closed:** consumer fields (`company_industry`, `company_country`, `company_employee_size_band`) carry `feeldkit.canonical_ref.v1`, modular standards packs replaced the legacy monolith, country bundle crosswalks deterministic, dashboard surfaces canonical refs.
- **Phase 2 closed (engineering):** Inference Engine V1 is implemented on `main` — per-signal scoring, per-domain policy ([INFERENCE_POLICY.md](INFERENCE_POLICY.md)), `explain.v1` on normalize and translate ([EXPLAIN_CONTRACT.md](EXPLAIN_CONTRACT.md)), prior-decision and hierarchy signals, `translateOne` plus batch routes, `mapping_reviews` columns for `confidence` / `explain_payload`, reviews dashboard surfacing, verify gates (`verify:pack-health`, optional `inference:precision`). Public API handlers rebuild `Request` from URL/init (not `new Request(incoming)`) for Vercel/undici compatibility.
- **Phase 3 closed (engineering):** Flow Packs V1 (Deterministic Baseline) is implemented on `main` — `flow_packs` / `flow_pack_versions` / `flow_pack_field_mappings` schema, `feeldkit.flow_pack.v1` JSON contract, flagship `linkedin_salesnav -> hubspot` definition under `src/data/flows/`, `runFlow` deterministic engine, `npm run flows:ingest` ingest, `read:flows` API scope, public `/api/v1/flow/*` and `/api/v1/flows*` routes, dashboard at `/dashboard/flows`, fixtures + `flows:precision` report, and `verify:pack-health` flow gates. See [FLOW_PACK_SPEC.md](FLOW_PACK_SPEC.md).
- **Product tuning (ongoing, not blocking Phase 4 planning):** raise inference precision baselines, raise the flagship flow's deterministic baseline as HubSpot value-list crosswalks land, and grow the flow-pack catalog (HubSpot -> SalesNav inverse, Apollo, Clearbit, etc.).
- **Phase 4 closed (engineering):** governance schema (`org_policy_*`, `flow_pack_overrides`, `promoted_decisions`), audit helper + review undo, effective policy resolution wired through `runInference`/`translateOne`, flow overrides + `trace.applied_overrides`, flow lifecycle columns + retire/rollback (`npm run flows:rollback`), admin APIs & dashboard surfaces — see [`docs/GOVERNANCE.md`](GOVERNANCE.md).

## Pre–Phase 4 checklist (short)

**Repository / engineering:** Phases 0–3 scope described above is implemented in code and docs; Phase 4 work is governance / per-org overrides on top of the existing flow + inference layers.

**Per environment (staging, then production) — confirm before treating Phase 3 as “live” and locking Phase 4 execution:**

| Gate | Action |
| --- | --- |
| DB migration (Phase 2) | Apply `supabase/migrations/20260504000000_phase2_inference.sql` (`confidence`, `explain_payload`, `mapping_reviews_field_input_idx`). |
| DB migration (Phase 3) | Apply `supabase/migrations/20260505000000_phase3_flow_packs.sql` (`flow_packs`, `flow_pack_versions`, `flow_pack_field_mappings`, indexes, RLS). |
| Deploy | Ship app revision that includes Phase 2 inference + Phase 3 flow routes/dashboard; smoke `POST /api/v1/normalize` and `POST /api/v1/flow/translate` with a real org key. |
| Data | Run or refresh `npm run import:full-v1`, then `npm run flows:ingest` so flow_packs match the JSON in `src/data/flows/`. |
| Verify | `npm run verify:pack-health` passes (it checks Phase 0/1/2/3 gates). For full inference + flow precision gates, run `npm run inference:precision` and `npm run flows:precision` first so the generated reports exist. |
| Governance (recommended) | Decide rollout policy for new flow versions (manual ingest vs auto on deploy) and how to bump deterministic baselines as crosswalk coverage grows. |
| Observability (recommended) | Enable `SENTRY_DSN` or equivalent so 5xx on `/api/v1/flow/*` are diagnosable without empty client bodies. |

**Ops:** apply Phase 4 migrations, rerun `flows:ingest`, and smoke governance APIs/dashboard flows documented in [`docs/DEPLOYMENT.md`](DEPLOYMENT.md).

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

### Phase 2 - Inference Engine V1 *(engineering shipped; metrics ongoing)*
Scope:
- Expand scoring with metadata, hierarchy, alias density, and prior decisions.
- Improve low-confidence routing and review queue shaping.
- Emit richer trace payloads in normalize/translate outputs.
Exit criteria (product — measure after Phase 2 migration + data are live):
- Better high-confidence hit rate with stable precision.
- Lower manual review load for known common inputs.

### Phase 3 - Flow Packs V1 (Deterministic Baseline) *(engineering shipped; awaiting prod migration + ingest)*
Scope:
- Define flow-pack schema and version model (`flow_packs`, `flow_pack_versions`, `flow_pack_field_mappings`).
- Ship first flagship flow pack: `linkedin_salesnav -> hubspot` under `src/data/flows/`.
- Add deterministic tests and sample fixtures (`tests/fixtures/flows/*.json`, `npm run flows:precision`).
- New API surface: `POST /api/v1/flow/translate` (+ batch), `GET /api/v1/flows*` with the `read:flows` scope.
- Dashboard at `/dashboard/flows` with version history + per-mapping inspection + inline test form.
Exit criteria (engineering): ✓ schema, ingest, runtime, API, dashboard, fixtures, verify gates landed.
Exit criteria (product, post-deploy): deterministic auto-apply rate at or above the flow's baseline, with no regression in normalize/translate precision.

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
