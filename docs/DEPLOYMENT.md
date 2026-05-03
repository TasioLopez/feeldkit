# FeeldKit deployment

## Environments

Use separate Supabase projects (or branches) for **development**, **staging**, and **production**. Never point staging CI at production credentials.

## Required environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Public anon key (browser + middleware) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS for API key verification, seed scripts, profile bootstrap |
| `NEXT_PUBLIC_SITE_URL` | All | OAuth/magic-link redirect base (must match deployed URL) |
| `ADMIN_ALLOWED_EMAILS` | Server only | Comma-separated exact emails allowed to access admin login/callback |
| `ADMIN_ALLOWED_EMAIL_DOMAINS` | Server only | Comma-separated email domains allowed to access admin login/callback |
| `OPENAI_API_KEY` | Server only | Optional AI enrichment provider key (used for proposal generation, never auto-applies) |
| `FEELDKIT_AI_MODEL` | Server only | Optional model override for AI enrichment (default `gpt-4.1-mini`) |
| `FEELDKIT_AI_MIN_CONFIDENCE` | Server only | Confidence floor for storing AI proposals (default `0.4`) |
| `FEELDKIT_AI_MAX_PROPOSALS_PER_RUN` | Server only | Max accepted AI proposals per request (default `25`) |
| `FEELDKIT_ENRICHMENT_SYNC_MAX_INPUTS` | Server only | Max batch inputs processed synchronously before queueing (default `25`) |

## Optional security / routing

| Variable | Purpose |
|----------|---------|
| `ADMIN_HOST` | If set (e.g. `admin.feeldkit.dev`), requests to `/dashboard` on other hosts receive 404 |
| `PUBLIC_API_HOST` | Documented canonical API hostname; same app can serve `/api/v1` on `api.*` via DNS |
| `NEXT_PUBLIC_SHOW_ADMIN_LINK` | `true` to show dashboard link on marketing home (keep `false` in prod) |
| `ALLOW_DEMO_API_KEY` | `true` to accept `fk_demo_public_1234567890` without a DB row (dev only) |
| `SENTRY_DSN` | Server error reporting (optional) |
| `FEELDKIT_API_CORS_ORIGIN` | If set, `Access-Control-Allow-Origin` is emitted for `/api/v1/*` to that single origin (omit for same-origin-only browser access) |
| `FEELDKIT_BASE_URL` | Used by `@feeldkit/sdk` in Node when `baseUrl` is omitted (publish-time or runtime) |

## Service role usage

The **service role key must only run on the server** (Route Handlers, Server Actions, `scripts/*`). It is used for:

- Validating API keys against `api_keys` (public API routes)
- Bootstrapping `profiles` / `organizations` on first login
- Idempotent `scripts/seed.ts` against Postgres

Never prefix service role variables with `NEXT_PUBLIC_`.

If any key was ever committed, shared, or present in public artifacts, rotate it immediately and redeploy.

## DNS and surfaces (recommended)

- **Marketing:** `www.feeldkit.dev` or apex `feeldkit.dev`
- **API:** same app, path `/api/v1` — optionally map `api.feeldkit.dev` to the same deployment
- **Admin:** optionally `admin.feeldkit.dev` with `ADMIN_HOST` set

You do not need two registrable domains; subdomains on one domain are enough.

## Database migrations

Apply SQL under `supabase/migrations/` to the target project (Supabase SQL editor, CLI `supabase db push`, or CI).

Order: initial core migration, then `*_rls_hardening.sql`, then any follow-ups.

## Edge rate limits

In-process rate limiting in the app is a backstop. For production, add **WAF / rate rules** (e.g. Cloudflare) in front of `api.*` keyed by IP and optionally by API key prefix. See `docs/DEPLOYMENT.md` (this file) and `docs/ARCHITECTURE.md`.

## Initial content bootstrap

To load starter packs into Supabase:

