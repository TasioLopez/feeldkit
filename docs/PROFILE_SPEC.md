# Phase 6 Profile Schemas

FeeldKit ships two portable JSON contracts in Phase 6 — both are forward-compatible (the schema string carries the major version; readers refuse mismatched majors).

| Schema | Purpose | Consumed by |
| ------ | ------- | ----------- |
| `feeldkit.simulation_profile.v1` | Pre-deploy validation: a flow_key + sample records + assertions, used to dry-run a flow against a target environment. | `client.simulate()`, `npm run simulate`, `POST /api/v1/flow/simulate` |
| `feeldkit.org_config_profile.v1` | Cross-environment governance: a single bundle of an org's policy overrides, field locks, flow-pack overrides, and promotion settings. Lets you ship config from staging to prod with a diff. | `client.admin.profiles.export()`, `npm run profile:export` / `profile:import`, `GET/POST /api/v1/admin/profile/{export,import}` |

Both schemas are stable for the lifetime of v1. Bumping a major (`*.v2`) is a coordinated release across server, SDK, and CLI.

---

## simulation_profile.v1

```jsonc
{
  "schema": "feeldkit.simulation_profile.v1",
  "flow_key": "linkedin_salesnav__hubspot",
  "version": "1.0.0",                    // optional; latest active when omitted
  "organization_id": "uuid",             // optional; usually inferred from API key
  "context": { "source_locale": "en-US" },
  "cases": [
    {
      "name": "fully populated record",
      "source_record": {
        "full_name": "Ada Lovelace",
        "company_name": "FeeldKit",
        "company_industry": "Computer Software",
        "company_country": "NL"
      },
      "expected": {
        "matched_targets": ["firstname", "lastname", "company"],
        "unmapped_targets": [],
        "skipped_targets": [],
        "status": "ok"                  // "ok" | "incomplete" | "not_found"
      }
    }
  ]
}
```

### Server contract

`POST /api/v1/flow/simulate` accepts the bundle as the request body, runs `runFlow` against each case, and **never persists `mapping_reviews` rows**. The response is a per-case report:

```jsonc
{
  "flow":        { "key": "linkedin_salesnav__hubspot", "version": "1.0.0" },
  "total_cases": 1,
  "passed_cases": 1,
  "cases": [
    {
      "name": "fully populated record",
      "status": "ok",
      "fields": [ /* FlowFieldOutput[] with explain.v1 per translate hit */ ],
      "unmapped": [],
      "passed": true,
      "failures": [],
      "would_be_reviews": 0
    }
  ],
  "trace": {
    "engine_version": "1",
    "deterministic_only": true,
    "flow_pack_version_id": "uuid-or-null",
    "dry_run": true,
    "persisted_review_count": 0
  }
}
```

### Assertion semantics

A case `passes` iff:

- `expected.status` (when set) equals the engine status, AND
- every key in `expected.matched_targets` corresponds to a field with status `matched`, AND
- every key in `expected.unmapped_targets` corresponds to a field with status `unmapped` (or `unmatched` when required), AND
- every key in `expected.skipped_targets` corresponds to a field with status `skipped`.

`failures` enumerates the assertion mismatches as human-readable strings; an empty `expected` skips assertions entirely (the case still runs and is reported, just always passing).

---

## org_config_profile.v1

```jsonc
{
  "schema": "feeldkit.org_config_profile.v1",
  "manifest": {
    "exported_at": "2026-05-07T19:00:00Z",
    "source_organization_id": "uuid",
    "feeldkit_app_version": "0.1.0",        // from root package.json (nullable)
    "schema_version": 1
  },
  "promotion_settings": {
    "default_scope": "org",                 // "org" | "global"
    "opt_out_global_propose": false,
    "notes": null
  },
  "policy_overrides": [
    {
      "domain": "industry",                 // DomainKey enum
      "matched": 0.92,
      "suggested": 0.7,
      "notes": null
    }
  ],
  "field_locks": [
    {
      "field_key": "company_country",
      "mode": "require_review",             // "require_review" | "disable_auto_apply"
      "reason": "GDPR audit, May 2026"
    }
  ],
  "flow_pack_overrides": [
    {
      "flow_key": "linkedin_salesnav__hubspot",
      "flow_pack_version": "1.0.0",         // nullable; used for pin_version
      "ordinal": 4,                         // nullable for pin_version
      "action": "skip",                     // "skip" | "replace" | "lock" | "pin_version"
      "payload": {},
      "notes": null
    }
  ]
}
```

