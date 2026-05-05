# `explain.v1` contract

Every `/api/v1/normalize`, `/api/v1/normalize/batch`, `/api/v1/translate`, `/api/v1/translate/batch` response — and every translate-kind field in the Phase 3 `/api/v1/flow/translate` (and batch) responses (see [`docs/FLOW_PACK_SPEC.md`](FLOW_PACK_SPEC.md)) — carries a structured `explain` object. The shape is versioned (`version: "1"`) so future changes can ship under `explain.v2` without breaking existing consumers.

## Top-level

```json
{
  "version": "1",
  "field_key": "company_industry",
  "resolved_field_key": "linkedin_industry_codes",
  "decision": { "status": "matched", "band": "high", "needs_review": false },
  "winner": { "value_id": "...", "key": "computer-software", "label": "Computer Software", "final_score": 0.95 },
  "alternates": [{ "value_id": "...", "key": "...", "label": "...", "final_score": 0.72 }],
  "signals": [
    {
      "kind": "exact_alias",
      "source": "field_aliases",
      "raw_score": 0.95,
      "weight": 1.0,
      "contribution": 0.95,
      "ref": { "table": "field_aliases", "id": "..." },
      "metadata": { "locale": null, "alias_source": "review_approval" }
    }
  ],
  "policy": {
    "domain": "industry",
    "thresholds": { "matched": 0.92, "suggested": 0.7 },
    "reason": "score>=0.92 for domain=industry",
    "thresholds_source": "org_override",
    "lock": null
  },
  "priors": { "decision_count": 0, "last_decision_at": null }
}
```

## Field-by-field

| Path | Type | Notes |
| --- | --- | --- |
| `version` | `"1"` | Bump when the shape changes incompatibly |
| `field_key` | string | The exact `field_key` the caller sent |
| `resolved_field_key` | string | The canonical key after `feeldkit.canonical_ref.v1` resolution |
| `decision.status` | `matched \| suggested \| review \| unmatched` | Mirrors top-level `status` |
| `decision.band` | `high \| mid \| low` | Set by the policy classifier |
| `decision.needs_review` | bool | True when the response was enqueued for human review |
| `winner` | object \| null | Always populated for `matched`/`suggested`, may be null for `unmatched` |
| `winner.final_score` | number 0..1 | Sum of base evidence + bounded soft boosts |
| `alternates` | array | Up to 4 next-best candidates |
| `signals` | array | Signals that contributed to the **winner** (not all candidates) |
| `signals[].kind` | string | One of the `SignalKind` values in `signal.ts` |
| `signals[].ref` | object \| undefined | Pointer back to the row that produced the signal (alias, value, crosswalk) |
| `policy` | object | Policy that classified this score |
| `policy.thresholds` | `{ matched, suggested }` | Snapshot, in case a domain policy is retuned later |
| `policy.thresholds_source` (optional) | `"default" \| "org_override"` | Phase 4 governance — whether thresholds came from code defaults vs `org_policy_overrides` |
| `policy.lock` (optional) | `"require_review" \| "disable_auto_apply" \| null` | Phase 4 — active `org_field_locks.mode` for this field key, if any |
| `priors.decision_count` | int | Approved/aliased decisions for the **(field_type, normalized_input)** pair |
| `priors.last_decision_at` | string \| null | ISO timestamp of the most recent matching prior decision |

## Stability guarantees

- **Additive only within `v1`**: new optional fields may be added; existing fields keep their type and meaning.
- **Snapshotted on review enqueue**: when `decision.needs_review` is `true`, the `explain` payload is persisted on `mapping_reviews.explain_payload` so the dashboard can render the same structured view later.
- **Translate uses the same shape**: `/api/v1/translate` emits an `explain` object describing how the **target** candidate was reached, not the from-side resolution. The from-side trace is exposed under `trace.from_*` fields.
- **Flow translate fields embed `explain`**: each `field` returned by `/api/v1/flow/translate` (translate-kind only) carries the same `explain.v1` payload, so reviewers can see exactly why a value was auto-applied, suggested, or kicked back as `unmapped`.

## Consuming `explain` in clients

- Treat `signals[]` as a **debug surface**: render in tooltips or expandable rows; don't gate auto-apply logic on it.
- Trust `decision.status` + `decision.band` for routing decisions.
- For learning loops, use `winner.value_id` plus `priors.decision_count` to back-fill confidence scoring.
- For governance, store the full payload (it is JSONB-friendly and matches what `mapping_reviews.explain_payload` keeps).

## Versioning policy

When breaking the shape becomes unavoidable, ship `explain.v2` alongside `explain.v1`. The engine emits `version` so consumers can dispatch on it. Deprecation of v1 requires:

1. A migration window with both versions in the response.
2. A note in `docs/EXPLAIN_CONTRACT.md` and `CHANGELOG`.
3. A bump in the dashboard `tryParseExplain` to fall back gracefully.
