# FeeldKit Roadmap

## Phase 0: Source Reliability and Coverage
- Fix fragile upstream adapters and add fallback/source snapshots.
- Enforce minimum coverage checks for critical code systems.
- Exit criteria: no critical source at zero coverage in production imports.

## Phase 1: Explicit Cross-Pack Reuse
- Add explicit field reference semantics across packs.
- Reuse canonical industry/jobs/geo field spaces from company/person contexts.
- Exit criteria: major shared fields reference canonical sources, not duplicates.

## Phase 2: Inference Engine V1 *(shipped on main; tune metrics in prod)*
- Improve scoring using aliases, metadata, hierarchy, and prior review signals.
- Add richer trace outputs for explainability (`explain.v1`, policy docs).
- Exit criteria: high-confidence auto-apply rate improves with stable precision (measure post-deploy).

## Phase 3: Deterministic Flow Packs *(shipped on main; awaiting prod migration + ingest)*
- Ship first flagship flow pack (`linkedin_salesnav -> hubspot`).
- DB schema (`flow_packs`, `flow_pack_versions`, `flow_pack_field_mappings`) governs versioned mapping rules.
- API surface: `POST /api/v1/flow/translate` (+ batch), `GET /api/v1/flows`, `GET /api/v1/flows/{flowKey}/versions/{version}`.
- Deterministic-first: `translate` rules require crosswalk hits in V1; ambiguous values surface as `unmapped` and route through review.
- Verify gates: `flow_packs_present`, `flow_field_mappings_resolvable`, `flow_translate_deterministic_baseline`.
- Exit criteria: flagship flow pack ingested and verified per environment, deterministic precision report on baseline.

## Phase 4: Confidence Policy and Governance *(engineering shipped on main; apply migrations + ops checklist per env)*
- Per-org domain thresholds, field locks, flow overrides + lifecycle controls (`docs/GOVERNANCE.md`).
- Audit log + promoted-decision undo + admin APIs (`admin:policies`, `admin:flows`).
- Exit criteria: governance surfaces exercised in staging/prod; review undo round-trip verified.

## Phase 5: Learning Loop
- Promote approved decisions into reusable aliases/crosswalk assets.
- Version and monitor promoted intelligence.
- Exit criteria: measurable drop in repeated manual decisions.

## Phase 6: Developer Productization
- SDK/client helpers, examples, and integration playbooks.
- Export/import profiles and test harness for simulation.
- Exit criteria: external developers can onboard common flows quickly.

## Phase 7: Ops and SLIs
- Track match rate, low-confidence rate, manual-review latency, false-map rate.
- Alerts for ingestion drift and quality regressions.
- Exit criteria: operational quality baseline with measurable SLOs.
