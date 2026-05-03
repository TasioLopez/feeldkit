# Inference Policy (Phase 2 V1)

The inference engine routes a normalize/translate decision into one of three bands using per-domain thresholds:

| Band | Status | Behavior |
| --- | --- | --- |
| `high` | `matched` | Auto-apply, no review queued |
| `mid` | `suggested` | Returned to caller, no review queued |
| `low` | `review` | Suggestion enqueued for human triage |

## Domain thresholds

Defined in [`src/lib/matching/inference/policy.ts`](../src/lib/matching/inference/policy.ts).

| Domain | matched | suggested | Notes |
| --- | --- | --- | --- |
| `default` | 0.90 | 0.65 | Fallback when no rule matches |
| `industry` | 0.92 | 0.70 | Tighter to avoid sibling bleed |
| `geo` | 0.95 | 0.75 | Country/subdivision precision-critical |
| `standards` | 0.97 | 0.85 | Currencies, languages, timezones (ISO-driven) |
| `jobs` | 0.90 | 0.65 | Long-tail, default for now |
| `company` | 0.90 | 0.65 | Default while we tune |
| `tech` | 0.90 | 0.65 | Vendor/category, alias-heavy |
| `web` | 0.85 | 0.60 | Parser-driven domains/social URLs |

`assertPolicyConsistency()` is run by `verify:pack-health` to ensure `matched > suggested` for every domain.

## Domain inference

The engine maps a `field_key` to a domain in `inferDomain(fieldKey)` using prefix/keyword rules. When a consumer field declares a `feeldkit.canonical_ref.v1`, the engine resolves to the canonical key first, then applies the domain inference. Examples:

- `countries`, `subdivisions`, `company_country` → `geo`
- `linkedin_industry_codes`, `naics_codes`, `company_industry` → `industry`
- `currencies`, `languages`, `timezones` → `standards`
- `email_domains`, `social_urls` → `web`

## Signals and weights

Each matcher emits `Signal[]` per candidate value. The scorer ([`src/lib/matching/inference/scorer.ts`](../src/lib/matching/inference/scorer.ts)) anchors the score to the strongest base evidence and adds bounded soft boosts:

- `prior_decision` boost capped at +0.10
- `hierarchy_match` boost capped at +0.06
- soft signals (`locale_preference`, `alias_source_trust`, `context_*`) total capped at +0.15

Default weights and per-domain overrides live in [`src/lib/matching/inference/weights.ts`](../src/lib/matching/inference/weights.ts).

## Tuning loop

1. Add a fixture under `tests/fixtures/inference/<domain>.json` covering the failure cases.
2. Run `npm run inference:precision` and inspect `.generated/inference-precision-report.json`.
3. Adjust `weights.ts` or `policy.ts`; keep `matched > suggested` and re-run `npm run test:run` plus `npm run verify:pack-health`.
4. Document the change in `docs/EXPLAIN_CONTRACT.md` if the visible signal set changes.

## Operational defaults

The engine is enabled by default in [`src/lib/matching/normalize-service.ts`](../src/lib/matching/normalize-service.ts). The legacy single-matcher behavior is preserved by setting all base-signal weights to `1.0`, so the strongest matcher score still wins when no soft signals fire.
