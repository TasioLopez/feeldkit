# Phase 6 Operator Checklist

Run this per environment after deploying the Phase 6 app revision.

1. Confirm no migrations are pending for Phase 6.
2. Build and test the SDK:

```bash
npm run sdk:build
npm run sdk:test
```

3. Verify OpenAPI parity:

```bash
npm run docs:openapi-check
```

4. Smoke simulation with a disposable profile and confirm no `mapping_reviews` rows are created:

```bash
npm run simulate -- --profile ./simulation-profile.json
```

5. Export and dry-run import org governance config:

```bash
npm run profile:export -- --org <org-id>
npm run profile:import -- --file .generated/org-config-profile-<org-id>.json --org <org-id> --dry-run
```

6. Run full health gates:

```bash
npm run verify:pack-health
```

7. Walk through `examples/sales-nav-to-hubspot` against the environment.

8. Optional SDK release when ready:

```bash
npm --prefix packages/sdk publish --dry-run
git tag sdk-v0.2.0
git push origin sdk-v0.2.0
```
