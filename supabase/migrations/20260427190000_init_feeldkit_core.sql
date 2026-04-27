create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  organization_id uuid references organizations(id) on delete set null,
  email text not null,
  full_name text,
  role text not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid
);
create unique index if not exists api_keys_prefix_unique on api_keys(organization_id, key_prefix);

create table if not exists field_packs (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  category text not null,
  status text not null default 'active',
  version text not null default '1.0.0',
  source_type text not null default 'hybrid',
  is_public boolean not null default true,
  is_system boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists field_types (
  id uuid primary key default gen_random_uuid(),
  field_pack_id uuid not null references field_packs(id) on delete cascade,
  key text not null,
  name text not null,
  description text not null default '',
  kind text not null default 'taxonomy',
  status text not null default 'active',
  is_public boolean not null default true,
  supports_hierarchy boolean not null default false,
  supports_relationships boolean not null default false,
  supports_locale boolean not null default false,
  supports_validation boolean not null default false,
  supports_crosswalks boolean not null default false,
  metadata_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(field_pack_id, key)
);
create index if not exists field_types_key_idx on field_types(key);

create table if not exists field_values (
  id uuid primary key default gen_random_uuid(),
  field_type_id uuid not null references field_types(id) on delete cascade,
  key text not null,
  label text not null,
  normalized_label text not null,
  locale text,
  description text,
  parent_id uuid references field_values(id) on delete set null,
  sort_order integer not null default 0,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  source text,
  source_id text,
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(field_type_id, key)
);
create index if not exists field_values_label_idx on field_values(normalized_label);
create index if not exists field_values_metadata_gin on field_values using gin(metadata);

create table if not exists field_aliases (
  id uuid primary key default gen_random_uuid(),
  field_value_id uuid not null references field_values(id) on delete cascade,
  field_type_id uuid not null references field_types(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  locale text,
  source text,
  confidence numeric(5,4) not null default 0.9,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(field_type_id, normalized_alias)
);
create index if not exists field_aliases_norm_idx on field_aliases(normalized_alias);

create table if not exists field_value_relationships (
  id uuid primary key default gen_random_uuid(),
  from_value_id uuid not null references field_values(id) on delete cascade,
  to_value_id uuid not null references field_values(id) on delete cascade,
  relationship_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  source text,
  confidence numeric(5,4) not null default 0.8,
  created_at timestamptz not null default now()
);
create index if not exists field_relationships_from_idx on field_value_relationships(from_value_id, relationship_type);

create table if not exists field_crosswalks (
  id uuid primary key default gen_random_uuid(),
  from_field_type_id uuid not null references field_types(id) on delete cascade,
  from_value_id uuid not null references field_values(id) on delete cascade,
  to_field_type_id uuid not null references field_types(id) on delete cascade,
  to_value_id uuid not null references field_values(id) on delete cascade,
  crosswalk_type text not null,
  confidence numeric(5,4) not null default 0.8,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(from_value_id, to_value_id, crosswalk_type)
);
create index if not exists field_crosswalks_lookup_idx on field_crosswalks(from_field_type_id, to_field_type_id, crosswalk_type);

create table if not exists field_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  field_type_id uuid not null references field_types(id) on delete cascade,
  input text not null,
  normalized_input text not null,
  context jsonb not null default '{}'::jsonb,
  matched_value_id uuid references field_values(id) on delete set null,
  confidence numeric(5,4) not null default 0,
  status text not null default 'unmatched',
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists field_mappings_norm_idx on field_mappings(organization_id, field_type_id, normalized_input);

create table if not exists mapping_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  field_mapping_id uuid references field_mappings(id) on delete set null,
  field_type_id uuid not null references field_types(id) on delete cascade,
  input text not null,
  normalized_input text not null,
  suggested_value_id uuid references field_values(id) on delete set null,
  selected_value_id uuid references field_values(id) on delete set null,
  status text not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists validation_rules (
  id uuid primary key default gen_random_uuid(),
  field_type_id uuid not null references field_types(id) on delete cascade,
  key text not null,
  name text not null,
  rule_type text not null,
  pattern text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(field_type_id, key)
);

create table if not exists parser_rules (
  id uuid primary key default gen_random_uuid(),
  field_type_id uuid not null references field_types(id) on delete cascade,
  key text not null,
  name text not null,
  parser_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(field_type_id, key)
);

create table if not exists import_sources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  url text,
  license text,
  version text,
  retrieved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists field_pack_versions (
  id uuid primary key default gen_random_uuid(),
  field_pack_id uuid not null references field_packs(id) on delete cascade,
  version text not null,
  changelog text,
  source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists field_pack_versions_idx on field_pack_versions(field_pack_id, created_at desc);

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  api_key_id uuid references api_keys(id) on delete set null,
  endpoint text not null,
  field_key text,
  request_count integer not null default 1,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table api_keys enable row level security;
alter table field_packs enable row level security;
alter table field_types enable row level security;
alter table field_values enable row level security;
alter table field_aliases enable row level security;
alter table field_crosswalks enable row level security;
alter table field_mappings enable row level security;
alter table mapping_reviews enable row level security;
alter table usage_events enable row level security;
alter table audit_logs enable row level security;

create policy if not exists "field packs are readable" on field_packs for select using (is_public = true or is_system = true);
create policy if not exists "field types are readable" on field_types for select using (is_public = true);
create policy if not exists "field values are readable" on field_values for select using (true);
create policy if not exists "field aliases are readable" on field_aliases for select using (true);
create policy if not exists "field crosswalks are readable" on field_crosswalks for select using (true);
