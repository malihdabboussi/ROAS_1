alter table public.profiles
  add column if not exists default_account_mode text not null default 'personal',
  add column if not exists default_org_id uuid;

with org_only_defaults as (
  select distinct on (om.user_id)
    om.user_id,
    om.org_id
  from public.org_members om
  join public.organizations o on o.id = om.org_id
  join public.profiles p on p.id = om.user_id
  where p.account_mode = 'org_only'
    and om.status = 'active'
    and o.status = 'active'
    and o.deleted_at is null
  order by om.user_id, om.accepted_at nulls last, om.created_at
)
update public.profiles p
set
  default_account_mode = 'org',
  default_org_id = d.org_id
from org_only_defaults d
where p.id = d.user_id
  and p.account_mode = 'org_only'
  and p.default_org_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_default_account_mode_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_default_account_mode_check
      check (default_account_mode in ('personal', 'org'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_default_account_shape_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_default_account_shape_check
      check (
        (default_account_mode = 'personal' and default_org_id is null)
        or
        (default_account_mode = 'org' and default_org_id is not null)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_org_only_default_account_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_org_only_default_account_check
      check (account_mode <> 'org_only' or default_account_mode = 'org')
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_default_org_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_default_org_id_fkey
      foreign key (default_org_id)
      references public.organizations(id)
      on update cascade
      on delete restrict;
  end if;
end
$$;

create index if not exists idx_profiles_default_org_id
  on public.profiles(default_org_id)
  where default_org_id is not null;