### Logical keys (no UUIDs)

The export deliberately strips opaque IDs and stores only **logical keys** so the bundle can be applied to any environment:

| Source row                  | Logical key in export |
| --------------------------- | --------------------- |
| `org_policy_overrides`      | `domain`              |
| `org_field_locks`           | `field_key`           |
| `flow_pack_overrides`       | `flow_pack.key` (+ `flow_pack_version.version` when `pin_version`) + `ordinal` |
| `org_promotion_settings`    | (singleton per org)   |

Imports re-resolve logical keys against the target env's catalog. If a `flow_key` or `domain` does not exist on the target, the import records a conflict (rather than silently dropping).

### Import semantics

`POST /api/v1/admin/profile/import` body:

```jsonc
{
  "profile": { /* org_config_profile.v1 */ },
  "dry_run": true   // default false; when true, the server resolves all keys, computes the diff, but writes nothing
}
```

Response:

```jsonc
{
  "ok": true,
  "dry_run": true,
  "applied": {
    "promotion_settings": 1,
    "policy_overrides": 3,
    "field_locks": 2,
    "flow_pack_overrides": 0
  },
  "conflicts": [
    {
      "section": "flow_pack_overrides",
      "reason": "flow_not_found",
      "detail": { "flow_key": "salesnav__pipedrive" }
    }
  ],
  "audit_id": "uuid-or-null"   // single audit_logs row recorded for the import
}
```

Behavior rules:

- **Atomic-ish**: each section is upserted with its own DB call; partial failures are surfaced via `conflicts` but committed sections are kept (the operator runs `dry_run` first to avoid surprises).
- **Audit**: every non-dry-run import writes a single `audit_logs` row with `action='profile.import'`, before/after snapshots in the JSON payload.
- **Authorization**: the API requires `admin:policies + admin:flows + admin:promotions` scopes on the calling key. The org_id is taken from the API key — there is no cross-org override.
- **Idempotency**: re-importing the same profile against the same org is a no-op (zero applied counts, zero conflicts) modulo timestamp updates.

### Conflict reasons

| `reason`                       | Where                  | Meaning |
| ------------------------------ | ---------------------- | ------- |
| `unknown_domain`               | policy_overrides       | The exported `domain` is not in the current `DomainKey` enum on the target. |
| `flow_not_found`               | flow_pack_overrides    | The exported `flow_key` does not exist on the target. |
| `flow_version_not_found`       | flow_pack_overrides    | `pin_version` referenced a version not present on target. |
| `invalid_thresholds`           | policy_overrides       | matched/suggested fail the consistency check. |
| `unknown_lock_mode`            | field_locks            | The exported `mode` is no longer accepted. |

---

## Versioning + drift protection

- The `verify:pack-health` script asserts `profile_schema_versions_locked` — the SHA-256 of the type definitions in [`packages/sdk/src/types.ts`](../packages/sdk/src/types.ts) is recorded; bumping the schema requires consciously updating the recorded checksum.
- A round-trip gate (`profile_export_roundtrip`) exports an org config, re-imports it with `dry_run`, and asserts zero diff — guards against import path bugs.

## Operator checklist

Per environment:

1. Apply Phase 6 deploy (no migrations required; governance tables exist as of Phase 4–5).
2. Smoke `GET /api/v1/admin/profile/export` for one org with non-default config.
3. Save the JSON, then `POST /admin/profile/import` with `dry_run: true` and assert `applied.*` matches what's already there and `conflicts: []`.
4. Sandbox a profile from staging into a fresh prod org, with `dry_run: true`, review diff, then re-run with `dry_run: false`.
5. `npm run verify:pack-health` to confirm the new gates pass.
