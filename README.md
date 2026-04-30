# FeeldKit

FeeldKit is a Mapping Intelligence Layer for developers and software editors.
It helps apps translate recurrent business fields (industry, jobs, geo, company
and person facets) across heterogeneous systems such as LinkedIn APIs, lead-gen
SaaS tools, forms, and CRMs.

## Product Direction

- Canonical concept mediation first
- Deterministic flow packs for common pipelines
- Semantic inference for long-tail variation
- Human review for ambiguous/low-confidence cases
- Continuous learning from approved decisions

## Current Focus

1. Complete canonical coverage for key packs (industry, jobs, geo, standards)
2. Improve source ingestion reliability and coverage enforcement
3. Add explicit cross-pack references to maximize reuse
4. Ship flow-pack baseline for high-frequency integration paths
5. Strengthen explainability with confidence + provenance + trace outputs

## Project Docs

- `docs/VISION.md`
- `docs/ARCHITECTURE.md`
- `docs/OPERATING_MODEL.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/PLAN_MAPPING_INTELLIGENCE_MASTER.md`
- `docs/PLAN_NEXT_8_WEEKS_EXECUTION.md`

## Development

Run the local dev server:

```bash
npm run dev
```

Run key checks:

```bash
npm run typecheck
npm run test:run
npm run verify:pack-health
```
