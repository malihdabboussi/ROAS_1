-- Live All Meetings still showed Priority / Space / task Status because the
-- stored view was never rewritten and the read-path only injected Space.
-- Ensure Client / Campaign, Host, and Call status exist and are the default
-- All Meetings columns. Do not delete Priority or Status fields.

create or replace function _meetings_upsert_field(
  fields jsonb,
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
    ) then (
      select jsonb_agg(
        case
          when field.value->>'id' = 'client_campaign'
            then jsonb_set(field.value, '{name}', '"Client / Campaign"')
          else field.value
        end
        order by field.ordinality
      )
      from jsonb_array_elements(fields) with ordinality as field(value, ordinality)
    )
    else fields || new_field
  end
$$;

create or replace function _meetings_one_room_views(views jsonb) returns jsonb
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
            when view.value->>'id' = 'all-meetings'
              and (
                not coalesce(view.value->'visible_fields', '[]'::jsonb) ? 'host'
                or not coalesce(view.value->'visible_fields', '[]'::jsonb) ? 'call_status'
              )
            then
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
    )
  end
$$;

update public.spaces as space
set schema = jsonb_set(
  jsonb_set(
    space.schema,
    '{fields}',
    _meetings_upsert_field(
      _meetings_upsert_field(
        _meetings_upsert_field(
          space.schema->'fields',
          '{"id":"client_campaign","name":"Client / Campaign","type":"text"}'::jsonb
        ),
        '{"id":"host","name":"Host","type":"text"}'::jsonb
      ),
      '{"id":"call_status","name":"Call status","type":"select","required":false,"options":[{"id":"live","label":"Live","color":"emerald"},{"id":"completed","label":"Completed","color":"blue"},{"id":"no_show","label":"No Show","color":"red"},{"id":"rescheduled","label":"Rescheduled","color":"amber"}]}'::jsonb
    ),
    true
  ),
  '{views}',
  _meetings_one_room_views(space.schema->'views'),
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
    _meetings_upsert_field(
      _meetings_upsert_field(
        _meetings_upsert_field(
          template.schema->'fields',
          '{"id":"client_campaign","name":"Client / Campaign","type":"text"}'::jsonb
        ),
        '{"id":"host","name":"Host","type":"text"}'::jsonb
      ),
      '{"id":"call_status","name":"Call status","type":"select","required":false,"options":[{"id":"live","label":"Live","color":"emerald"},{"id":"completed","label":"Completed","color":"blue"},{"id":"no_show","label":"No Show","color":"red"},{"id":"rescheduled","label":"Rescheduled","color":"amber"}]}'::jsonb
    ),
    true
  ),
  '{views}',
  _meetings_one_room_views(template.schema->'views'),
  true
)
where jsonb_typeof(template.schema->'views') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(template.schema->'views') as view
    where view->>'id' = 'all-meetings'
  );

drop function _meetings_upsert_field(jsonb, jsonb);
drop function _meetings_one_room_views(jsonb);
