# FeeldKit Architecture

## Overview
FeeldKit is a generic field intelligence layer with typed field-pack extensions. The core model stores pack/type/value/alias/crosswalk/rule primitives, while pack modules provide field-specific behavior.

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

## Typed Pack Modules
Pack modules live in `src/lib/packs/*` and provide:
- preprocessors/normalizers
- pack-specific validation and parser wrappers
- crosswalk helpers and context-specific resolvers

Examples:
- `geo/country-normalizer.ts`
- `jobs/job-title-normalizer.ts`
- `email-domain/email-classifier.ts`

## Matching Engine
Pipeline modules in `src/lib/matching`:
1. text normalization
2. exact alias match
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

## API Architecture
- Versioned routes under `src/app/api/v1`
- Generic endpoints plus convenience endpoints
- Shared auth/rate-limit/scope checks from `src/lib/api/endpoint.ts`
- Stable response envelope for normalize/validate/parse/crosswalk APIs

## Admin Dashboard
Routes in `src/app/dashboard`:
- overview, packs, pack detail, field type detail, reviews, api keys, imports, docs
- designed to progressively replace in-memory data with database-backed repositories

## Versioning + Imports
`scripts/seed.ts`, `scripts/import-pack.ts`, `scripts/update-pack.ts`, `scripts/export-pack.ts` provide idempotent seed/import flow and machine-readable snapshots.

## Security Model
- API keys are hashed and validated via prefix lookup
- scope checks per endpoint
- rate-limit-ready middleware
- Supabase Auth + role model planned for owner/admin/editor/viewer on dashboard actions
