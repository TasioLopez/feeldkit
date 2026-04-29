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

- `npm run import:pack -- <pack-key>`
- `npm run update:pack -- <pack-key> <version>`

For full production V1 imports (geo, standards, industry, jobs):

- `npm run import:full-v1 -- --dry-run` (report-only into `.generated/full-v1-import-report.json`)
- `npm run import:full-v1` (apply ingest)
- `npm run verify:pack-health` (checks minimum package coverage thresholds)
- `npm run process:enrichment-jobs` (process pending queued enrichment jobs)

Recommended cadence:

1. Run dry-run weekly and inspect diff/count report.
2. Run apply monthly (or as source standards update).
3. Run verify script after each apply and before release.
4. If regression appears, restore using previous `field_pack_versions` snapshot metadata and re-run targeted import.

Source references used by adapters:

- Industry taxonomy backbone from [LinkedIn Industry Codes V2](https://learn.microsoft.com/en-us/linkedin/shared/references/reference-tables/industry-codes-v2)
- LinkedIn to NAICS equivalence from [Industry Codes V2 NAICS](https://learn.microsoft.com/en-us/linkedin/shared/references/reference-tables/industry-codes-v2-naics)
- People/job filter typology from [Search Leads reference](https://fdocs.info/api-reference/endpoint/search-leads)

Industry interoperability notes:

1. Imports now populate concept-layer tables (`industry_concepts`, `industry_concept_codes`, `industry_concept_edges`).
2. Inferred cross-system edges are inserted as `pending` and should be reviewed in `/dashboard/industry`.
3. Translation endpoints:
   - `POST /api/v1/admin/industry/resolve`
   - `POST /api/v1/admin/industry/translate`

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
