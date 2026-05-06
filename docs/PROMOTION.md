# Promotion & learning loop (Phase 5)

FeeldKit's promotion engine turns approved reviews and AI enrichment proposals
into reusable mapping intelligence. It supports two scopes (org-staging and
global seed), an explicit curator step for crossing into the global seed, and a
versioned changelog of everything that lands.

## Data model

| Table | Purpose |
| ----- | ------- |
| `org_field_aliases` | Org-staging mirror of `field_aliases`. Org-approved review aliases land here unless the org is configured for `default_scope='global'`. |
| `org_field_values` | Org-staging mirror of `field_values`. AI proposal approvals (label / key additions) land here first. |
| `org_field_crosswalks` | Org-staging mirror of `field_crosswalks`. Future crosswalk approvals (e.g. linkedin↔naics edges from review) land here first. |
| `org_promotion_settings` | Per-org governance: `default_scope ∈ {org, global}`, `opt_out_global_propose`, free-form notes. |
| `promotion_proposals` | Queue + ledger of proposals (`approved_org`, `pending_global`, `approved_global`, `rejected`, `superseded`). |
| `promoted_decisions` | Existing ledger from Phase 4. Phase 5 extends `target_table` to also accept `org_field_aliases / org_field_values / org_field_crosswalks` so undo can target either scope. |

## Scope decision

When a review (or AI proposal) is approved by an **org admin**:

```
settings = org_promotion_settings[org_id] | DEFAULT { scope='org', opt_out=false }

if settings.scope == 'global' AND NOT settings.opt_out:
    apply -> global table (field_*)
    proposals += { status: 'approved_global' }

else:
    apply -> org-staging table (org_field_*)
    proposals += { status: 'approved_org' }
    if NOT settings.opt_out:
        proposals += { status: 'pending_global' }   # curator queue (Wave 2)
```

A platform admin (curator, Wave 2) reviews `pending_global` proposals and
either approves them (re-applies the change to the global table + flips status
to `approved_global`) or rejects them.

## Engine API

```ts
import { applyPromotion } from "@/lib/promotion/engine";

const res = await applyPromotion({
  admin,
  scope: "org" | "global",
  organizationId,
  actorId,
  payload:
    | { target: "field_aliases", fieldTypeId, fieldValueId, alias, normalizedAlias, ... }
    | { target: "field_values", fieldTypeId, key, label, normalizedLabel, ... }
    | { target: "field_crosswalks", fromFieldTypeId, fromValueId, toFieldTypeId, toValueId, crosswalkType, ... },
});
// res.resolvedTable is one of:
//   field_aliases | field_values | field_crosswalks |
//   org_field_aliases | org_field_values | org_field_crosswalks
```

`revertPromotion(...)` mirrors this and is used by the undo flow.

## Review/proposal flow

`promoteReviewApproval(...)` in `src/lib/promotion/review-flow.ts` is the
single entry point used by the dashboard server actions:

1. resolves scope from `org_promotion_settings`,
2. calls `applyPromotion` (handles upsert + snapshot capture),
3. writes `audit_logs` (`review.approve.org`, `review.approve.global`,
   `enrichment_proposal.approve.org`, `enrichment_proposal.approve.global`),
4. inserts a `promotion_proposals` row reflecting the resulting state,
5. inserts a `promoted_decisions` ledger row,
6. links `mapping_reviews.decision_audit_id`,
7. when scope='org' and the org permits global propose, also inserts a
   `pending_global` proposal so a platform admin can curate it.

## Undo

`undoPromotedReviewDecision` in `src/lib/reviews/review-promotion.ts` resolves
the latest non-reverted `promoted_decisions` row for the review, calls
`revertPromotion` against the resolved table (`field_*` or `org_field_*`),
writes a `review.undo` audit, and flips the mapping review back to `pending`.
Wave 2 adds `undoPromotedProposalDecision` for AI enrichment proposals.

## Metrics

`npm run promotion:metrics` writes `.generated/promotion-metrics-report.json`:

```json
{
  "proposals_total": 42,
  "proposals_by_status": { "approved_org": 30, "pending_global": 8, "approved_global": 4, "rejected": 0, "superseded": 0 },
  "proposals_by_source": { "review": 35, "enrichment_proposal": 7 },
  "reverts_total": 1,
  "revert_rate_30d": 0.025,
  "repeated_review_inputs_30d": 14,
  "auto_apply_lift_30d": { "approved_inputs": 18, "re_observed_inputs": 9 },
  "per_org": [ ... ]
}
```

