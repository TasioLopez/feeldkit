-- Global unique API key prefix for O(1) lookup without organization_id
drop index if exists api_keys_prefix_unique;
create unique index if not exists api_keys_key_prefix_unique on api_keys(key_prefix);
