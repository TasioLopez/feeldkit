create table if not exists industry_concepts (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  normalized_label text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists industry_concept_codes (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references industry_concepts(id) on delete cascade,
  code_system text not null,
  code text not null,
  label text not null,
  hierarchy_path text,
  parent_code text,
  status text not null default 'active',
  source text,
  version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(code_system, code)
);
create index if not exists industry_concept_codes_lookup_idx on industry_concept_codes(code_system, code, status);
create index if not exists industry_concept_codes_concept_idx on industry_concept_codes(concept_id, code_system);

create table if not exists industry_concept_edges (
  id uuid primary key default gen_random_uuid(),
  from_concept_id uuid not null references industry_concepts(id) on delete cascade,
  to_concept_id uuid not null references industry_concepts(id) on delete cascade,
  relation_type text not null,
  mapping_quality text not null default 'exact',
  confidence numeric(5,4) not null default 1.0,
  source text,
  source_evidence text,
  status text not null default 'approved',
  inferred boolean not null default false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(from_concept_id, to_concept_id, relation_type, source)
);
create index if not exists industry_concept_edges_from_idx on industry_concept_edges(from_concept_id, relation_type, status);
create index if not exists industry_concept_edges_to_idx on industry_concept_edges(to_concept_id, relation_type, status);

alter table industry_concepts enable row level security;
alter table industry_concept_codes enable row level security;
alter table industry_concept_edges enable row level security;

drop policy if exists "industry_concepts_authenticated_read" on industry_concepts;
create policy "industry_concepts_authenticated_read" on industry_concepts
for select to authenticated
using (true);

drop policy if exists "industry_concept_codes_authenticated_read" on industry_concept_codes;
create policy "industry_concept_codes_authenticated_read" on industry_concept_codes
for select to authenticated
using (true);

drop policy if exists "industry_concept_edges_authenticated_read" on industry_concept_edges;
create policy "industry_concept_edges_authenticated_read" on industry_concept_edges
for select to authenticated
using (true);
