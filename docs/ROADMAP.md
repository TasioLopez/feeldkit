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

## Phase 5: Learning Loop *(engineering closed — deploy + smoke per environment)*
- Promote approved decisions into reusable aliases/crosswalk assets.
- **Wave 1:** promotion engine (`src/lib/promotion/*`), org staging tables, `org_promotion_settings`,
  `promotion_proposals`, `npm run promotion:metrics`, verify gates.
- **Wave 2:** curator APIs (`admin:promotions`), `platform_admin` dashboard queue, AI proposal undo,
  governance `promotion-settings` API + dashboard form, enrichment wired through `promoteReviewApproval`.
- **Wave 3:** `promoted_intelligence_versions` / `_entries`, `npm run promote:rollup`, public
  `GET /api/v1/promoted-intelligence/versions*`, `/dashboard/promotions` + registry, review impact tiles.
- **Operator checklist:** migrations `20260507000000_phase5_promotion_engine.sql` + `20260507100000_phase5_wave3_promoted_intelligence.sql` + `20260507110000_phase5_org_alias_org_value_link.sql`,
  then `npm run promote:rollup` once promotions exist — see [`docs/PROMOTION.md`](PROMOTION.md).
- Exit criteria (product): measurable drop in repeated manual decisions (track via `promotion:metrics`).

## Phase 6: Developer Productization *(engineering closed — deploy + smoke per environment)*
- Publish-ready `@feeldkit/sdk@0.2.0` with typed route coverage, retry support, examples, and [`docs/SDK.md`](SDK.md).
- Simulation and portable org-config profiles: [`docs/PROFILE_SPEC.md`](PROFILE_SPEC.md), `POST /api/v1/flow/simulate`, `GET/POST /api/v1/admin/profile/{export,import}`.
- Developer hub surfaces: `/dashboard/developer`, `/developers`, `examples/*`, and [`docs/PLAYBOOKS/`](PLAYBOOKS/).
- Operator gates: build SDK, smoke simulate + profile export/import, run `npm run verify:pack-health`, optionally tag `sdk-v0.2.0`.
- Exit criteria: external developers can onboard common flows quickly.

## Phase 7: Ops and SLIs *(next focus)*
- Track match rate, low-confidence rate, manual-review latency, false-map rate.
- Alerts for ingestion drift and quality regressions.
- Exit criteria: operational quality baseline with measurable SLOs.
