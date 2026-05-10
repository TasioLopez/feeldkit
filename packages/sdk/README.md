# @feeldkit/sdk

Official TypeScript / JavaScript client for the [FeeldKit](https://feeldkit.dev) Mapping Intelligence API.

FeeldKit translates recurrent business fields (industry, jobs, geo, company / person facets) across heterogeneous systems (LinkedIn APIs, lead-gen SaaS, forms, CRMs) through canonical concepts, deterministic flow packs, semantic inference, and a curator-gated promotion loop.

This SDK gives you a fully typed client over the public REST surface, plus admin helpers for governance, curator queues, and per-org config export/import.

## Install

```bash
npm install @feeldkit/sdk
```

Node 18+ is required for the built-in `fetch`. In older runtimes pass your own `fetch` implementation in the constructor options.

## Quickstart

```ts
import { FeeldKitClient } from "@feeldkit/sdk";

const client = new FeeldKitClient({
  apiKey: process.env.FEELDKIT_API_KEY!,
  // baseUrl: "https://api.feeldkit.dev",   // optional, defaults to https://feeldkit.dev
});

const result = await client.normalize.one({
  fieldKey: "company_industry",
  value: "computer software",
});

console.log(result.match?.label, result.confidence, result.explain.policy.domain);
```

Every response carries the `explain.v1` trace - the SDK preserves it as a typed `ExplainV1`.

## Flow Packs (deterministic translate)

```ts
const flow = await client.flows.translate({
  flowKey: "linkedin_salesnav__hubspot",
  sourceRecord: {
    full_name: "Ada Lovelace",
    company_name: "FeeldKit",
    company_industry: "Computer Software",
    company_country: "NL",
  },
});

for (const field of flow.fields) {
  console.log(field.target_field_key, field.status, field.value);
}
```

## Pre-deploy simulation

The simulate endpoint runs a flow against sample records *without* persisting any reviews:

```ts
import type { SimulationProfileV1 } from "@feeldkit/sdk";

const profile: SimulationProfileV1 = {
  schema: "feeldkit.simulation_profile.v1",
  flow_key: "linkedin_salesnav__hubspot",
  cases: [
    {
      name: "minimal",
      source_record: { full_name: "Grace Hopper", company_name: "Navy" },
      expected: { status: "incomplete" },
    },
  ],
};

const report = await client.simulate(profile);
console.log(`${report.passed_cases}/${report.total_cases} cases passed`);
```

## Admin: portable org-config profiles

Export an organization's full governance bundle (policy overrides, field locks, flow overrides, promotion settings) and apply it to another environment:

```ts
const { profile } = await client.admin.profiles.export();
// ... later, in another env:
const result = await client.admin.profiles.import({ profile, dry_run: true });
console.log(result.applied, result.conflicts);
```

## Curator queue

Phase 5 platform-admin queue automation:

```ts
const queue = await client.admin.promotions.list({ status: ["pending_global"] });
for (const proposal of queue.rows) {
  await client.admin.promotions.approve(proposal.id, { notes: "scripted approval" });
}
```

## Errors and retries

All non-2xx responses throw a `FeeldKitApiError` with the original parsed body:

```ts
import { FeeldKitApiError } from "@feeldkit/sdk";

try {
  await client.normalize.one({ fieldKey: "missing", value: "foo" });
} catch (err) {
  if (err instanceof FeeldKitApiError) {
    console.error(err.status, err.body);
  }
  throw err;
}
```

Idempotent (GET) calls can be retried automatically:

```ts
new FeeldKitClient({
  apiKey,
  retry: { retries: 3, baseDelayMs: 250, maxDelayMs: 4000 },
});
```

## Scope reference

API keys carry scopes; the SDK does not pre-validate them, but the server enforces them. See [docs/SDK.md](https://github.com/feeldkit/feeldkit/blob/main/docs/SDK.md) for the full scope matrix.

| Namespace                        | Scope(s) required                                                          |
| -------------------------------- | -------------------------------------------------------------------------- |
| `normalize`, `translate`, `flows.translate*`, `flows.simulate`, `suggest` | `normalize`                                            |
| `validate`                       | `validate`                                                                 |
| `parse`                          | `parse`                                                                    |
| `flows.list`, `flows.get`, `flows.version` | `read:flows`                                                     |
| `packs`, `fieldTypes`, `fields.*` | `read:fields` / `read:packs`                                              |
| `promotedIntelligence.*`         | `read:promoted-intelligence`                                               |
| `admin.reviews.undo`             | `admin:reviews`                                                            |
| `admin.governance.*`             | `admin:policies` (read/write thresholds + locks)                           |
| `admin.flows.*`                  | `admin:flows` (retire, rollback)                                           |
| `admin.promotions.*`             | `admin:promotions` (curator queue, platform_admin role)                    |
| `admin.proposals.undo`           | `admin:promotions`                                                         |
| `admin.profiles.{export,import}` | `admin:policies` + `admin:flows` + `admin:promotions`                      |

## Versioning

This package follows semver. Major versions match server-side breaking changes; minor versions add new namespaces; patches are bug-fix only.

## License

MIT.
