# FeeldKit Architecture

## Overview
FeeldKit is a Mapping Intelligence Layer. The architecture is built around
canonical concept mediation: source systems map into canonical concepts first,
then translate from canonical concepts into target systems.

## Architecture Principles
- Canonical concept mediation first, direct point-to-point mapping second
- Deterministic flow packs for common routes
- Probabilistic inference for long-tail variation
- Human-in-the-loop review for ambiguous results
- Continuous promotion of approved decisions into reusable intelligence
- Full traceability for each output (confidence, provenance, reasoning trail)

## Generic Core
- `field_packs`: publishable package units (geo, standards, jobs, etc.)
- `field_types`: typed fields in each pack (`countries`, `currencies`, `job_functions`, ...)
- `field_values`: canonical values with stable keys and metadata
- `field_aliases`: source-specific and colloquial inputs linked to canonical values
- `field_crosswalks`: directional mappings between field types
- `validation_rules` / `parser_rules`: reusable rules bound to field types
- `field_mappings` / `mapping_reviews`: runtime normalization output + human review queue
- `import_sources` / `field_pack_versions`: provenance and version lineage
- `usage_events` / `audit_logs`: usage + system history
- `industry_concepts` / `industry_concept_codes` / `industry_concept_edges`:
  concept-centered interoperability layer across industry code systems

## Typed Pack Modules
Pack modules live in `src/lib/packs/*` and provide:
- preprocessors/normalizers
- pack-specific validation and parser wrappers
- crosswalk helpers and context-specific resolvers

Pack modules should reference shared canonical field types rather than duplicate
value spaces where reuse is possible.

## Reference resolution (cross-pack reuse)
Consumer `field_types` may declare `feeldkit.canonical_ref.v1` inside `metadata_schema` so a CRM-specific field (e.g. `company_industry`) reuses an existing canonical value space (e.g. `linkedin_industry_codes`) without duplicating `field_values`.

Runtime flow:
1. Load the consumer `field_type` and parse the canonical ref contract (`src/lib/domain/canonical-ref.ts`).
2. For `relationship: enum_values`, run the matching pipeline against `field_type_key` (global stable key).
3. Attach trace on the response: `resolved_via`, `consumer_field_key`, `canonical_field_key`, plus existing confidence/provenance.

Ingestion merges `metadata_schema` so operator locks and canonical refs are not clobbered by seed re-runs unless `forceOverwrite` is set.

## Matching Engine
Pipeline modules in `src/lib/matching`:
1. text normalization
2. exact alias match (locale-aware when `context.display_language` / `context.source_locale` are set)
3. exact canonical match
4. metadata/code match
5. validation/parser candidate generation
6. fuzzy match
7. context boost
8. confidence classification
9. review queue enqueue when confidence is too low

Output model:
- `matched` (high confidence)
- `suggested` (medium confidence)
- `review` or `unmatched` (review queue)

## Translation Architecture
- Resolve source field/value to canonical concept/value
- Apply deterministic flow-pack mappings when available
- Fall back to semantic inference when deterministic mapping does not exist
- Emit target representation with trace metadata and confidence
- Route low-confidence outcomes to review queue

## Validation Engine
`src/lib/validation/validation-service.ts` runs generic rule types:
- regex
- required context
- metadata-aware checks

V1 examples:
- postal code by country
- social URL validation
- UTM key conventions

## Parser Engine
`src/lib/parsing/parser-service.ts` provides parser registry behavior by `field_key`:
- domain/email parser
- social URL parser
- UTM parser

## Crosswalk Engine
`src/lib/crosswalk/crosswalk-service.ts` resolves mappings through `field_crosswalks`:
- country -> currency/language/timezone
- title -> function/seniority
- standards overlays
- industry code system translation via concept edges

## API Architecture
- Versioned routes under `src/app/api/v1`
- Generic endpoints plus convenience endpoints
- Shared auth/rate-limit/scope checks from `src/lib/api/endpoint.ts`
- Stable response envelope for normalize/validate/parse/crosswalk APIs
- Admin translation routes for concept resolve/translate workflows

## Admin Dashboard
Routes in `src/app/dashboard`:
- packs and reviews for quality control
- enrichment for suggestion generation and queue processing
- industry interoperability view for edge review and translation confidence
- operational surfaces should prioritize review-by-exception and bulk decisions

## Versioning + Imports
`scripts/seed.ts`, `scripts/import-pack.ts`, `scripts/update-pack.ts`, `scripts/export-pack.ts` provide idempotent seed/import flow and machine-readable snapshots.
- `scripts/import-full-v1.ts` should be treated as the canonical high-coverage
  import pipeline with source health reporting.

## Security Model
- API keys are hashed and validated via prefix lookup
- scope checks per endpoint
- rate-limit-ready middleware
- Supabase Auth + role model for owner/admin/editor/viewer dashboard actions
