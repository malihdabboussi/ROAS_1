BEGIN;

ALTER TABLE public.space_items
  ADD COLUMN IF NOT EXISTS assignees JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.space_items
SET assignees = CASE
  WHEN assignee_type IN ('human', 'agent') AND assignee_id IS NOT NULL THEN
    jsonb_build_array(jsonb_build_object('type', assignee_type, 'id', assignee_id))
  ELSE '[]'::jsonb
END
WHERE assignees = '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.sync_space_item_assignees()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.assignees IS NULL THEN
    NEW.assignees := '[]'::jsonb;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF jsonb_array_length(NEW.assignees) = 0
       AND NEW.assignee_type IN ('human', 'agent')
       AND NEW.assignee_id IS NOT NULL THEN
      NEW.assignees := jsonb_build_array(
        jsonb_build_object('type', NEW.assignee_type, 'id', NEW.assignee_id)
      );
    END IF;
  ELSIF (NEW.assignee_type IS DISTINCT FROM OLD.assignee_type
         OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id)
        AND NEW.assignees IS NOT DISTINCT FROM OLD.assignees THEN
    IF NEW.assignee_type IN ('human', 'agent') AND NEW.assignee_id IS NOT NULL THEN
      NEW.assignees := jsonb_build_array(
        jsonb_build_object('type', NEW.assignee_type, 'id', NEW.assignee_id)
      );
    ELSE
      NEW.assignees := '[]'::jsonb;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_space_item_assignees ON public.space_items;
CREATE TRIGGER trg_sync_space_item_assignees
  BEFORE INSERT OR UPDATE ON public.space_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_space_item_assignees();

COMMIT;
