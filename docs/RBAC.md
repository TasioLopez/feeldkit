# RBAC

FeeldKit separates platform authority from organization authority.

## Roles

| Layer | Column/table | Roles | Purpose |
| --- | --- | --- | --- |
| Platform | `profiles.platform_role` | `none`, `platform_admin`, `super_admin` | Global FeeldKit operations such as promotion curation. |
| Organization | `organization_memberships.role` | `owner`, `admin`, `editor`, `viewer` | Per-organization dashboard and configuration permissions. |

`profiles.role` and `profiles.organization_id` remain during the transition for compatibility, but new authorization code should use `platformRole` and `orgRole` from `getActorContext()`.

## Production Account Shape

The production operator account should have both:

- `profiles.platform_role = 'super_admin'` or `'platform_admin'`
- `organization_memberships.role = 'owner'` for the FeeldKit organization

These are intentionally independent. A platform admin does not automatically own every org, and an org owner cannot approve global promotions unless they also hold a platform role.

## Permission Rules

- Dashboard org mutations use org roles: `owner` and `admin` can manage reviews, governance, enrichment, and flow operations.
- API key management is org-scoped: `owner` and `admin` can manage keys, but only org `owner` can issue `admin:*` scopes.
- Promotion curator decisions use platform roles: `platform_admin` and `super_admin`.
- Public API authorization is unchanged: API keys are validated by `x-api-key` scopes.

## Bootstrap And Login

Admin dashboard login at `admin.feeldkit.dev/login` is restricted by `ADMIN_ALLOWED_EMAILS` or `ADMIN_ALLOWED_EMAIL_DOMAINS`. In production, one of those allowlists must be set; without it, callback authorization denies dashboard access. Admin login is existing-user-only and should not create arbitrary Supabase auth users.

User workspace login at `feeldkit.dev/app/login` is separate from the admin allowlist. It is for normal workspace users, supports first-time self-serve signup, and redirects through `/auth/app/callback` on the public host.

`ensureAppProfileForUser()` creates:

- a `profiles` identity row with `platform_role = 'none'`
- a default organization
- an `organization_memberships` row with `role = 'owner'`

`ensureAdminProfileForUser()` repairs the same identity/membership shape for allowlisted admin users, but it still does not grant platform authority automatically.

Platform roles should be assigned explicitly by migration or direct administrative operation, not by signup.

## Database Enforcement

`organization_memberships` is the source of truth for org membership RLS. Org-scoped read policies use active memberships, while privileged writes remain server-action/service-role paths. `api_keys` reads are limited to active `owner` or `admin` memberships.
