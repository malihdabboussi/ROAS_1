CREATE OR REPLACE FUNCTION sync_task_delete_to_mission()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.mission_id IS NULL THEN RETURN OLD; END IF;

  DELETE FROM missions WHERE id = OLD.mission_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_task_delete_to_mission ON tasks;
CREATE TRIGGER trg_sync_task_delete_to_mission
  AFTER DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_delete_to_mission();;
