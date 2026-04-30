# FeeldKit Operating Model

## Core Loop
1. Ingest canonical data and cross-system references.
2. Normalize/translate incoming values through canonical concepts.
3. Auto-apply high-confidence outcomes.
4. Queue low-confidence outcomes for review.
5. Promote approved decisions into reusable intelligence assets.

## Deterministic + Probabilistic Split
- Deterministic: flow-pack mappings and explicit references for common routes.
- Probabilistic: semantic inference for long-tail variation and unknown inputs.
- Governance: confidence policy determines auto-apply vs review routing.

## Review by Exception
- Manual review should focus on ambiguity, not routine mappings.
- Review UI supports approve/reject/edit and bulk operations.
- Approved edits can become aliases, crosswalks, or flow-pack updates.

## Promotion Rules
- Promote only decisions with clear provenance and repeated utility.
- Keep versioned changelogs for promoted intelligence.
- Avoid tenant leakage where data must stay tenant-scoped.

## Production Controls
- Coverage checks for critical systems (industry/jobs/geo/standards).
- Drift checks for upstream source changes.
- Audit logs for admin actions and mapping decisions.
- Rollback capability for bad promotions or ingest regressions.
