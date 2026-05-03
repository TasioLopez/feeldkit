-- Phase 2: Inference Engine V1 — persist matcher confidence and structured explain payload on mapping_reviews,
-- plus a composite index used by priors/dedup lookups.

alter table mapping_reviews
  add column if not exists confidence numeric(5,4) not null default 0;

alter table mapping_reviews
  add column if not exists explain_payload jsonb not null default '{}'::jsonb;

create index if not exists mapping_reviews_field_input_idx
  on mapping_reviews(field_type_id, normalized_input, status);
