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

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, and `test:run` on push and PRs.
