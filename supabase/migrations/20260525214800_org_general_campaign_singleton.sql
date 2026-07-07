-- Enforce one active General campaign per org.
--
-- Historical migrations created one General campaign per (user_id, org_id). In org
-- workspaces that means several members can create separate "General" buckets,
-- which makes the Spaces sidebar show duplicate General sections. Keep the oldest
-- org General as canonical, move visible campaign-scoped content to it, archive the
-- duplicates, then replace the uniqueness rule.

create temporary table if not exists tmp_org_general_campaign_merge (
  duplicate_id uuid primary key,
  canonical_id uuid not null
) on commit drop;

truncate table tmp_org_general_campaign_merge;

insert into tmp_org_general_campaign_merge (duplicate_id, canonical_id)
with ranked as (
  select
    c.id,
    first_value(c.id) over (
      partition by c.org_id
      order by c.created_at asc, c.id asc
    ) as canonical_id,
    row_number() over (
      partition by c.org_id
      order by c.created_at asc, c.id asc
    ) as rn
  from public.campaigns c
  where c.org_id is not null
    and c.deleted_at is null
    and coalesce(c.status, '') <> 'archived'
    and coalesce(c.config->>'system_kind', '') = 'general'
)
select id, canonical_id
from ranked
where rn > 1;

do $$
declare
  target record;
begin
  for target in
    select *
    from (
      values
        ('spaces', 'campaign_id'),
        ('conversations', 'campaign_id'),
        ('conversation_documents', 'campaign_id'),
        ('ad_campaigns', 'campaign_id'),
        ('ad_sets', 'campaign_id'),
        ('ads', 'campaign_id'),
        ('avatars', 'campaign_id'),
        ('blog_posts', 'campaign_id'),
        ('emails', 'campaign_id'),
        ('form_responses', 'campaign_id'),
        ('forms', 'campaign_id'),
        ('funnels', 'campaign_id'),
        ('leads', 'campaign_id'),
        ('media_assets', 'campaign_id'),
        ('media_generation_jobs', 'campaign_id'),
        ('mission_deliverables', 'campaign_id'),
        ('missions', 'campaign_id'),
        ('offers', 'campaign_id'),
        ('presentations', 'campaign_id'),
        ('sequences', 'campaign_id'),
        ('social_post_schedules', 'campaign_id'),
        ('social_posts', 'campaign_id'),
        ('workspace_pages', 'campaign_id')
    ) as t(table_name, column_name)
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = target.table_name
        and column_name = target.column_name
    ) then
      execute format(
        'update public.%I as r set %I = merge.canonical_id from tmp_org_general_campaign_merge merge where r.%I = merge.duplicate_id',
        target.table_name,
        target.column_name,
        target.column_name
      );
    end if;
  end loop;
end $$;

update public.campaigns c
set
  status = 'archived',
  updated_at = now(),
  config = coalesce(c.config, '{}'::jsonb) || jsonb_build_object(
    'archived_reason', 'merged_into_org_general_campaign',
    'merged_into_campaign_id', merge.canonical_id
  )
from tmp_org_general_campaign_merge merge
where c.id = merge.duplicate_id;

drop index if exists public.idx_campaigns_single_general_per_user;

create unique index if not exists idx_campaigns_single_personal_general_per_user
  on public.campaigns(user_id)
  where org_id is null
    and deleted_at is null
    and coalesce(status, '') <> 'archived'
    and coalesce(config->>'system_kind', '') = 'general';

create unique index if not exists idx_campaigns_single_general_per_org
  on public.campaigns(org_id)
  where org_id is not null
    and deleted_at is null
    and coalesce(status, '') <> 'archived'
    and coalesce(config->>'system_kind', '') = 'general';

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

  if new.org_id is not null then
    select c.id into v_general_id
    from public.campaigns c
    where c.org_id = new.org_id
      and c.deleted_at is null
      and coalesce(c.config->>'system_kind', '') = 'general'
      and coalesce(c.status, '') <> 'archived'
    order by c.created_at asc, c.id asc
    limit 1;
  else
    select c.id into v_general_id
    from public.campaigns c
    where c.user_id = new.user_id
      and c.org_id is null
      and c.deleted_at is null
      and coalesce(c.config->>'system_kind', '') = 'general'
      and coalesce(c.status, '') <> 'archived'
    order by c.created_at asc, c.id asc
    limit 1;
  end if;

  if v_general_id is null then
    begin
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
    exception
      when unique_violation then
        if new.org_id is not null then
          select c.id into v_general_id
          from public.campaigns c
          where c.org_id = new.org_id
            and c.deleted_at is null
            and coalesce(c.config->>'system_kind', '') = 'general'
            and coalesce(c.status, '') <> 'archived'
          order by c.created_at asc, c.id asc
          limit 1;
        else
          select c.id into v_general_id
          from public.campaigns c
          where c.user_id = new.user_id
            and c.org_id is null
            and c.deleted_at is null
            and coalesce(c.config->>'system_kind', '') = 'general'
            and coalesce(c.status, '') <> 'archived'
          order by c.created_at asc, c.id asc
          limit 1;
        end if;
    end;
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
