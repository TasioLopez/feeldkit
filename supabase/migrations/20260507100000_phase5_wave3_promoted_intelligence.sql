-- Phase 5 Wave 3 — Promoted-intelligence registry: a semver/changelog ledger
-- of every batch of approved decisions the platform has rolled into the
-- shared seed (or org-staging). The rollup script (`npm run promote:rollup`)
-- aggregates `promoted_decisions` since the last version, bumps semver, and
-- writes one parent version row plus per-target child entries.

create table if not exists promoted_intelligence_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  generated_at timestamptz not null default now(),
  changelog jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_by uuid
);
create index if not exists promoted_intelligence_versions_generated_at_idx
  on promoted_intelligence_versions(generated_at desc);

create table if not exists promoted_intelligence_entries (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references promoted_intelligence_versions(id) on delete cascade,
  promoted_decision_id uuid references promoted_decisions(id) on delete set null,
  target_table text not null,
  target_id uuid not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint promoted_intelligence_entries_action_check
    check (action in ('added', 'updated', 'reverted'))
);
create index if not exists promoted_intelligence_entries_version_idx
  on promoted_intelligence_entries(version_id);
create index if not exists promoted_intelligence_entries_target_idx
  on promoted_intelligence_entries(target_table, target_id);

alter table promoted_intelligence_versions enable row level security;
alter table promoted_intelligence_entries enable row level security;

drop policy if exists "promoted_intelligence_versions_public_read" on promoted_intelligence_versions;
create policy "promoted_intelligence_versions_public_read" on promoted_intelligence_versions for select using (true);

drop policy if exists "promoted_intelligence_entries_public_read" on promoted_intelligence_entries;
create policy "promoted_intelligence_entries_public_read" on promoted_intelligence_entries for select using (true);
