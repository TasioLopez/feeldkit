# Profile Promote Example

Exports an org config profile from staging and dry-runs the import into production. It writes `org-config-profile.json` locally for review.

```bash
npm install
FEELDKIT_STAGING_API_KEY=<staging-admin-key> FEELDKIT_PROD_API_KEY=<prod-admin-key> npm start
```
