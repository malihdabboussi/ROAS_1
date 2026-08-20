-- All Meetings should show the same Client Workspace + Campaign Space
-- columns as All Tasks. Keep client_campaign as a mapping field, but stop
-- showing it as the default column. Rename space_title to Campaign Space.

create or replace function _meetings_upsert_named_field(
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
          when field.value->>'id' = new_field->>'id'
            then jsonb_set(field.value, '{name}', new_field->'name')
          else field.value
        end
        order by field.ordinality
      )
      from jsonb_array_elements(fields) with ordinality as field(value, ordinality)
    )
    else fields || new_field
  end
$$;

create or replace function _meetings_workspace_visible(visible jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  ids text[];
  kept text[] := '{}';
  id text;
  at int;
begin
  if jsonb_typeof(visible) <> 'array' then
    return visible;
  end if;
  select coalesce(array_agg(elem), '{}')
  into ids
  from jsonb_array_elements_text(visible) as elem;
  if 'campaign_name' = any(ids) and 'space_title' = any(ids) then
    return visible;
  end if;
  foreach id in array ids loop
    if id not in ('client_campaign', 'campaign_name', 'space_title') then
      kept := kept || id;
    end if;
  end loop;
  at := coalesce(array_position(kept, 'call_kind'), array_position(kept, 'title'), 0);
  return to_jsonb(
    coalesce(kept[1:at], '{}')
    || array['campaign_name', 'space_title']
    || coalesce(kept[at + 1 : array_length(kept, 1)], '{}')
  );
end;
$$;

create or replace function _meetings_workspace_views(views jsonb) returns jsonb
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
            when view.value->>'id' = 'all-meetings' then
              jsonb_set(
                jsonb_set(
                  view.value,
                  '{visible_fields}',
                  _meetings_workspace_visible(coalesce(view.value->'visible_fields', '[]'::jsonb)),
                  true
                ),
                '{column_widths}',
                coalesce(view.value->'column_widths', '{}'::jsonb)
                  || '{"campaign_name":180,"space_title":180}'::jsonb,
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
    _meetings_upsert_named_field(
      _meetings_upsert_named_field(
        space.schema->'fields',
        '{"id":"campaign_name","name":"Client Workspace","type":"text"}'::jsonb
      ),
      '{"id":"space_title","name":"Campaign Space","type":"text"}'::jsonb
    ),
    true
  ),
  '{views}',
  _meetings_workspace_views(space.schema->'views'),
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
    _meetings_upsert_named_field(
      _meetings_upsert_named_field(
        template.schema->'fields',
        '{"id":"campaign_name","name":"Client Workspace","type":"text"}'::jsonb
      ),
      '{"id":"space_title","name":"Campaign Space","type":"text"}'::jsonb
    ),
    true
  ),
  '{views}',
  _meetings_workspace_views(template.schema->'views'),
  true
)
where jsonb_typeof(template.schema->'views') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(template.schema->'views') as view
    where view->>'id' = 'all-meetings'
  );

drop function _meetings_workspace_views(jsonb);
drop function _meetings_workspace_visible(jsonb);
drop function _meetings_upsert_named_field(jsonb, jsonb);
