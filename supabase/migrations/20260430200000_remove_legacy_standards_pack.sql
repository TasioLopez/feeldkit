-- Drop monolithic `standards` pack once modular standards_* packs exist (avoids duplicate UI rows).
-- Cascades remove that pack's field_types/values/aliases/crosswalks tied only to those type ids.
delete from field_packs
where key = 'standards'
  and exists (select 1 from field_packs p where p.key = 'standards_currencies');

-- Short display names: category already conveys "standards".
update field_packs set name = 'Currencies', updated_at = now() where key = 'standards_currencies';
update field_packs set name = 'Languages', updated_at = now() where key = 'standards_languages';
update field_packs set name = 'Timezones', updated_at = now() where key = 'standards_timezones';
