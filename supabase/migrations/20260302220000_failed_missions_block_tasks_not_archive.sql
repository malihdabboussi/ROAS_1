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

  -- Failed/dead-letter missions → block the task so it stays visible on the board.
  -- Only the user should archive tasks manually.
  IF NEW.status IN ('failed', 'dead_letter') AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE tasks
    SET status = 'blocked',
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

-- Backfill: move currently-archived tasks linked to failed/dead_letter missions back to blocked.
UPDATE tasks t
SET status = 'blocked', updated_at = NOW()
FROM missions m
WHERE t.mission_id = m.id
  AND t.status = 'archived'
  AND m.status IN ('failed', 'dead_letter');
