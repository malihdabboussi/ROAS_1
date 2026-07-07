-- Keep pending outbox rows aligned with mission priority changes.
-- This closes the gap where mission priority can be updated outside API code paths.

CREATE OR REPLACE FUNCTION public.mission_priority_to_rank(priority_value text)
RETURNS smallint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN priority_value = 'urgent' THEN 1
    WHEN priority_value = 'high' THEN 2
    WHEN priority_value = 'low' THEN 4
    ELSE 3
  END::smallint
$$;

CREATE OR REPLACE FUNCTION public.sync_mission_outbox_priority_rank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    UPDATE public.mission_outbox
    SET priority_rank = public.mission_priority_to_rank(NEW.priority),
        updated_at = NOW()
    WHERE mission_id = NEW.id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_mission_outbox_priority_rank ON public.missions;
CREATE TRIGGER trg_sync_mission_outbox_priority_rank
AFTER UPDATE OF priority ON public.missions
FOR EACH ROW
EXECUTE FUNCTION public.sync_mission_outbox_priority_rank();
