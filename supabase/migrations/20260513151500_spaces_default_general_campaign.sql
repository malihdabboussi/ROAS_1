-- Every space must belong to a campaign. Spaces created without an explicit
-- `campaign_id` are auto-linked to the user's General campaign for the
-- matching scope (personal = org_id NULL, org = org_id matches).
--
-- 1) Ensure a General campaign exists for every (user_id, org_id) scope that
--    currently has campaign-less spaces.
-- 2) Backfill spaces.campaign_id from that General campaign.
-- 3) Install a BEFORE INSERT trigger so all future direct inserts on
--    public.spaces (api, agent-api, transfer, ad-hoc) get the same default.

-- ---------------------------------------------------------------------------
-- Step 1 — Ensure General campaigns exist for scopes with orphan spaces.
-- ---------------------------------------------------------------------------
insert into public.campaigns (user_id, org_id, name, campaign_type, status, config)
select distinct
  s.user_id,
  s.org_id,
  'General',
  'get-more-leads',
  'active',
  jsonb_build_object(
    'system_kind', 'general',
    'isPinned', true,
    'isSystem', true,
    'icon', 'folder-kanban'
  )
from public.spaces s
where s.campaign_id is null
  and not exists (
    select 1
    from public.campaigns c
    where c.user_id = s.user_id
      and coalesce(c.org_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = coalesce(s.org_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and coalesce(c.config->>'system_kind', '') = 'general'
      and c.status <> 'archived'
  );

-- ---------------------------------------------------------------------------
-- Step 2 — Backfill spaces.campaign_id to the matching General campaign.
-- ---------------------------------------------------------------------------
update public.spaces s
set campaign_id = gen.id,
    updated_at = now()
from public.campaigns gen
where s.campaign_id is null
  and gen.user_id = s.user_id
  and coalesce(gen.org_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(s.org_id, '00000000-0000-0000-0000-000000000000'::uuid)
  and coalesce(gen.config->>'system_kind', '') = 'general'
  and gen.status <> 'archived';

-- ---------------------------------------------------------------------------
-- Step 3 — Trigger: auto-link campaign_id to General on insert when missing.
-- SECURITY DEFINER so the trigger can create / read the General campaign
-- even if the caller's RLS does not allow direct campaign access.
-- ---------------------------------------------------------------------------
create or replace function public.set_space_campaign_to_general()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_general_id uuid;
begin
  if new.campaign_id is not null then
    return new;
  end if;

  select c.id into v_general_id
  from public.campaigns c
  where c.user_id = new.user_id
    and coalesce(c.org_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = coalesce(new.org_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(c.config->>'system_kind', '') = 'general'
    and c.status <> 'archived'
  order by c.created_at asc
  limit 1;

  if v_general_id is null then
    insert into public.campaigns (user_id, org_id, name, campaign_type, status, config)
    values (
      new.user_id,
      new.org_id,
      'General',
      'get-more-leads',
      'active',
      jsonb_build_object(
        'system_kind', 'general',
        'isPinned', true,
        'isSystem', true,
        'icon', 'folder-kanban'
      )
    )
    returning id into v_general_id;
  end if;

  new.campaign_id := v_general_id;
  return new;
end;
$$;

drop trigger if exists trg_spaces_default_campaign on public.spaces;
create trigger trg_spaces_default_campaign
before insert on public.spaces
for each row
execute function public.set_space_campaign_to_general();
