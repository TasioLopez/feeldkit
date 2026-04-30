# FeeldKit Vision

## North Star
FeeldKit is a Mapping Intelligence Layer for developers and software editors.
It translates recurrent business fields (industry, jobs, geo, company/person
facets) across heterogeneous systems (LinkedIn APIs, lead-gen SaaS, forms,
CRMs) through canonical concepts, probabilistic inference, and
human-in-the-loop review.

## Why This Exists
Most teams still hand-build brittle mapping logic in each integration. FeeldKit
exists to reduce that burden by offering reusable canonical intelligence and
reviewed mapping assets that improve over time.

## Product Outcomes
- Developers can integrate common data flows quickly with low custom mapping work.
- Integrations are more deterministic for high-frequency paths.
- Long-tail variation is handled by semantic inference + review by exception.
- Decisions are auditable with trace, confidence, and provenance.

## Value Model
- Deterministic flow packs for common pipelines (example: SalesNav -> HubSpot)
- Semantic fallback for custom and unknown values
- Review queue for low-confidence outputs only
- Promotion of approved decisions into reusable intelligence

## Non-Goals
- Fully static one-off mapping templates that never learn
- Opaque black-box outputs without explainability
- Forcing manual review for every mapping
