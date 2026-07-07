-- Prevent mission deletion when task removal is trigger-driven from mission status sync.
-- Keep manual task delete -> mission delete behavior for top-level deletes only.
CREATE OR REPLACE FUNCTION sync_task_delete_to_mission()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.mission_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Depth > 1 means this delete was fired from another trigger/function.
  -- In that path, do not cascade back into missions.
  IF pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;

  DELETE FROM missions
  WHERE id = OLD.mission_id
    AND user_id = OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_task_delete_to_mission ON tasks;
CREATE TRIGGER trg_sync_task_delete_to_mission
  AFTER DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_delete_to_mission();
