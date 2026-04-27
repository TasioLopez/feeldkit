-- Harden RLS for org-scoped tables; public read for canonical field catalog.
-- Service role bypasses RLS (server-side API key verification, seed, admin actions).

alter table field_value_relationships enable row level security;
alter table validation_rules enable row level security;
alter table parser_rules enable row level security;
alter table import_sources enable row level security;
alter table field_pack_versions enable row level security;

drop policy if exists "field packs are readable" on field_packs;
drop policy if exists "field types are readable" on field_types;
drop policy if exists "field values are readable" on field_values;
drop policy if exists "field aliases are readable" on field_aliases;
drop policy if exists "field crosswalks are readable" on field_crosswalks;

create policy "field_packs_public_read" on field_packs for select using (is_public = true or is_system = true);
create policy "field_types_public_read" on field_types for select using (is_public = true);
create policy "field_values_public_read" on field_values for select using (true);
create policy "field_aliases_public_read" on field_aliases for select using (true);
create policy "field_crosswalks_public_read" on field_crosswalks for select using (true);
create policy "field_value_relationships_public_read" on field_value_relationships for select using (true);
create policy "validation_rules_public_read" on validation_rules for select using (status = 'active');
create policy "parser_rules_public_read" on parser_rules for select using (status = 'active');
create policy "import_sources_public_read" on import_sources for select using (true);
create policy "field_pack_versions_public_read" on field_pack_versions for select using (true);

-- Organizations: members can read their org
drop policy if exists "organizations_member_read" on organizations;
create policy "organizations_member_read" on organizations for select using (
  id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);

-- Profiles: users read/update own row (updates limited by app logic)
drop policy if exists "profiles_self_read" on profiles;
drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_read" on profiles for select using (user_id = auth.uid());
create policy "profiles_self_update" on profiles for update using (user_id = auth.uid());

-- API keys: org members with owner/admin can read; mutations via service role in app
drop policy if exists "api_keys_org_read" on api_keys;
create policy "api_keys_org_read" on api_keys for select using (
  organization_id in (select organization_id from profiles where user_id = auth.uid() and role in ('owner', 'admin'))
);

-- Field mappings & reviews: org scoped (read for members; writes via service role recommended)
drop policy if exists "field_mappings_org_read" on field_mappings;
create policy "field_mappings_org_read" on field_mappings for select using (
  organization_id in (select organization_id from profiles where user_id = auth.uid())
);

drop policy if exists "mapping_reviews_org_read" on mapping_reviews;
create policy "mapping_reviews_org_read" on mapping_reviews for select using (
  organization_id in (select organization_id from profiles where user_id = auth.uid())
);

drop policy if exists "usage_events_org_read" on usage_events;
create policy "usage_events_org_read" on usage_events for select using (
  organization_id is not null
  and organization_id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);

drop policy if exists "audit_logs_org_read" on audit_logs;
create policy "audit_logs_org_read" on audit_logs for select using (
  organization_id is not null
  and organization_id in (select organization_id from profiles where user_id = auth.uid() and organization_id is not null)
);