## Verify gates

`npm run verify:pack-health` adds:

- `promotion_tables_present` — `org_field_aliases`, `org_field_values`,
  `org_field_crosswalks`, `org_promotion_settings`, `promotion_proposals`.
- `promotion_proposals_consistent` — `status` and `target_table` membership;
  `approved_global` rows must carry `audit_log_id`.
- The existing `promoted_decisions_link_intact` gate now also accepts
  `org_field_*` target tables.

## API surface (Wave 2)

Curator endpoints require API scope `admin:promotions`. Org-level admin scopes
(`admin:reviews`, `admin:policies`, `admin:flows`) are insufficient; this is
how cross-org curation is gated at the key layer. In-dashboard curator
controls require profile role `platform_admin`.

| Method | Path | Scope | Behaviour |
| ------ | ---- | ----- | --------- |
| `GET` | `/api/v1/admin/promotions?status=pending_global&limit=50` | `admin:promotions` | List proposals (cross-org if no `x-feeldkit-organization-id` header). |
| `POST` | `/api/v1/admin/promotions/{id}/approve` | `admin:promotions` | Re-apply payload to global table; flip status to `approved_global`; audit + ledger row. |
| `POST` | `/api/v1/admin/promotions/{id}/reject` | `admin:promotions` | Flip status to `rejected`; audit. |
| `POST` | `/api/v1/admin/proposals/{id}/undo` | `admin:reviews` | Reverse all promoted_decisions tied to an enrichment proposal; flip proposal to `pending`. |
| `GET` / `PUT` | `/api/v1/admin/governance/promotion-settings` | `admin:policies` | Read or upsert `org_promotion_settings` (`default_scope`, `opt_out_global_propose`, notes). |

## Operational checklist

### Wave 1 — engine + data model

1. Apply migration `20260507000000_phase5_promotion_engine.sql`.
2. (Optional) seed `org_promotion_settings` for any org that should default to
   `global` scope. Otherwise the safe default (`org`, propose to global)
   applies.
3. Deploy app revision containing `src/lib/promotion/*` and the refactored
   review approval action.
4. `npm run typecheck && npm run test:run && npm run lint`.
5. `npm run verify:pack-health` (Phase 5 gates green).
6. Smoke: approve a review in `/dashboard/reviews`, confirm the new alias
   landed in `org_field_aliases`, and confirm two `promotion_proposals` rows
   (one `approved_org`, one `pending_global`).

### Wave 3 — registry + public API + dashboards

1. Apply migration `20260507100000_phase5_wave3_promoted_intelligence.sql`.
2. After `promoted_decisions` rows exist, run `npm run promote:rollup` (use `PROMOTE_ROLLUP_DRY_RUN=1` first if you want a console preview).
3. Open `/dashboard/promotions/registry` — versions should list; curator queue at `/dashboard/promotions`.
4. Changelog feed (scoped key): `GET /api/v1/promoted-intelligence/versions` and
   `GET /api/v1/promoted-intelligence/versions/{semver}` with scope `read:promoted-intelligence` (included in default API key scopes).
5. `npm run verify:pack-health` — Wave 3 checks `promoted_intelligence_*` tables exist; entry consistency is enforced when rows exist; absence of registry versions logs `[WARN]` until the first rollup.

### Wave 2 — curator + governance APIs

1. Issue an API key with scope `admin:promotions` to your platform-admin
   tooling (CLI, internal dashboard, etc.).
2. Smoke (with `BASE_URL`, `API_KEY`, `ORG_ID`, and a known
   `pending_global` proposal `PID`):

   ```bash
   GET  /api/v1/admin/promotions?status=pending_global&limit=10
   POST /api/v1/admin/promotions/{PID}/approve   # body: { "notes": "phase5 smoke" }
   POST /api/v1/admin/proposals/{PID}/undo       # for AI proposal undo round-trip
   PUT  /api/v1/admin/governance/promotion-settings   # body: { default_scope, opt_out_global_propose }
   ```

3. Verify gates: `proposals_total` and `proposals_by_status` from
   `npm run promotion:metrics` reflect the new approve/reject events.
