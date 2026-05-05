# Governance & audit (Phase 4)

FeeldKit governance captures **per-organization confidence policy**, **field locks**, **deterministic flow overrides**, and an **audit log** for every privileged mutation.

## Data model

| Table | Purpose |
| ----- | ------- |
| `org_policy_overrides` | Domain-level `{ matched, suggested }` thresholds (same domains as `DOMAIN_POLICIES`). |
| `org_field_locks` | Per-field-key governance modes (`require_review`, `disable_auto_apply`). |
| `flow_pack_overrides` | Per-org deterministic tweaks (`skip`, `replace`, `lock`, `pin_version`). |
| `promoted_decisions` | Reversible ledger tying dashboard approvals to `field_aliases` / `field_crosswalks` snapshots. |
| `audit_logs` | Append-only narrative (`action`, `entity_type`, `before`, `after`). |

`mapping_reviews.decision_audit_id` stores the latest governance audit pointer for that row.

## API scopes

| Scope | Capability |
| ----- | ---------- |
| `admin:policies` | Read/write governance rows (`policy`, `field-locks`, `flow-overrides` GET/PUT/DELETE where implemented). |
| `admin:flows` | Flow override inserts (`PUT flow-overrides`), lifecycle endpoints (`POST flows/{key}/rollback`, `POST flows/{key}/versions/{semver}/retire`). |
| `admin:reviews` | Review undo (`POST admin/reviews/{id}/undo`) & audit reads (`GET admin/audit`). |

Dashboard defaults gate privileged scopes to organization **owners**.

## Undo semantics (`promoted_decisions`)

Approving a review captures:

1. `snapshot_before`: `{} | FieldAliasSnapshot | { absent: true }`
2. The canonical mutation (`field_aliases` upsert).
3. Audit (`review.approve`) plus `promoted_decisions` with `snapshot_after`.

`Undo`:

1. Restores alias snapshot OR deletes inserted alias (`absent` marker).
2. Marks review `pending` again (`mapping_reviews`).
3. Writes `review.undo` audit + stamps `promoted_decisions.reverted_at`.

## Flow lifecycle & rollback

`flow_pack_versions` carries:

- `lifecycle ∈ {draft,published,retired}`
- `published_at`, `retired_at`

`npm run flows:ingest` stamps `lifecycle=published`, sets `published_at`, clears `retired_at`, and promotes the ingested semver.

`npm run flows:rollback -- <flow_key> --to <semver>` reproduces the API rollback (demote siblings, promote target).

## Explain contract additions

`explain.v1.policy` may include additive metadata:

- `thresholds_source`: `"default" | "org_override"`
- `lock`: `"require_review" | "disable_auto_apply" | null`

See `docs/EXPLAIN_CONTRACT.md`.

## Operational checklist

1. Apply migrations `20260506000000_phase4_governance.sql` and `20260506100000_phase4_wave2_flow_lifecycle.sql`.
2. `npm run flows:ingest` after Wave 2 migration (fills lifecycle columns).
3. `npm run verify:pack-health` (includes governance + lifecycle gates).
