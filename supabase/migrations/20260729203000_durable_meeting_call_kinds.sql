-- Keep every Meetings-style Space on the same complete call-kind taxonomy.
-- Earlier migrations only covered schema.personal_dashboard=true and skipped
-- legacy organization-level Meetings spaces.

with canonical_options as (
  select '[
    {"id":"private","label":"Personal","color":"emerald"},
    {"id":"team","label":"Team","color":"violet"},
    {"id":"executive","label":"Executive","color":"amber"},
    {"id":"client","label":"Client","color":"cyan"},
    {"id":"partner","label":"Partner","color":"blue"},
    {"id":"sales","label":"Sales","color":"orange"}
  ]'::jsonb as value
)
update public.spaces as space
set schema = jsonb_set(
  space.schema,
  '{fields}',
  (
    select jsonb_agg(
      case
        when field.value->>'id' = 'call_kind'
          then jsonb_set(field.value, '{options}', canonical_options.value, true)
        else field.value
      end
      order by field.ordinality
    )
    from jsonb_array_elements(space.schema->'fields') with ordinality as field(value, ordinality)
    cross join canonical_options
  ),
  true
)
where jsonb_typeof(space.schema->'fields') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(space.schema->'fields') as field
    where field->>'id' = 'call_kind'
  );

with canonical_options as (
  select '[
    {"id":"private","label":"Personal","color":"emerald"},
    {"id":"team","label":"Team","color":"violet"},
    {"id":"executive","label":"Executive","color":"amber"},
    {"id":"client","label":"Client","color":"cyan"},
    {"id":"partner","label":"Partner","color":"blue"},
    {"id":"sales","label":"Sales","color":"orange"}
  ]'::jsonb as value
)
update public.space_templates as template
set schema = jsonb_set(
  template.schema,
  '{fields}',
  (
    select jsonb_agg(
      case
        when field.value->>'id' = 'call_kind'
          then jsonb_set(field.value, '{options}', canonical_options.value, true)
        else field.value
      end
      order by field.ordinality
    )
    from jsonb_array_elements(template.schema->'fields') with ordinality as field(value, ordinality)
    cross join canonical_options
  ),
  true
)
where jsonb_typeof(template.schema->'fields') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(template.schema->'fields') as field
    where field->>'id' = 'call_kind'
  );

update public.space_items
set custom_data = jsonb_set(
  custom_data,
  '{call_kind}',
  to_jsonb(
    case custom_data->>'call_kind'
      when 'personal' then 'private'
      when 'external' then 'client'
      when 'scheduled' then 'team'
      else custom_data->>'call_kind'
    end
  ),
  true
)
where custom_data->>'call_kind' in ('personal', 'external', 'scheduled');

update public.space_items
set custom_data = jsonb_set(custom_data, '{call_kind_source}', '"automatic"'::jsonb, true)
where source = 'calendar'
  and custom_data->>'entry_type' = 'call'
  and coalesce(custom_data->>'call_kind_source', '') = '';
