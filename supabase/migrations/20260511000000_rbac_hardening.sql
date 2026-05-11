-- Phase 7 foundation: split platform authority from organization membership.
-- Keep legacy profiles.role / profiles.organization_id during transition.

alter table profiles
  add column if not exists platform_role text not null default 'none',
  add column if not exists default_organization_id uuid references organizations(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_platform_role_check'
  ) then
    alter table profiles add constraint profiles_platform_role_check
      check (platform_role in ('none', 'platform_admin', 'super_admin'));
  end if;
end $$;

create table if not exists organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'viewer',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organization_memberships_role_check'
  ) then
    alter table organization_memberships add constraint organization_memberships_role_check
      check (role in ('owner', 'admin', 'editor', 'viewer'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'organization_memberships_status_check'
  ) then
    alter table organization_memberships add constraint organization_memberships_status_check
      check (status in ('active', 'invited', 'disabled'));
  end if;
end $$;

create index if not exists organization_memberships_user_idx
  on organization_memberships(user_id, status);
create index if not exists organization_memberships_org_idx
  on organization_memberships(organization_id, status);
create index if not exists profiles_platform_role_idx
  on profiles(platform_role);

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' then
    if new.user_id is distinct from old.user_id
      or new.organization_id is distinct from old.organization_id
      or new.default_organization_id is distinct from old.default_organization_id
      or new.role is distinct from old.role
      or new.platform_role is distinct from old.platform_role
      or new.email is distinct from old.email then
      raise exception 'forbidden profile column update';
    end if;
  end if;
  return new;
end;
$$;

update profiles
set
  platform_role = case
    when role = 'platform_admin' then 'platform_admin'
    else coalesce(platform_role, 'none')
  end,
  default_organization_id = coalesce(default_organization_id, organization_id)
where organization_id is not null
   or role = 'platform_admin';

insert into organization_memberships (organization_id, user_id, role, status)
select
  organization_id,
  user_id,
  case
    when role in ('owner', 'platform_admin') then 'owner'
    when role = 'admin' then 'admin'
    when role = 'editor' then 'editor'
    else 'viewer'
  end,
  'active'
from profiles
where organization_id is not null
on conflict (organization_id, user_id) do update
set
  role = case
    when excluded.role = 'owner' then 'owner'
    when organization_memberships.role = 'owner' then 'owner'
    else excluded.role
  end,
  status = 'active',
  updated_at = now();

alter table organization_memberships enable row level security;

drop policy if exists "organization_memberships_self_read" on organization_memberships;
create policy "organization_memberships_self_read"
on organization_memberships for select
using (user_id = auth.uid());

drop policy if exists "organizations_member_read" on organizations;
create policy "organizations_member_read" on organizations for select using (
  id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "api_keys_org_read" on api_keys;
create policy "api_keys_org_read" on api_keys for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
      and role in ('owner', 'admin')
  )
);

drop policy if exists "field_mappings_org_read" on field_mappings;
create policy "field_mappings_org_read" on field_mappings for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "mapping_reviews_org_read" on mapping_reviews;
create policy "mapping_reviews_org_read" on mapping_reviews for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "usage_events_org_read" on usage_events;
create policy "usage_events_org_read" on usage_events for select using (
  organization_id is not null
  and organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "audit_logs_org_read" on audit_logs;
create policy "audit_logs_org_read" on audit_logs for select using (
  organization_id is not null
  and organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "enrichment_proposals_org_read" on enrichment_proposals;
create policy "enrichment_proposals_org_read" on enrichment_proposals for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "enrichment_jobs_org_read" on enrichment_jobs;
create policy "enrichment_jobs_org_read" on enrichment_jobs for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "org_policy_overrides_member_read" on org_policy_overrides;
create policy "org_policy_overrides_member_read" on org_policy_overrides for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "org_field_locks_member_read" on org_field_locks;
create policy "org_field_locks_member_read" on org_field_locks for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "flow_pack_overrides_member_read" on flow_pack_overrides;
create policy "flow_pack_overrides_member_read" on flow_pack_overrides for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "promoted_decisions_member_read" on promoted_decisions;
create policy "promoted_decisions_member_read" on promoted_decisions for select using (
  organization_id is not null
  and organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "org_field_aliases_member_read" on org_field_aliases;
create policy "org_field_aliases_member_read" on org_field_aliases for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "org_field_values_member_read" on org_field_values;
create policy "org_field_values_member_read" on org_field_values for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "org_field_crosswalks_member_read" on org_field_crosswalks;
create policy "org_field_crosswalks_member_read" on org_field_crosswalks for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "org_promotion_settings_member_read" on org_promotion_settings;
create policy "org_promotion_settings_member_read" on org_promotion_settings for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

drop policy if exists "promotion_proposals_member_read" on promotion_proposals;
create policy "promotion_proposals_member_read" on promotion_proposals for select using (
  organization_id in (
    select organization_id
    from organization_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);
