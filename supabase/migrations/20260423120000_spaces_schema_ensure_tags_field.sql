-- Tag definitions for tasks live in spaces.schema (JSON: fields[]). There is no separate table.
-- Older rows used a default without a tags field. Append one multi_select field if missing
-- (additive, idempotent: skips spaces that already have id = tags).
UPDATE public.spaces
SET
  schema = jsonb_set(
    schema,
    '{fields}',
    COALESCE(schema -> 'fields', '[]'::jsonb)
    || '[
         {
           "id": "tags",
           "name": "Tags",
           "type": "multi_select",
           "system": true,
           "options": []
         }
       ]'::jsonb
  )
WHERE
  NOT (
    EXISTS (
      SELECT
        1
      FROM
        jsonb_array_elements(COALESCE(schema -> 'fields', '[]'::jsonb)) AS f
      WHERE
        f ->> 'id' = 'tags'
    )
  );
