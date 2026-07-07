-- Mission harness: block task→mission status sync while mission is in active manager/worker states;
-- sync any transition of mission to inbox onto the linked task.

CREATE OR REPLACE FUNCTION sync_task_to_mission()
RETURNS TRIGGER AS $$
DECLARE
  mapped_status TEXT;
  mission_status TEXT;
BEGIN
  IF NEW.mission_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  SELECT m.status INTO mission_status FROM missions m WHERE m.id = NEW.mission_id LIMIT 1;
  IF mission_status IN ('in_progress', 'planning', 'review', 'todo') THEN
    RETURN NEW;
  END IF;

  mapped_status := CASE NEW.status
    WHEN 'backlog' THEN 'backlog'
    WHEN 'inbox' THEN 'inbox'
    WHEN 'planning' THEN 'planning'
    WHEN 'todo' THEN 'todo'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'review' THEN 'review'
    WHEN 'done' THEN 'done'
    WHEN 'blocked' THEN 'blocked'
    WHEN 'archived' THEN 'archived'
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

CREATE OR REPLACE FUNCTION sync_mission_to_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'planning' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'planning') THEN
    INSERT INTO tasks (user_id, title, description, status, priority, mission_id, tags, completed_at)
    VALUES (
      NEW.user_id,
      NEW.title,
      NEW.brief,
      'planning',
      COALESCE(NEW.priority, 'medium'),
      NEW.id,
      ARRAY['mission'],
      NULL
    )
    ON CONFLICT (mission_id) WHERE mission_id IS NOT NULL
    DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      status = 'planning',
      priority = EXCLUDED.priority,
      updated_at = NOW(),
      completed_at = NULL;
  END IF;

  IF NEW.status = 'todo' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'todo') AND NEW.plan_id IS NOT NULL THEN
    UPDATE tasks
    SET title = COALESCE((SELECT content->>'title' FROM missions_plans WHERE id = NEW.plan_id), NEW.title),
        description = COALESCE((SELECT content->>'summary' FROM missions_plans WHERE id = NEW.plan_id), NEW.brief),
        status = 'todo',
        updated_at = NOW(),
        completed_at = NULL
    WHERE mission_id = NEW.id;
  ELSIF NEW.status IN ('todo', 'in_progress', 'review', 'done', 'blocked')
    AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE tasks
    SET status = NEW.status,
        updated_at = NOW(),
        completed_at = CASE WHEN NEW.status = 'done' THEN NOW() ELSE NULL END
    WHERE mission_id = NEW.id;
  END IF;

  IF NEW.status IN ('failed', 'dead_letter') AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE tasks
    SET status = 'blocked',
        updated_at = NOW(),
        completed_at = NULL
    WHERE mission_id = NEW.id;
  END IF;

  IF NEW.status = 'inbox' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'inbox') THEN
    UPDATE tasks
    SET status = 'inbox',
        updated_at = NOW(),
        completed_at = NULL
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
