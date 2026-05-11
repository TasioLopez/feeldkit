# FeeldKit SDK

`@feeldkit/sdk` is the typed TypeScript/JavaScript client for the FeeldKit Mapping Intelligence API.

## Install

```bash
npm install @feeldkit/sdk
```

```ts
import { FeeldKitApiError, FeeldKitClient } from "@feeldkit/sdk";

const client = new FeeldKitClient({
  apiKey: process.env.FEELDKIT_API_KEY!,
  baseUrl: process.env.FEELDKIT_BASE_URL,
});
```

## Environment Variables

- `FEELDKIT_API_KEY`: API key sent as `x-api-key`.
- `FEELDKIT_BASE_URL`: API host, defaults to `https://feeldkit.dev` in SDK usage and `http://localhost:3000` in repo scripts.

## Scope Matrix

Admin scopes can only be issued from the dashboard by an organization owner. Platform curator roles do not grant org key issuance by themselves; see [`docs/RBAC.md`](RBAC.md).

- `normalize`: normalize, translate, flow translate, simulate.
- `read:fields`: catalogs, field values, search, geo, standards, company lists, AI schema helpers.
- `read:packs`: packs list/detail.
- `read:flows`: flows list/detail/version and simulate.
- `read:promoted-intelligence`: promoted intelligence registry.
- `admin:policies`: governance policy, locks, profile export/import.
- `admin:flows`: flow lifecycle and profile export/import.
- `admin:promotions`: curator queue, promotion settings, profile export/import.
- `admin:reviews`: review undo, proposal undo, audit list.
- `admin:fields`: enrichment proposal/job admin routes.

## Retry Semantics

Pass `retry: { retries, baseDelayMs, maxDelayMs }` to retry idempotent `GET` requests on `429` and `5xx`. Mutating requests are not retried.

## Errors

Non-2xx responses throw `FeeldKitApiError` with `status` and parsed `body`.

```ts
try {
  await client.normalize.one({ fieldKey: "company_industry", value: "software" });
} catch (err) {
  if (err instanceof FeeldKitApiError) console.error(err.status, err.body);
}
```

## Recipes

- `examples/normalize-industry`
- `examples/sales-nav-to-hubspot`
- `examples/profile-simulate`
- `docs/PLAYBOOKS/LINKEDIN_SALESNAV_TO_HUBSPOT.md`
- `docs/PLAYBOOKS/FORMS_TO_CRM.md`
- `docs/PLAYBOOKS/MULTI_ENV_GOVERNANCE.md`
