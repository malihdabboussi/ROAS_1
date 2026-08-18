-- Tag All Meetings rows with a Client / Campaign mapping field.
-- This does not move the call out of Meetings. Existing Delegation Desk
-- `client_campaign` text fields are left unchanged (id already present).

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

create or replace function _meetings_insert_visible_after(
  ids jsonb,
  after_id text,
  new_id text
) returns jsonb
language sql
immutable
as $$
  select case
    when jsonb_typeof(ids) <> 'array' then ids
    when exists (
      select 1 from jsonb_array_elements_text(ids) as visible
      where visible = new_id
    ) then ids
    else coalesce(
      (
        select jsonb_agg(to_jsonb(elem) order by ord)
        from (
          select elem, ordinality::numeric as ord
          from jsonb_array_elements_text(ids) with ordinality as t(elem, ordinality)
          union all
          select new_id, coalesce(
            (
              select ordinality + 0.5
              from jsonb_array_elements_text(ids) with ordinality as t(elem, ordinality)
              where elem = after_id
              limit 1
            ),
            1000000
          )
        ) pieces
      ),
      ids || to_jsonb(new_id)
    )
  end
$$;

update public.spaces as space
set schema = jsonb_set(
  space.schema,
  '{fields}',
  _meetings_insert_field_after(
    space.schema->'fields',
    'call_kind',
    '{"id":"client_campaign","name":"Client / Campaign","type":"text"}'::jsonb
  ),
  true
)
where jsonb_typeof(space.schema->'fields') = 'array'
  and (
    exists (
      select 1 from jsonb_array_elements(space.schema->'fields') as field
      where field->>'id' = 'call_kind'
    )
    or exists (
      select 1
      from jsonb_array_elements(coalesce(space.schema->'views', '[]'::jsonb)) as view
      where view->>'id' = 'all-meetings'
    )
  );

update public.space_templates as template
set schema = jsonb_set(
  template.schema,
  '{fields}',
  _meetings_insert_field_after(
    template.schema->'fields',
    'call_kind',
    '{"id":"client_campaign","name":"Client / Campaign","type":"text"}'::jsonb
  ),
  true
)
where jsonb_typeof(template.schema->'fields') = 'array'
  and (
    exists (
      select 1 from jsonb_array_elements(template.schema->'fields') as field
      where field->>'id' = 'call_kind'
    )
    or exists (
      select 1
      from jsonb_array_elements(coalesce(template.schema->'views', '[]'::jsonb)) as view
      where view->>'id' = 'all-meetings'
    )
  );

update public.spaces as space
set schema = jsonb_set(
  space.schema,
  '{views}',
  (
    select jsonb_agg(
      case
        when view.value->>'id' = 'all-meetings' then
          jsonb_set(
            jsonb_set(
              view.value,
              '{visible_fields}',
              _meetings_insert_visible_after(
                view.value->'visible_fields',
                'call_kind',
                'client_campaign'
              ),
              true
            ),
            '{column_widths,client_campaign}',
            '240'::jsonb,
            true
          )
        else view.value
      end
      order by view.ordinality
    )
    from jsonb_array_elements(space.schema->'views') with ordinality as view(value, ordinality)
  ),
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
  template.schema,
  '{views}',
  (
    select jsonb_agg(
      case
        when view.value->>'id' = 'all-meetings' then
          jsonb_set(
            jsonb_set(
              view.value,
              '{visible_fields}',
              _meetings_insert_visible_after(
                view.value->'visible_fields',
                'call_kind',
                'client_campaign'
              ),
              true
            ),
            '{column_widths,client_campaign}',
            '240'::jsonb,
            true
          )
        else view.value
      end
      order by view.ordinality
    )
    from jsonb_array_elements(template.schema->'views') with ordinality as view(value, ordinality)
  ),
  true
)
where jsonb_typeof(template.schema->'views') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(template.schema->'views') as view
    where view->>'id' = 'all-meetings'
  );

drop function _meetings_insert_field_after(jsonb, text, jsonb);
drop function _meetings_insert_visible_after(jsonb, text, text);
