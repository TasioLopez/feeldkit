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

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, and `test:run` on push and PRs.
