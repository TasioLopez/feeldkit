-- Prevent authenticated users from escalating their own profile privileges.
-- Service role remains able to perform administrative updates.

drop policy if exists "profiles_self_update" on profiles;

create policy "profiles_self_update" on profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' then
    if new.user_id is distinct from old.user_id
      or new.organization_id is distinct from old.organization_id
      or new.role is distinct from old.role
      or new.email is distinct from old.email then
      raise exception 'forbidden profile column update';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_prevent_privilege_escalation on profiles;

create trigger trg_profiles_prevent_privilege_escalation
before update on profiles
for each row
execute function public.prevent_profile_privilege_escalation();
