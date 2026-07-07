-- Backfill doc bodies for rows that are docs by custom_data, not status.

UPDATE public.space_items
SET doc_body = COALESCE(notes, custom_data->>'body')
WHERE custom_data->>'_view_type' = 'doc'
  AND (
    doc_body IS NULL
    OR (
      LENGTH(TRIM(doc_body)) <= 20
      AND (
        LENGTH(TRIM(COALESCE(notes, ''))) > 50
        OR LENGTH(TRIM(COALESCE(custom_data->>'body', ''))) > 50
      )
    )
  )
  AND (
    notes IS NOT NULL
    OR custom_data ? 'body'
  );
