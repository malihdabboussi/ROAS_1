-- 037: Reverse sync — tasks → missions
-- When a mission-linked task's status changes, propagate back to the missions table.
-- Guards against infinite loops via IS DISTINCT FROM on both sides.

CREATE OR REPLACE FUNCTION sync_task_to_mission()
RETURNS TRIGGER AS $$
DECLARE
  mapped_status TEXT;
BEGIN
  IF NEW.mission_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  mapped_status := CASE NEW.status
    WHEN 'planning' THEN 'planning'
    WHEN 'todo' THEN 'todo'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'review' THEN 'review'
    WHEN 'done' THEN 'done'
    WHEN 'blocked' THEN 'blocked'
    ELSE NULL
  END;

  IF mapped_status IS NULL THEN RETURN NEW; END IF;

  UPDATE missions
  SET status = mapped_status,
      updated_at = NOW(),
      completed_at = CASE WHEN mapped_status = 'done' THEN NOW() ELSE completed_at END
  WHERE id = NEW.mission_id
    AND status IS DISTINCT FROM mapped_status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_task_to_mission ON tasks;
CREATE TRIGGER trg_sync_task_to_mission
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_to_mission();
