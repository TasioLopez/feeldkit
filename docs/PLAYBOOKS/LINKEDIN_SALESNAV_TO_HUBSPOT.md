# LinkedIn SalesNav To HubSpot

This is the flagship deterministic flow for Phase 6. Use it when your source record resembles Sales Navigator lead/company data and your target schema is HubSpot-style contact/company fields.

## Setup

1. Create an API key with `normalize` and `read:flows`.
2. Install the SDK: `npm install @feeldkit/sdk`.
3. Run `examples/sales-nav-to-hubspot` against staging.

## Pre-Deploy Simulation

Create a `simulation_profile.v1` with representative SalesNav records and expected target statuses, then run:

```bash
npm run simulate -- --profile ./simulation-profile.json
```

The simulate endpoint is a dry-run and does not write `mapping_reviews`.

## Production Rollout

Deploy with deterministic flow-pack translation first. Watch low-confidence fields in `/dashboard/reviews`, promote approved decisions through the Phase 5 learning loop, then roll promoted intelligence into the registry.
