-- Backfill created_by on every automation entry inside spaces.schema.automations[]
-- to the space owner (spaces.user_id). This lets the API enforce
-- 'edit can only modify their own automations' immediately on existing rows.

WITH updates AS (
  SELECT
    s.id AS space_id,
    jsonb_set(
      s.schema,
      '{automations}',
      COALESCE(
        (
          SELECT jsonb_agg(
            CASE
              WHEN jsonb_typeof(item) = 'object' AND NOT (item ? 'created_by')
                THEN item || jsonb_build_object('created_by', s.user_id::text)
              ELSE item
            END
            ORDER BY ord
          )
          FROM jsonb_array_elements(s.schema -> 'automations') WITH ORDINALITY arr(item, ord)
        ),
        '[]'::jsonb
      )
    ) AS new_schema
  FROM public.spaces s
  WHERE s.schema ? 'automations'
    AND jsonb_typeof(s.schema -> 'automations') = 'array'
    AND jsonb_array_length(s.schema -> 'automations') > 0
)
UPDATE public.spaces
   SET schema = u.new_schema
  FROM updates u
 WHERE public.spaces.id = u.space_id;
