ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_notes TEXT;

CREATE OR REPLACE FUNCTION sync_mission_to_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Create linked task when mission enters planning
  IF NEW.status = 'planning' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'planning') THEN
    INSERT INTO tasks (user_id, title, description, status, priority, mission_id, tags)
    VALUES (NEW.user_id, NEW.title, NEW.brief, 'planning', COALESCE(NEW.priority, 'medium'), NEW.id, ARRAY['mission'])
    ON CONFLICT (mission_id) WHERE mission_id IS NOT NULL DO NOTHING;
  END IF;

  -- When plan is ready (todo), update task title/description from the plan
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

  -- Sync progress_notes whenever they change
  IF NEW.progress_notes IS DISTINCT FROM OLD.progress_notes THEN
    UPDATE tasks
    SET progress_notes = NEW.progress_notes,
        updated_at = NOW()
    WHERE mission_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
