-- Phase 4: Confidence Policy and Governance — Wave 1 schema.
-- Adds per-org policy overrides, per-org field locks, per-org flow pack overrides,
-- promoted-decision rollback ledger, and links mapping_reviews to audit log entries.
-- Wave 1 keeps these tables read-only at runtime: the inference / flow engines do
-- NOT consume them yet; only governance dashboards and admin endpoints read/write
-- them. Wave 2 will wire them into runInference / runFlow.

create table if not exists org_policy_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  domain text not null,
  matched numeric(5,4) not null,
  suggested numeric(5,4) not null,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique(organization_id, domain),
  constraint org_policy_overrides_thresholds_check check (matched > suggested),
  constraint org_policy_overrides_range_check check (matched <= 1 and suggested >= 0)
);
create index if not exists org_policy_overrides_org_idx on org_policy_overrides(organization_id);

create table if not exists org_field_locks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  field_key text not null,
  mode text not null,
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid,
  unique(organization_id, field_key),
  constraint org_field_locks_mode_check check (mode in ('require_review', 'disable_auto_apply'))
);
create index if not exists org_field_locks_org_idx on org_field_locks(organization_id);

create table if not exists flow_pack_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flow_pack_id uuid not null references flow_packs(id) on delete cascade,
  flow_pack_version_id uuid references flow_pack_versions(id) on delete cascade,
  ordinal integer,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  constraint flow_pack_overrides_action_check check (action in ('skip', 'replace', 'lock', 'pin_version')),
  -- pin_version rows pin a whole flow to a specific version and don't carry an ordinal
  constraint flow_pack_overrides_pin_or_mapping_check check (
    (action = 'pin_version' and flow_pack_version_id is not null and ordinal is null) or
    (action <> 'pin_version' and ordinal is not null)
  )
);
create unique index if not exists flow_pack_overrides_unique_idx
  on flow_pack_overrides(organization_id, flow_pack_id, coalesce(ordinal, -1), action);
create index if not exists flow_pack_overrides_org_flow_idx
  on flow_pack_overrides(organization_id, flow_pack_id);

create table if not exists promoted_decisions (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null,
  source_id uuid not null,
  organization_id uuid references organizations(id) on delete set null,
  target_table text not null,
  target_id uuid not null,
  snapshot_before jsonb not null default '{}'::jsonb,
  snapshot_after jsonb not null default '{}'::jsonb,
  reverted_at timestamptz,
  reverted_by uuid,
  audit_log_id uuid references audit_logs(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid,
  constraint promoted_decisions_source_kind_check check (source_kind in ('review', 'enrichment_proposal')),
  constraint promoted_decisions_target_table_check check (target_table in ('field_aliases', 'field_crosswalks', 'field_values'))
);
create index if not exists promoted_decisions_source_idx on promoted_decisions(source_kind, source_id);
create index if not exists promoted_decisions_target_idx on promoted_decisions(target_table, target_id);
create index if not exists promoted_decisions_org_idx on promoted_decisions(organization_id);

-- Link reviews to audit log + supersession chain so the dashboard can render history.
alter table mapping_reviews
  add column if not exists decision_audit_id uuid references audit_logs(id) on delete set null;
alter table mapping_reviews
  add column if not exists superseded_by uuid references mapping_reviews(id) on delete set null;
create index if not exists mapping_reviews_superseded_by_idx on mapping_reviews(superseded_by);

-- RLS: read for org members; writes through service role only.
alter table org_policy_overrides enable row level security;
alter table org_field_locks enable row level security;
alter table flow_pack_overrides enable row level security;
alter table promoted_decisions enable row level security;

drop policy if exists "org_policy_overrides_member_read" on org_policy_overrides;
create policy "org_policy_overrides_member_read" on org_policy_overrides for select using (
  organization_id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);

drop policy if exists "org_field_locks_member_read" on org_field_locks;
create policy "org_field_locks_member_read" on org_field_locks for select using (
  organization_id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);

drop policy if exists "flow_pack_overrides_member_read" on flow_pack_overrides;
create policy "flow_pack_overrides_member_read" on flow_pack_overrides for select using (
  organization_id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);

drop policy if exists "promoted_decisions_member_read" on promoted_decisions;
create policy "promoted_decisions_member_read" on promoted_decisions for select using (
  organization_id is not null
  and organization_id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);
