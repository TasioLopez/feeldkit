# Multi-Environment Governance

Use portable `org_config_profile.v1` files to move governance settings from staging to production without copying database IDs.

## Export From Staging

```bash
FEELDKIT_BASE_URL=https://staging.example.com FEELDKIT_API_KEY=<admin-key> \
  npm run profile:export -- --org <staging-org-id>
```

## Dry-Run Import To Production

```bash
FEELDKIT_BASE_URL=https://prod.example.com FEELDKIT_API_KEY=<admin-key> \
  npm run profile:import -- --file .generated/org-config-profile-<staging-org-id>.json --org <prod-org-id> --dry-run
```

Review the conflicts and applied counts. Only apply once the dry-run is clean:

```bash
FEELDKIT_BASE_URL=https://prod.example.com FEELDKIT_API_KEY=<admin-key> \
  npm run profile:import -- --file .generated/org-config-profile-<staging-org-id>.json --org <prod-org-id> --apply
```

Every export/import writes an `audit_logs` entry for traceability.
