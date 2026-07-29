update public.spaces
set schema = jsonb_set(
  schema,
  '{fields}',
  (
    select jsonb_agg(
      case
        when field->>'id' = 'call_kind' then
          jsonb_set(
            field,
            '{options}',
            '[
              {"id":"private","label":"Private","color":"emerald"},
              {"id":"team","label":"Team","color":"violet"},
              {"id":"executive","label":"Executive","color":"amber"},
              {"id":"client","label":"Client","color":"cyan"},
              {"id":"partner","label":"Partner","color":"blue"},
              {"id":"sales","label":"Sales","color":"orange"}
            ]'::jsonb
          )
        else field
      end
    )
    from jsonb_array_elements(schema->'fields') field
  )
)
where coalesce((schema->>'personal_dashboard')::boolean, false) = true
  and jsonb_typeof(schema->'fields') = 'array';

update public.space_items
set custom_data = jsonb_set(
  custom_data,
  '{call_kind}',
  to_jsonb(
    case custom_data->>'call_kind'
      when 'personal' then 'private'
      when 'external' then 'client'
      else custom_data->>'call_kind'
    end
  )
)
where custom_data->>'call_kind' in ('personal', 'external');
