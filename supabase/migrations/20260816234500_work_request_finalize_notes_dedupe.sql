-- Stop copying the draft brief into both space_items.description and
-- space_items.notes. That made Portal/ClickUp render the same Notes / Source
-- folder / Context block twice when description and notes were both mirrored.
DO $$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_functiondef('public.finalize_work_request_draft(text)'::regprocedure)
  INTO definition;

  IF definition IS NULL THEN
    RAISE EXCEPTION 'finalize_work_request_draft(text) is missing';
  END IF;

  IF definition !~ 'v_draft\.due_at,\s*v_draft\.description,\s*v_draft\.description,' THEN
    IF definition ~ 'v_draft\.due_at,\s*v_draft\.description,\s*NULL,' THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'finalize_work_request_draft(text) notes/description pattern not recognized';
  END IF;

  definition := regexp_replace(
    definition,
    'v_draft\.due_at,\s*v_draft\.description,\s*v_draft\.description,',
    'v_draft.due_at, v_draft.description, NULL,',
    1,
    0
  );

  EXECUTE definition;
END;
$$;
