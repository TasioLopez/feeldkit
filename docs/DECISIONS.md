# Architecture and Product Decisions

## ADR-001: Canonical Concept Mediation First
Status: Accepted

Source and target systems should map through canonical concept/value layers.
Direct source->target mapping is allowed as an optimization, not as the core
architecture.

## ADR-002: Deterministic Flow Packs + Probabilistic Fallback
Status: Accepted

Common, high-frequency pipelines should use reviewed deterministic flow packs.
Long-tail variation should use semantic inference and confidence gating.

## ADR-003: Review by Exception
Status: Accepted

Manual review is required for ambiguous or low-confidence outcomes, not for
every mapping operation.

## ADR-004: Traceability Is Mandatory
Status: Accepted

Every mapping/translation response must provide confidence, provenance, and
trace metadata to support trust, debugging, and governance.

## ADR-005: Promote Approved Decisions
Status: Accepted

Approved mapping decisions may be promoted into reusable intelligence assets
(aliases, crosswalks, flow-pack updates) under controlled versioning.

## ADR-006: Canonical Reuse over Duplication
Status: Accepted

Shared field spaces (industry, jobs, geo, standards) should be referenced and
reused across packs instead of duplicated value lists.
