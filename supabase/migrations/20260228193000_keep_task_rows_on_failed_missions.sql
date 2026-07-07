CREATE OR REPLACE FUNCTION sync_mission_to_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure a task row exists whenever mission enters planning.
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

  -- Keep task row for compatibility, but hide failed/dead-letter missions from Tasks board.
  IF NEW.status IN ('failed', 'dead_letter') AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE tasks
    SET status = 'archived',
        updated_at = NOW(),
        completed_at = NULL
    WHERE mission_id = NEW.id;
  END IF;

  -- Retry path: keep linked task archived in inbox; planning will unarchive/reuse same row.
  IF NEW.status = 'inbox' AND OLD.status IN ('failed', 'dead_letter', 'blocked') THEN
    UPDATE tasks
    SET status = 'archived',
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

-- Backfill: restore missing task links so inbox mission cards can always open details.
INSERT INTO tasks (user_id, title, description, status, priority, mission_id, tags, completed_at)
SELECT
  m.user_id,
  m.title,
  m.brief,
  CASE
    WHEN m.status IN ('failed', 'dead_letter', 'error', 'inbox') THEN 'archived'
    WHEN m.status IN ('backlog', 'planning', 'todo', 'in_progress', 'review', 'done', 'blocked', 'archived') THEN m.status
    ELSE 'archived'
  END AS status,
  COALESCE(m.priority, 'medium') AS priority,
  m.id AS mission_id,
  ARRAY['mission']::text[] AS tags,
  CASE WHEN m.status = 'done' THEN COALESCE(m.completed_at, NOW()) ELSE NULL END AS completed_at
FROM missions m
LEFT JOIN tasks t ON t.mission_id = m.id
WHERE t.id IS NULL;
