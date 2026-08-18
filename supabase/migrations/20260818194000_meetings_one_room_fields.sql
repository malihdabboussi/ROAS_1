-- One room: Host + Call status on All Meetings, hide Priority/task Status,
-- default past+today+tomorrow filter, drop the Prep tab, impromptu → Team.

create or replace function _meetings_insert_field_after(
  fields jsonb,
  after_id text,
  new_field jsonb
) returns jsonb
language sql
immutable
as $$
  select case
    when jsonb_typeof(fields) <> 'array' then fields
    when exists (
      select 1 from jsonb_array_elements(fields) as field
      where field->>'id' = new_field->>'id'
    ) then fields
    else coalesce(
      (
        select jsonb_agg(elem order by ord)
        from (
          select value as elem, ordinality::numeric as ord
          from jsonb_array_elements(fields) with ordinality
          union all
          select new_field, coalesce(
            (
              select ordinality + 0.5
              from jsonb_array_elements(fields) with ordinality as field(value, ordinality)
              where field.value->>'id' = after_id
              limit 1
            ),
            1000000
          )
        ) pieces
      ),
      fields || new_field
    )
  end
$$;

create or replace function _meetings_replace_all_meetings_view(views jsonb) returns jsonb
language sql
immutable
as $$
  select case
    when jsonb_typeof(views) <> 'array' then views
    else (
      select coalesce(jsonb_agg(view_row order by ordinality), '[]'::jsonb)
      from (
        select
          ordinality,
          case
            when view.value->>'id' = 'prep' then null
            when view.value->>'id' = 'all-meetings' then
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      view.value,
                      '{visible_fields}',
                      '["title","call_kind","client_campaign","host","call_date","call_status","recording_url"]'::jsonb,
                      true
                    ),
                    '{column_widths}',
                    '{"title":360,"call_kind":110,"client_campaign":240,"host":160,"call_date":170,"call_status":140,"recording_url":220}'::jsonb,
                    true
                  ),
                  '{toolbar_call_date_window}',
                  '"past_through_tomorrow"'::jsonb,
                  true
                ),
                '{date_display_formats,call_date}',
                '"date_time"'::jsonb,
                true
              )
            else view.value
          end as view_row
        from jsonb_array_elements(views) with ordinality as view(value, ordinality)
      ) rewritten
      where view_row is not null
    )
  end
$$;

update public.spaces as space
set schema = jsonb_set(
  jsonb_set(
    space.schema,
    '{fields}',
    _meetings_insert_field_after(
      _meetings_insert_field_after(
        space.schema->'fields',
        'client_campaign',
        '{"id":"host","name":"Host","type":"text"}'::jsonb
      ),
      'host',
      '{"id":"call_status","name":"Call status","type":"select","required":false,"options":[{"id":"live","label":"Live","color":"emerald"},{"id":"completed","label":"Completed","color":"blue"},{"id":"no_show","label":"No Show","color":"red"},{"id":"rescheduled","label":"Rescheduled","color":"amber"}]}'::jsonb
    ),
    true
  ),
  '{views}',
  _meetings_replace_all_meetings_view(space.schema->'views'),
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
    _meetings_insert_field_after(
      _meetings_insert_field_after(
        template.schema->'fields',
        'client_campaign',
        '{"id":"host","name":"Host","type":"text"}'::jsonb
      ),
      'host',
      '{"id":"call_status","name":"Call status","type":"select","required":false,"options":[{"id":"live","label":"Live","color":"emerald"},{"id":"completed","label":"Completed","color":"blue"},{"id":"no_show","label":"No Show","color":"red"},{"id":"rescheduled","label":"Rescheduled","color":"amber"}]}'::jsonb
    ),
    true
  ),
  '{views}',
  _meetings_replace_all_meetings_view(template.schema->'views'),
  true
)
where jsonb_typeof(template.schema->'views') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(template.schema->'views') as view
    where view->>'id' = 'all-meetings'
  );

update public.space_items
set custom_data = jsonb_set(custom_data, '{call_kind}', '"team"'),
    updated_at = now()
where custom_data->>'call_kind' = 'impromptu';

insert into public.space_automations (
  space_id,
  user_id,
  org_id,
  name,
  enabled,
  is_draft,
  trigger,
  actions,
  created_by
)
select
  automation.space_id,
  automation.user_id,
  automation.org_id,
  'Call completed',
  automation.enabled,
  automation.is_draft,
  '{"type":"field_changed","field_id":"call_status","to":"completed"}'::jsonb,
  automation.actions,
  automation.created_by
from public.space_automations automation
where automation.name = 'Fathom Meeting Log'
  and not exists (
    select 1
    from public.space_automations existing
    where existing.space_id = automation.space_id
      and existing.name = 'Call completed'
  );

drop function _meetings_insert_field_after(jsonb, text, jsonb);
drop function _meetings_replace_all_meetings_view(jsonb);
