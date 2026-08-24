-- Restore Attendees to All Meetings and conservatively backfill broad client
-- mappings to each client's General space. Existing/manual mappings win.

create or replace function _meetings_upsert_attendees_field(fields jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when jsonb_typeof(fields) <> 'array' then fields
    when exists (
      select 1
      from jsonb_array_elements(fields) as field
      where field->>'id' = 'attendees'
    ) then fields
    else fields || '{"id":"attendees","name":"Attendees","type":"multi_select","required":false,"options":[]}'::jsonb
  end
$$;

create or replace function _meetings_restore_attendees_view(views jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  next_views jsonb := '[]'::jsonb;
  view_row jsonb;
  visible jsonb;
  attendees_position int;
begin
  if jsonb_typeof(views) <> 'array' then
    return views;
  end if;

  for view_row in select value from jsonb_array_elements(views)
  loop
    if view_row->>'id' = 'all-meetings' then
      visible := coalesce(view_row->'visible_fields', '[]'::jsonb);
      if jsonb_typeof(visible) = 'array' and not (visible ? 'attendees') then
        select coalesce(
          max(ordinality) filter (where value = 'host'),
          jsonb_array_length(visible)
        )
        into attendees_position
        from jsonb_array_elements_text(visible) with ordinality;

        select coalesce(jsonb_agg(value order by sort_order), '[]'::jsonb)
        into visible
        from (
          select value, ordinality::numeric as sort_order
          from jsonb_array_elements(visible) with ordinality
          union all
          select '"attendees"'::jsonb, attendees_position + 0.5
        ) ordered_visible;
      end if;

      view_row := jsonb_set(
        jsonb_set(view_row, '{visible_fields}', visible, true),
        '{column_widths}',
        coalesce(view_row->'column_widths', '{}'::jsonb) || '{"attendees":260}'::jsonb,
        true
      );
    end if;
    next_views := next_views || jsonb_build_array(view_row);
  end loop;

  return next_views;
end
$$;

update public.spaces as space
set schema = jsonb_set(
  jsonb_set(
    space.schema,
    '{fields}',
    _meetings_upsert_attendees_field(space.schema->'fields'),
    true
  ),
  '{views}',
  _meetings_restore_attendees_view(space.schema->'views'),
  true
)
where jsonb_typeof(space.schema->'views') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(space.schema->'views') as view
    where view->>'id' = 'all-meetings'
  );

update public.space_templates as template
set schema = jsonb_set(
  jsonb_set(
    template.schema,
    '{fields}',
    _meetings_upsert_attendees_field(template.schema->'fields'),
    true
  ),
  '{views}',
  _meetings_restore_attendees_view(template.schema->'views'),
  true
)
where jsonb_typeof(template.schema->'views') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(template.schema->'views') as view
    where view->>'id' = 'all-meetings'
  );

-- A title match is intentionally strict: ignore generic agency/campaign words,
-- require the only candidate client, and never overwrite an existing mapping.
create or replace function _meetings_title_matches_client(
  meeting_title text,
  client_name text
) returns boolean
language sql
immutable
as $$
  with normalized as (
    select
      trim(regexp_replace(lower(coalesce(meeting_title, '')), '[^a-z0-9]+', ' ', 'g')) as title,
      trim(regexp_replace(lower(coalesce(client_name, '')), '[^a-z0-9]+', ' ', 'g')) as client
  ), significant_tokens as (
    select token
    from normalized,
      regexp_split_to_table(client, '\s+') as token
    where token <> ''
      and (length(token) >= 4 or token ~ '[0-9]')
      and token <> all(array[
        'academy', 'agency', 'becoming', 'campaign', 'card', 'client', 'coach',
        'coaching', 'collective', 'company', 'consulting', 'creation', 'global',
        'group', 'international', 'marketing', 'other', 'roas', 'sales',
        'service', 'services', 'team', 'test', 'webinar'
      ])
  ), token_counts as (
    select
      count(significant_tokens.token)::int as total,
      count(*) filter (
        where normalized.title ~ ('(^| )' || significant_tokens.token || '( |$)')
      )::int as matched
    from normalized
    left join significant_tokens on true
  )
  select case
    when normalized.client in ('test', 'other', 'roas co', 'dylan vanas client card') then false
    when token_counts.total = 1 then token_counts.matched = 1
    when token_counts.total > 1 then token_counts.matched >= 2
    else false
  end
  from normalized, token_counts
$$;

with meeting_scopes as (
  select
    item.id as item_id,
    integration.metadata->'client_scope_map' as scope_map
  from public.space_items item
  cross join lateral (
    select candidate.metadata
    from public.user_integrations candidate
    where candidate.user_id = item.user_id
      and candidate.integration_id = 'page_grader'
      and candidate.status = 'connected'
      and (candidate.org_id is null or candidate.org_id is not distinct from item.org_id)
    order by
      case when candidate.org_id is not distinct from item.org_id then 0 else 1 end,
      candidate.updated_at desc
    limit 1
  ) integration
  where item.custom_data->>'entry_type' = 'call'
    and not (coalesce(item.custom_data, '{}'::jsonb) ? 'client_campaign')
), candidates as (
  select
    item.id as item_id,
    scope_entry.key as client_id,
    scope_entry.value->>'campaign_name' as client_name,
    scope_entry.value->>'campaign_id' as campaign_id,
    coalesce(nullif(scope_entry.value->>'space_title', ''), 'General') as space_name,
    scope_entry.value->>'space_id' as space_id,
    count(*) over (partition by item.id) as candidate_count
  from public.space_items item
  join meeting_scopes on meeting_scopes.item_id = item.id
  cross join lateral jsonb_each(coalesce(meeting_scopes.scope_map, '{}'::jsonb)) scope_entry
  where nullif(scope_entry.value->>'campaign_id', '') is not null
    and nullif(scope_entry.value->>'space_id', '') is not null
    and _meetings_title_matches_client(item.title, scope_entry.value->>'campaign_name')
), unique_candidates as (
  select *
  from candidates
  where candidate_count = 1
)
update public.space_items item
set custom_data = coalesce(item.custom_data, '{}'::jsonb)
  || jsonb_build_object(
    'client_campaign',
    jsonb_build_object(
      'client_id', candidate.client_id,
      'client_name', candidate.client_name,
      'campaign_id', candidate.campaign_id,
      'campaign_name', candidate.space_name,
      'roas_space_id', candidate.space_id
    ),
    'client_campaign_source',
    'title_client_workspace_backfill'
  ),
  updated_at = now()
from unique_candidates candidate
where item.id = candidate.item_id
  and not (coalesce(item.custom_data, '{}'::jsonb) ? 'client_campaign');

drop function _meetings_title_matches_client(text, text);
drop function _meetings_restore_attendees_view(jsonb);
drop function _meetings_upsert_attendees_field(jsonb);
