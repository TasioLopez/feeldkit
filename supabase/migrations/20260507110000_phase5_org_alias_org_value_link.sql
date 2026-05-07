-- Phase 5 repair — allow org-scoped aliases to point at org-scoped values.
--
-- Wave 1 introduced org_field_values and org_field_aliases, but aliases only
-- had a FK to global field_values. AI enrichment approvals first create an
-- org-local value, so their org-local alias needs to reference org_field_values.

alter table org_field_aliases
  add column if not exists org_field_value_id uuid references org_field_values(id) on delete cascade;

alter table org_field_aliases
  alter column field_value_id drop not null;

alter table org_field_aliases
  drop constraint if exists org_field_aliases_value_ref_check;

alter table org_field_aliases
  add constraint org_field_aliases_value_ref_check check (
    (field_value_id is not null and org_field_value_id is null)
    or
    (field_value_id is null and org_field_value_id is not null)
  );

create index if not exists org_field_aliases_org_value_idx
  on org_field_aliases(org_field_value_id);
