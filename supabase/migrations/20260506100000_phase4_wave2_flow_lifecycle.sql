-- Phase 4 Wave 2 — flow pack version lifecycle for governance rollbacks / pinning.

alter table flow_pack_versions
  add column if not exists published_at timestamptz;

alter table flow_pack_versions
  add column if not exists retired_at timestamptz;

alter table flow_pack_versions
  add column if not exists lifecycle text not null default 'published';

alter table flow_pack_versions
  drop constraint if exists flow_pack_versions_lifecycle_check;

alter table flow_pack_versions
  add constraint flow_pack_versions_lifecycle_check check (lifecycle in ('draft', 'published', 'retired'));

comment on column flow_pack_versions.lifecycle is 'draft → published (active baseline) → retired (inactive but still readable for pins/overrides)';
comment on column flow_pack_versions.published_at is 'When this version became published (set by flows:ingest or admin rollback)';
comment on column flow_pack_versions.retired_at is 'When this version was retired via admin action';
