-- Add backlog, archived, dead_letter to missions status check constraint
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_status_check;
ALTER TABLE missions ADD CONSTRAINT missions_status_check
  CHECK (status = ANY (ARRAY['inbox','backlog','planning','todo','in_progress','review','blocked','done','archived','error','failed','dead_letter']));

-- Update trigger to sync backlog/archived from task → mission
CREATE OR REPLACE FUNCTION sync_task_to_mission()
RETURNS TRIGGER AS $$
DECLARE
  mapped_status TEXT;
BEGIN
  IF NEW.mission_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  mapped_status := CASE NEW.status
    WHEN 'backlog' THEN 'backlog'
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
