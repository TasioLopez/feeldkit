create table if not exists enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  requested_by uuid,
  field_key text not null,
  suggestion_limit integer not null default 5,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  submitted_count integer not null default 0,
  created_count integer not null default 0,
  skipped_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enrichment_jobs_org_status_idx
  on enrichment_jobs(organization_id, status, created_at desc);

alter table enrichment_jobs enable row level security;

drop policy if exists "enrichment_jobs_org_read" on enrichment_jobs;
create policy "enrichment_jobs_org_read" on enrichment_jobs for select using (
  organization_id in (
    select organization_id
    from profiles
    where user_id = auth.uid()
      and organization_id is not null
  )
);
