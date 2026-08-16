-- `spaces` has no soft-delete column. Remove the stale predicate from the
-- freshly introduced finalization function without duplicating its full body.
DO $$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_functiondef('public.finalize_work_request_draft(text)'::regprocedure)
  INTO definition;

  IF position('AND deleted_at IS NULL' IN definition) > 0 THEN
    definition := replace(definition, 'AND deleted_at IS NULL', 'AND true');
    EXECUTE definition;
  END IF;
END;
$$;
