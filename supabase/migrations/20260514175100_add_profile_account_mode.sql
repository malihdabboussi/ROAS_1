alter table public.profiles
  add column if not exists account_mode text not null default 'personal';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_mode_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_account_mode_check
      check (account_mode in ('personal', 'org_only'));
  end if;
end $$;
