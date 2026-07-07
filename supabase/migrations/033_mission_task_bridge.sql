-- 033: Bridge missions → tasks
-- When a mission enters 'planning', auto-create a linked task.
-- When mission status changes, sync the linked task status.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_mission_id
  ON tasks(mission_id) WHERE mission_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_mission_to_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Create linked task when mission enters planning
  IF NEW.status = 'planning' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'planning') THEN
    INSERT INTO tasks (user_id, title, description, status, priority, mission_id, tags)
    VALUES (NEW.user_id, NEW.title, NEW.brief, 'planning', COALESCE(NEW.priority, 'medium'), NEW.id, ARRAY['mission'])
    ON CONFLICT (mission_id) WHERE mission_id IS NOT NULL DO NOTHING;
  END IF;

  -- Sync status for lifecycle transitions
  IF NEW.status IN ('todo', 'in_progress', 'review', 'done', 'blocked') AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE tasks
    SET status = NEW.status,
        updated_at = NOW(),
        completed_at = CASE WHEN NEW.status = 'done' THEN NOW() ELSE NULL END
    WHERE mission_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_mission_to_task ON missions;
CREATE TRIGGER trg_sync_mission_to_task
  AFTER UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION sync_mission_to_task();