1. Export `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your shell.
2. Run `npm run seed` from the repository root.
3. Verify `field_packs`, `field_types`, `field_values`, and `field_aliases` contain rows.

For targeted pack ingest + provenance snapshots:

- `npm run import:pack -- <pack-key>` (use `standards` to import all `standards_*` modules in one run, or e.g. `standards_currencies` for a single module)
- `npm run update:pack -- <pack-key> <version>`

For full production V1 imports (geo, modular `standards_*` packs, industry, jobs, company consumer refs):

- `npm run import:full-v1 -- --dry-run` (report-only into `.generated/full-v1-import-report.json`)
- `npm run import:full-v1 -- --dry-run --force-snapshots` (forces local source snapshots for incident validation)
- `npm run import:full-v1` (apply ingest)
- `npm run verify:pack-health` (checks minimum package coverage thresholds)
- `npm run process:enrichment-jobs` (process pending queued enrichment jobs)

### Phase 2 — Inference Engine V1

- **Migration:** `supabase/migrations/20260504000000_phase2_inference.sql` adds `mapping_reviews.confidence` and `mapping_reviews.explain_payload`, plus `mapping_reviews_field_input_idx` for prior lookups. Apply with the standard Supabase migration flow before deploying the Phase 2 app code.
- **Per-domain policy:** thresholds and signal weights documented in [`docs/INFERENCE_POLICY.md`](INFERENCE_POLICY.md). Defaults are non-breaking (legacy single-matcher behavior reproduces because base-signal weights stay 1.0).
- **Trace contract:** every `/api/v1/normalize`, `/api/v1/normalize/batch`, `/api/v1/translate`, `/api/v1/translate/batch` response now carries `explain.v1`. Spec at [`docs/EXPLAIN_CONTRACT.md`](EXPLAIN_CONTRACT.md). Existing `trace.*` fields remain (additive); a new `trace.prior_decision_count` is included.
- **General translate:** `POST /api/v1/translate` (body `{ from_field_key, value, to_field_key, context? }`) and `POST /api/v1/translate/batch`. Resolves the from-side via the engine, walks `field_crosswalks`, and falls back to the industry concept graph when source/target are industry-canonical.
- **Verify gates:** `npm run verify:pack-health` now asserts policy consistency (`matched > suggested` per domain), explain-presence (`/api/v1/normalize` -> `explain.version === "1"`), and inference precision (reads `.generated/inference-precision-report.json`).
- **Precision report:** `npm run inference:precision` runs fixtures under `tests/fixtures/inference/*.json` and writes `.generated/inference-precision-report.json`. Baselines: `geo` 0.85, `standards` 0.85, `industry` 0.60, default 0.70. Tighten as production fixture coverage grows.
- **Dashboard surfacing:** `/dashboard/reviews` shows confidence band, domain, and an expandable Signals section sourced from `explain_payload`. Filters now include `?domain=...`.
- **Rollback:** drop the new columns (`alter table mapping_reviews drop column explain_payload, drop column confidence;`) and ship the previous app build. The legacy classifier path is reachable by reverting `normalize-service.ts` to the pre-Phase-2 commit; engine modules can stay in place.

### Phase 1 — canonical field references, modular standards, country bundles

- **Canonical refs:** consumer `field_types` (for example `company_industry`) store `feeldkit.canonical_ref.v1` on `metadata_schema`. Re-imports merge metadata unless `feeldkit.metadata_lock` is true or you pass a force-overwrite path through ingestion options.
- **Import report:** `.generated/full-v1-import-report.json` includes `field_reference_summary.field_types_with_canonical_ref` after each full import.
- **Standards modules:** `standards_currencies`, `standards_languages`, and `standards_timezones` share `field_packs.category = standards` with short display names (`Currencies`, `Languages`, `Timezones`). Migration `20260430200000_remove_legacy_standards_pack.sql` drops the legacy monolithic `standards` pack once modular packs exist.
- **Country defaults:** deterministic `geo.countries` → currency/language/timezone crosswalks are built from `src/data/country-iso2-defaults.json` (ISO-aligned defaults) joined to each country value’s `metadata.iso2` during `import:full-v1`.
- **Operator tools:** `/dashboard/packs/data` exposes parsed canonical refs; `/dashboard/packs/country-bundle?country_iso2=NL` (or `country_key=…`) returns bundled related standards with crosswalk trace.
- **Rollback:** refs are metadata-first—remove or adjust seed `metadata_schema`, or restore a prior `field_pack_versions` snapshot, then re-run `import:full-v1` without forcing overwrites on locked rows.

Recommended cadence:

1. Run dry-run weekly and inspect diff/count report.
2. Run apply monthly (or as source standards update).
3. Run verify script after each apply and before release.
4. If regression appears, restore using previous `field_pack_versions` snapshot metadata and re-run targeted import.

Phase 0 expected thresholds (release gate):

| Check | Minimum |
| --- | --- |
| `linkedin` concept codes | 150 |
| `naics` concept codes | 80 |
| LinkedIn -> NAICS `equivalent_to` edges | 50 |
| `linkedin_industry_codes` field values | 150 |
| `naics_codes` field values | 80 |

Source references used by adapters:

- Country default currency / primary language (ISO 639-3) / representative timezone mapping in `src/data/country-iso2-defaults.json` is derived from the [mledoze/countries](https://github.com/mledoze/countries) dataset (reduced fields) for deterministic crosswalk generation.
- Industry taxonomy backbone from [LinkedIn Industry Codes V2](https://learn.microsoft.com/en-us/linkedin/shared/references/reference-tables/industry-codes-v2)
- LinkedIn to NAICS equivalence from [Industry Codes V2 NAICS](https://learn.microsoft.com/en-us/linkedin/shared/references/reference-tables/industry-codes-v2-naics)
- People/job filter typology from [Search Leads reference](https://fdocs.info/api-reference/endpoint/search-leads)
- Versioned fallback snapshots for critical industry sources are in `scripts/sources/snapshots/`.

Industry interoperability notes:

1. Imports now populate concept-layer tables (`industry_concepts`, `industry_concept_codes`, `industry_concept_edges`).
2. Inferred cross-system edges are inserted as `pending` and should be reviewed in `/dashboard/industry`.
3. Translation endpoints:
   - `POST /api/v1/admin/industry/resolve`
   - `POST /api/v1/admin/industry/translate`

## Phase 0 incident runbook (source reliability)

### 1) Detect
1. Run `npm run import:full-v1 -- --dry-run`.
2. Inspect `.generated/full-v1-import-report.json` sections:
   - `source_diagnostics`
   - `preflight_checks`
   - `industry_concept_summary`
3. Run `npm run verify:pack-health`.

### 2) Classify
- `source_diagnostics.parse_ok=false` with HTTP/network errors -> upstream fetch outage/routing issue.
- `parse_ok=false` with parse errors -> source format drift.
- preflight failures with successful fetches -> low-content/coverage regression.
- integrity failures (`*_integrity` counters > 0) -> DB ingest consistency issue.

### 3) Recover
1. Retry dry-run once (temporary network failures are common).
2. Run dry-run with snapshots: `npm run import:full-v1 -- --dry-run --force-snapshots`.
3. If snapshot mode passes and network mode fails, classify as upstream availability issue and postpone apply.
4. If both fail, treat as critical data incident; do not apply ingest.
5. For production rollback, restore prior `field_pack_versions` lineage and rerun targeted import.

### 4) Verify and promote
1. Apply only when dry-run preflight checks are all `[OK]`.
2. Immediately run `npm run verify:pack-health`.
3. Confirm no `LOW` checks and no degraded `source_diagnostics` in latest report.
4. Attach report artifact to release notes/ops log.

### Snapshot refresh procedure
1. Refresh snapshot files under `scripts/sources/snapshots/` from authoritative source pages.
2. Run parser tests and dry-run.
3. Commit snapshot update with source date/version.
4. Re-run `npm run verify:pack-health` after apply to ensure parity.

## Security operations runbook

### 1) Rotate Supabase credentials
1. Open Supabase dashboard -> Project Settings -> API.
2. Rotate or reissue `service_role` key.
3. Rotate anon key if there is any chance it leaked.
4. Update deployment secrets for all environments.
5. Redeploy and verify old keys are invalid.

### 2) Lock admin to dedicated host
1. Configure DNS for admin subdomain (e.g. `admin.feeldkit.dev`).
2. Set `ADMIN_HOST` in production.
3. Verify `/dashboard` returns 404 when accessed from non-admin hosts.

### 3) Restrict who can sign in
1. Set `ADMIN_ALLOWED_EMAILS` and/or `ADMIN_ALLOWED_EMAIL_DOMAINS`.
2. Keep at least one break-glass admin email in the explicit list.
3. Verify disallowed emails receive `/login?error=unauthorized`.

### 4) Apply migrations safely
1. Apply SQL migrations in order to target Supabase project.
2. Confirm `profiles` update protections are active.
3. Validate non-admin users cannot change profile role/org fields.

### 5) Add edge protections
1. Add WAF rate limits for `/api/v1/*` by IP.
2. Add stricter burst limits for `/login` and `/auth/*`.
3. Enable bot mitigation/challenges where appropriate.
4. Review 429/403 logs and tune thresholds.

### 6) AI enrichment failure/fallback
1. If `OPENAI_API_KEY` is missing or provider fails, enrichment falls back to heuristic provider.
2. Proposals remain `pending`; no canonical writes happen until explicit approval.
3. If AI quality dips, raise `FEELDKIT_AI_MIN_CONFIDENCE` and reduce `FEELDKIT_AI_MAX_PROPOSALS_PER_RUN`.
4. For large dashboard batches, jobs are queued; run `npm run process:enrichment-jobs` via cron/worker process.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, and `test:run` on push and PRs.
