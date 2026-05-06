-- Phase 5 Wave 1 — Learning & Promotion Loop schema.
-- Adds:
--   * org-scoped staging tables (org_field_aliases / org_field_values / org_field_crosswalks)
--     so an org admin's approval can land in the org's own seed without touching
--     the global pack until a platform admin (curator) approves it.
--   * org_promotion_settings — per-org governance toggles that control whether
--     org-approved decisions are propagated up for global curation.
--   * promotion_proposals — the queue between org approval and global curation.
--
-- Wave 1 keeps the runtime engine consumer of these tables minimal: review and
-- enrichment-proposal approvals will write here, but the curator approval flow
-- (Wave 2) and the registry/changelog (Wave 3) build on top in subsequent
-- migrations. The existing `promoted_decisions` ledger is reused for both
-- scopes.

create table if not exists org_field_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  field_type_id uuid not null references field_types(id) on delete cascade,
  field_value_id uuid not null references field_values(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  locale text,
  source text,
  confidence numeric(5,4) not null default 0.95,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique(organization_id, field_type_id, normalized_alias)
);
create index if not exists org_field_aliases_norm_idx
  on org_field_aliases(organization_id, field_type_id, normalized_alias);

create table if not exists org_field_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  field_type_id uuid not null references field_types(id) on delete cascade,
  -- Mirror of canonical field_values columns we actually consume in the engine.
  -- Org-only "values" are typically additions or relabelings of canonical ones.
  key text not null,
  label text not null,
  normalized_label text not null,
  locale text,
  description text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique(organization_id, field_type_id, key)
);
create index if not exists org_field_values_label_idx
  on org_field_values(organization_id, field_type_id, normalized_label);

create table if not exists org_field_crosswalks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  from_field_type_id uuid not null references field_types(id) on delete cascade,
  from_value_id uuid not null references field_values(id) on delete cascade,
  to_field_type_id uuid not null references field_types(id) on delete cascade,
  to_value_id uuid not null references field_values(id) on delete cascade,
  crosswalk_type text not null,
  confidence numeric(5,4) not null default 0.85,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique(organization_id, from_value_id, to_value_id, crosswalk_type)
);
create index if not exists org_field_crosswalks_lookup_idx
  on org_field_crosswalks(organization_id, from_field_type_id, to_field_type_id, crosswalk_type);

create table if not exists org_promotion_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  -- When true, this org's approved decisions are NEVER staged for global curation.
  opt_out_global_propose boolean not null default false,
  -- 'org' | 'global'. With 'org' the runtime applies the change to org_* only;
  -- with 'global' a `pending_global` proposal is written and a curator decides.
  default_scope text not null default 'org',
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint org_promotion_settings_scope_check check (default_scope in ('org', 'global'))
);

create table if not exists promotion_proposals (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null,
  source_id uuid not null,
  organization_id uuid not null references organizations(id) on delete cascade,
  target_table text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'approved_org',
  audit_log_id uuid references audit_logs(id) on delete set null,
  curator_id uuid,
  curator_decision_at timestamptz,
  curator_notes text,
  superseded_by uuid references promotion_proposals(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid,
  constraint promotion_proposals_source_kind_check
    check (source_kind in ('review', 'enrichment_proposal')),
  constraint promotion_proposals_target_table_check
    check (target_table in ('field_aliases', 'field_values', 'field_crosswalks')),
  constraint promotion_proposals_status_check
    check (status in ('approved_org', 'pending_global', 'approved_global', 'rejected', 'superseded'))
);
create index if not exists promotion_proposals_status_idx on promotion_proposals(status);
create index if not exists promotion_proposals_org_idx on promotion_proposals(organization_id);
create index if not exists promotion_proposals_source_idx on promotion_proposals(source_kind, source_id);

-- Allow promoted_decisions.target_table to also represent org-scoped tables, so
-- the existing ledger can capture both scopes without a parallel structure.
alter table promoted_decisions
  drop constraint if exists promoted_decisions_target_table_check;
alter table promoted_decisions
  add constraint promoted_decisions_target_table_check
    check (target_table in (
      'field_aliases', 'field_crosswalks', 'field_values',
      'org_field_aliases', 'org_field_crosswalks', 'org_field_values'
    ));

-- RLS — org members can read their own org rows; writes go through service role only.
alter table org_field_aliases enable row level security;
alter table org_field_values enable row level security;
alter table org_field_crosswalks enable row level security;
alter table org_promotion_settings enable row level security;
alter table promotion_proposals enable row level security;

drop policy if exists "org_field_aliases_member_read" on org_field_aliases;
create policy "org_field_aliases_member_read" on org_field_aliases for select using (
  organization_id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);

drop policy if exists "org_field_values_member_read" on org_field_values;
create policy "org_field_values_member_read" on org_field_values for select using (
  organization_id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);

drop policy if exists "org_field_crosswalks_member_read" on org_field_crosswalks;
create policy "org_field_crosswalks_member_read" on org_field_crosswalks for select using (
  organization_id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);

drop policy if exists "org_promotion_settings_member_read" on org_promotion_settings;
create policy "org_promotion_settings_member_read" on org_promotion_settings for select using (
  organization_id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);

drop policy if exists "promotion_proposals_member_read" on promotion_proposals;
create policy "promotion_proposals_member_read" on promotion_proposals for select using (
  organization_id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);
