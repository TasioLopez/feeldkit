# Next 8 Weeks Execution Plan

## Week 1-2: Source Reliability and Coverage
Deliverables:
- Harden LinkedIn/NAICS/jobs source adapters.
- Add source fallback and snapshot strategy.
- Expand health checks and import report source diagnostics.
Test gates:
- Import runs without critical zero-count regressions.
- Coverage thresholds pass for mandatory systems.
Risks:
- Source doc structure changes unexpectedly.

## Week 3: Cross-Pack Reference Layer
Deliverables:
- Add explicit field reference semantics.
- Link company/person-facing fields to canonical industry/jobs/geo fields.
- Document precedence and override behavior.
Test gates:
- Reference integrity checks pass.
- Duplicate canonical value lists reduced for shared domains.
Risks:
- Existing pack consumers may rely on duplicated field lists.

## Week 4-5: Inference Engine and Trace V1
Deliverables:
- Improve scoring model (metadata/hierarchy/history signals).
- Add response trace details for explainability.
- Tune confidence classification for review-by-exception.
Test gates:
- Precision regression fixtures pass.
- Low-confidence routing behaves as policy expects.
Risks:
- Aggressive thresholds can increase false positives.

## Week 6: Flagship Flow Pack (SalesNav -> HubSpot)
Deliverables:
- Define deterministic flow-pack schema and first production flow.
- Provide fixtures covering top shared fields and value variants.
- Add versioning/changelog for flow-pack updates.
Test gates:
- Deterministic mapping regression suite passes.
- Output trace/provenance remains complete.
Risks:
- HubSpot custom property variance across tenants.

## Week 7: Learning and Promotion Loop
Deliverables:
- Promote approved reviews into reusable aliases/crosswalk assets.
- Add guardrails for promotion scope and rollback.
- Measure reduction in repeated review decisions.
Test gates:
- Promotion pipeline tests pass.
- Rollback path validated.
Risks:
- Incorrect promotion can propagate mapping errors.

## Week 8: Developer Productization and Launch Readiness
Deliverables:
- Integration docs and examples for common flows.
- SDK/client helper surface and simulation workflow.
- Launch checklist and operational runbook updates.
Test gates:
- Example integration smoke tests pass.
- Onboarding path validated by internal dry run.
Risks:
- Documentation drift from implementation details.

## Success Metrics by End of Week 8
- Higher high-confidence auto-apply rate on core domains.
- Lower manual review volume for common integration paths.
- Stable deterministic performance on flagship flow pack.
- Faster developer onboarding for custom integrations.
