<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FeeldKit Product Direction Lock

## North Star
FeeldKit is a Mapping Intelligence Layer for developers and software editors.
It translates recurrent business fields (industry, jobs, geo, company/person facets)
across heterogeneous systems (LinkedIn APIs, lead-gen SaaS, forms, CRMs) through
canonical concepts, probabilistic inference, and human-in-the-loop review.

## Non-Negotiables
- Canonical concept mediation is primary; direct source->target mapping is secondary.
- Manual review is a safety/governance layer, not the default path for every field.
- Deterministic pre-reviewed flow packs (for common pipelines) are first-class assets.
- Every mapping/translation result must expose confidence, provenance, and traceability.
- Reuse canonical field references across packs; avoid duplicating equivalent value lists.
- Promote approved review decisions into reusable intelligence assets when safe.

## Product Intent
- Reduce custom integration mapping work for app builders.
- Make common flows deterministic and low-risk (example: SalesNav -> HubSpot).
- Keep long-tail custom data flexible through inference + review.
- Keep the system explainable and auditable for production use.
