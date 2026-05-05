# `feeldkit.flow_pack.v1` — Flow Pack Specification

This document specifies the contract, runtime behavior, and governance rules for **flow
packs** introduced in Phase 3 (see [`docs/ROADMAP.md`](ROADMAP.md) and
[`docs/PLAN_MAPPING_INTELLIGENCE_MASTER.md`](PLAN_MAPPING_INTELLIGENCE_MASTER.md)).

A flow pack is a deterministic, versioned source -> target mapping (e.g. `linkedin_salesnav -> hubspot`).
JSON files in `src/data/flows/*.flow.json` are the authored source of truth; the ingest
script writes corresponding rows in Postgres for runtime use.

## Authoring contract

```jsonc
{
  "contract": "feeldkit.flow_pack.v1",
  "key": "linkedin_salesnav__hubspot",
  "name": "LinkedIn Sales Navigator -> HubSpot",
  "description": "...",
  "source_system": "linkedin_salesnav",
  "target_system": "hubspot",
  "version": "1.0.0",
  "changelog": "Initial baseline flow.",
  "metadata": { "...": "free-form, indexed for governance" },
  "field_mappings": [
    {
      "kind": "direct",
      "source_field_key": "headline",
      "target_field_key": "jobtitle",
      "is_required": false,
      "transform": { "op": "trim" }
    },
    {
      "kind": "translate",
      "source_field_key": "company_industry",
      "target_field_key": "company_industry",
      "is_required": false,
      "options": {
        "require_deterministic": true,
        "min_confidence": 0.95
      }
    }
  ]
}
```

Validation lives at [`src/lib/flows/schema.ts`](../src/lib/flows/schema.ts) (`flowPackV1Schema`).

### Mapping kinds

| Kind | Purpose | Engine path |
| --- | --- | --- |
| `direct` | Copy/transform a source field into a target field with no value-set translation. | [`src/lib/flows/transforms.ts`](../src/lib/flows/transforms.ts) |
| `translate` | Translate the source value through canonical fields, crosswalks, and the industry concept graph. Calls `translateOne`. | [`src/lib/translate/translate-service.ts`](../src/lib/translate/translate-service.ts) |

### Direct transforms

| `op` | Notes |
| --- | --- |
| `copy` | Pass through the input string. Empty strings collapse to `null`. |
| `lower` / `upper` | Lower/upper-case the input. |
| `trim` | Strip leading/trailing whitespace. |
| `regex_replace` | `params.pattern` (string), optional `params.flags`, optional `params.replacement` (default `""`). |
| `split_join` | `params.split_on` (default `" "`), `params.take` ∈ `"first"\|"last"\|"rest"\|"all"\|"<index>"`, `params.join` (default = `split_on`), `params.trim` (default `true`). |

A transform that yields an empty/missing string returns the field as `status: "skipped"` so the
runtime can distinguish authored intent from runtime gaps.

### Translate options

```ts
{
  require_deterministic?: boolean // default true — only crosswalk/exact_value/concept_graph hits auto-apply
  min_confidence?: number         // default 0.95 — clamp before auto-applying a translate hit
}
```

V1 always runs in `require_deterministic: true` mode. If a `translate` rule produces a non-deterministic
match (or one below the confidence floor), the runtime emits `status: "unmapped"` with `reason`
explaining why and surfaces the underlying `explain.v1` payload.

## Runtime behavior

`runFlow({ flow_key, version?, source_record, organization_id?, context? })` resolves the
active version (or pinned `version`) and iterates field mappings deterministically. Each
returned field has the shape:

```ts
{
  ordinal: number,
  kind: "direct" | "translate",
  source_field_key: string,
  target_field_key: string,
  status: "matched" | "unmatched" | "unmapped" | "skipped" | "suggested",
  value: string | null,
  confidence: number,
  reason: string | null,
  is_required: boolean,
  explain: ExplainV1 | null   // only on translate-kind responses (see EXPLAIN_CONTRACT.md)
}
```

`status` semantics:

- `matched` — direct transform produced a value, or translate rule found a deterministic
  candidate at or above `min_confidence`.
- `skipped` — source field absent or transform produced empty output. Not an error.
- `unmapped` — translate rule found no deterministic candidate (or scored below
  `min_confidence`). The output should route through the standard review queue.
- `unmatched` — internal translate failure (engine error). Rare.

The response also includes `trace`:

```ts
{
  engine_version: "1",
  deterministic_only: true,
  flow_pack_version_id: string | null,
  fallbacks: { translate_via_inference_count: 0 }
}
```

## API surface

| Route | Scope | Purpose |
| --- | --- | --- |
| `POST /api/v1/flow/translate` | `normalize` | Run the flow against one source record |
| `POST /api/v1/flow/translate/batch` | `normalize` | Same, for up to 100 records |
| `GET /api/v1/flows` | `read:flows` | List active flow packs |
| `GET /api/v1/flows/{flowKey}` | `read:flows` | Inspect a flow + active version mappings |
| `GET /api/v1/flows/{flowKey}/versions/{version}` | `read:flows` | Inspect a specific (pinned) version |

`read:flows` is part of `ALL_API_KEY_SCOPES` and is included in `DEFAULT_API_KEY_SCOPES`, so
new keys can call the listing endpoints without further configuration. Translate routes still
require the existing `normalize` scope to keep parity with `/api/v1/normalize`.

The dashboard at `/dashboard/flows` provides a UI mirror for the same data and an inline
test form that posts to the public route under the current session.

## Versioning and rollout

- `version` in the JSON is treated as immutable. Changes to mappings require a new semver.
- `npm run flows:ingest` upserts the flow_pack, inserts/updates the targeted version row,
  marks it `is_active = true`, and demotes other versions of the same flow.
- Field mapping rows are denormalized for query speed; ingest deletes and re-inserts them.
- Dropping all flow tables is a safe full rollback: `drop table flow_pack_field_mappings,
  flow_pack_versions, flow_packs cascade;`.

## Governance & security

- All flow tables expose **public read** RLS (mirroring `field_packs`). Writes go through the
  service role only — there is no per-org write path in V1.
- Per-org overrides (`flow_pack_overrides`) ship in Phase 4 — see [`docs/GOVERNANCE.md`](GOVERNANCE.md) and `trace.applied_overrides` on `/api/v1/flow/translate` responses.
- The runtime never auto-applies non-deterministic candidates in V1, so a misconfigured flow
  cannot widen the auto-apply blast radius beyond Phase 2's existing thresholds.

## Verify gates

`npm run verify:pack-health` adds:

| Gate | Meaning |
| --- | --- |
| `flow_packs_present` | The flagship `linkedin_salesnav__hubspot` row exists with `status = active`. |
| `flow_field_mappings_resolvable` | Every translate-kind source/target key resolves to a known `field_types` row. |
| `flow_translate_deterministic_baseline` | Reads `.generated/flows-precision-report.json` and asserts pass rates per flow. |

## See also

- [`docs/EXPLAIN_CONTRACT.md`](EXPLAIN_CONTRACT.md) — `explain.v1` returned on translate-kind outputs.
- [`docs/INFERENCE_POLICY.md`](INFERENCE_POLICY.md) — confidence bands referenced by `translateOne`.
- [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) — Phase 3 rollout/rollback procedure.
