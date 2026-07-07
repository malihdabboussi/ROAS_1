-- 038: Status cleanup — remove legacy, rename failed/dead_letter
-- Remove: queued, dispatching, running (legacy, 0 rows)
-- Rename: failed → error (retryable), dead_letter → failed (final)

-- Step 1: Drop constraint first so temp values don't violate it
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_status_check;

-- Step 2: Rename mission rows (order matters to avoid collision)
UPDATE missions SET status = 'failed_temp' WHERE status = 'dead_letter';
UPDATE missions SET status = 'error' WHERE status = 'failed';
UPDATE missions SET status = 'failed' WHERE status = 'failed_temp';

-- Step 3: Rename historical log statuses (failed → error first, then dead_letter → failed)
UPDATE missions_logs SET from_status = 'error' WHERE from_status = 'failed';
UPDATE missions_logs SET to_status = 'error' WHERE to_status = 'failed';
UPDATE missions_logs SET from_status = 'failed' WHERE from_status = 'dead_letter';
UPDATE missions_logs SET to_status = 'failed' WHERE to_status = 'dead_letter';

-- Step 4: Add new constraint (no legacy statuses, renamed error/failed)
ALTER TABLE missions ADD CONSTRAINT missions_status_check
  CHECK (status IN ('inbox', 'planning', 'todo', 'in_progress', 'review', 'blocked', 'done', 'error', 'failed'));

-- Step 5: Re-create the forward sync trigger (unchanged logic, just refreshed)
CREATE OR REPLACE FUNCTION sync_mission_to_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'planning' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'planning') THEN
    INSERT INTO tasks (user_id, title, description, status, priority, mission_id, tags)
    VALUES (NEW.user_id, NEW.title, NEW.brief, 'planning', COALESCE(NEW.priority, 'medium'), NEW.id, ARRAY['mission'])
    ON CONFLICT (mission_id) WHERE mission_id IS NOT NULL DO NOTHING;
  END IF;

  IF NEW.status = 'todo' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'todo') AND NEW.plan_id IS NOT NULL THEN
    UPDATE tasks
    SET title = COALESCE((SELECT content->>'title' FROM missions_plans WHERE id = NEW.plan_id), NEW.title),
        description = COALESCE((SELECT content->>'summary' FROM missions_plans WHERE id = NEW.plan_id), NEW.brief),
        status = 'todo',
        updated_at = NOW()
    WHERE mission_id = NEW.id;
  ELSIF NEW.status IN ('todo', 'in_progress', 'review', 'done', 'blocked') AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE tasks
    SET status = NEW.status,
        updated_at = NOW(),
        completed_at = CASE WHEN NEW.status = 'done' THEN NOW() ELSE NULL END
    WHERE mission_id = NEW.id;
  END IF;

  IF NEW.progress_notes IS DISTINCT FROM OLD.progress_notes THEN
    UPDATE tasks
    SET progress_notes = NEW.progress_notes,
        updated_at = NOW()
    WHERE mission_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
