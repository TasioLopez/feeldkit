create table if not exists enrichment_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  field_type_id uuid not null references field_types(id) on delete cascade,
  source_input text not null,
  normalized_input text not null,
  suggested_key text not null,
  suggested_label text not null,
  confidence numeric(5,4) not null default 0.0,
  reasoning text,
  provider text,
  model text,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enrichment_proposals_org_status_idx
  on enrichment_proposals(organization_id, status, created_at desc);

create index if not exists enrichment_proposals_type_idx
  on enrichment_proposals(field_type_id, created_at desc);

alter table enrichment_proposals enable row level security;

drop policy if exists "enrichment_proposals_org_read" on enrichment_proposals;
create policy "enrichment_proposals_org_read" on enrichment_proposals for select using (
  organization_id in (
    select organization_id
    from profiles
    where user_id = auth.uid()
      and organization_id is not null
  )
);
