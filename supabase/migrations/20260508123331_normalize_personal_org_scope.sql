alter table public.spaces alter column org_id drop not null;
alter table public.space_items alter column org_id drop not null;
alter table public.space_drive_folder_mappings alter column org_id drop not null;
alter table public.space_drive_push_channels alter column org_id drop not null;

update public.spaces
set org_id = null,
    updated_at = now()
where org_id = user_id;

update public.space_items si
set org_id = null,
    updated_at = now()
from public.spaces s
where si.space_id = s.id
  and s.org_id is null;

update public.space_drive_folder_mappings
set org_id = null
where org_id = user_id;

update public.space_drive_push_channels
set org_id = null
where org_id = user_id;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'spaces_org_id_not_user_id') then
    alter table public.spaces
      add constraint spaces_org_id_not_user_id
      check (org_id is null or org_id <> user_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'space_items_org_id_not_user_id') then
    alter table public.space_items
      add constraint space_items_org_id_not_user_id
      check (org_id is null or org_id <> user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'space_drive_folder_mappings_org_id_not_user_id'
  ) then
    alter table public.space_drive_folder_mappings
      add constraint space_drive_folder_mappings_org_id_not_user_id
      check (org_id is null or org_id <> user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'space_drive_push_channels_org_id_not_user_id'
  ) then
    alter table public.space_drive_push_channels
      add constraint space_drive_push_channels_org_id_not_user_id
      check (org_id is null or org_id <> user_id);
  end if;
end $$;
