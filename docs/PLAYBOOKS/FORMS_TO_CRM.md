# Forms To CRM

Use this playbook for inbound forms where industry, country, job title, company size, and intent fields arrive as free text.

## Recommended Flow

1. Normalize each recurring field with `client.normalize.one()`.
2. Store canonical keys, labels, confidence, and `explain.v1` traces alongside your CRM record.
3. Send low-confidence values to review instead of hard-coding one-off mappings.
4. Promote approved decisions back into org-scoped aliases before proposing global reuse.

## Smoke Command

```bash
npm run simulate -- --profile ./forms-to-crm.simulation.json
```

Keep the profile in your integration repo so form changes can be tested before deploy.
