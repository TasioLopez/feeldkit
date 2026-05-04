-- Phase 3: Flow Packs V1 — deterministic source -> target field mappings.
-- JSON files in src/data/flows/* are the authored source of truth; this migration provides
-- DB-backed storage for governance, dashboard queries, and runtime resolution.

create table if not exists flow_packs (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  source_system text not null,
  target_system text not null,
  status text not null default 'active',
  is_system boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists flow_pack_versions (
  id uuid primary key default gen_random_uuid(),
  flow_pack_id uuid not null references flow_packs(id) on delete cascade,
  version text not null,
  changelog text,
  definition jsonb not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  unique(flow_pack_id, version)
);
create index if not exists flow_pack_versions_pack_idx on flow_pack_versions(flow_pack_id, created_at desc);

create table if not exists flow_pack_field_mappings (
  id uuid primary key default gen_random_uuid(),
  flow_pack_version_id uuid not null references flow_pack_versions(id) on delete cascade,
  ordinal integer not null default 0,
  kind text not null,
  source_field_key text not null,
  target_field_key text not null,
  transform jsonb not null default '{}'::jsonb,
  options jsonb not null default '{}'::jsonb,
  is_required boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint flow_pack_field_mappings_kind_check check (kind in ('direct', 'translate'))
);
create index if not exists flow_pack_field_mappings_lookup_idx on flow_pack_field_mappings(flow_pack_version_id, ordinal);

alter table flow_packs enable row level security;
alter table flow_pack_versions enable row level security;
alter table flow_pack_field_mappings enable row level security;

drop policy if exists "flow_packs_public_read" on flow_packs;
create policy "flow_packs_public_read" on flow_packs for select using (status = 'active');

drop policy if exists "flow_pack_versions_public_read" on flow_pack_versions;
create policy "flow_pack_versions_public_read" on flow_pack_versions for select using (true);

drop policy if exists "flow_pack_field_mappings_public_read" on flow_pack_field_mappings;
create policy "flow_pack_field_mappings_public_read" on flow_pack_field_mappings for select using (status = 'active');
