CREATE OR REPLACE FUNCTION public.sync_mission_status_to_space_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_id UUID;
  v_space_id UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'done' THEN
      UPDATE public.space_items
      SET status = 'done', updated_at = now()
      WHERE linked_mission_id = NEW.id AND status <> 'done'
      RETURNING id, space_id INTO v_item_id, v_space_id;
    ELSIF NEW.status IN ('blocked') THEN
      UPDATE public.space_items
      SET status = 'in_progress', updated_at = now()
      WHERE linked_mission_id = NEW.id AND status NOT IN ('done')
      RETURNING id, space_id INTO v_item_id, v_space_id;
    ELSIF NEW.status IN ('failed', 'error') THEN
      UPDATE public.space_items
      SET status = 'todo',
          notes = COALESCE(notes, '') || E'\n[Mission failed: ' || COALESCE(NEW.error, 'unknown error') || ']',
          updated_at = now()
      WHERE linked_mission_id = NEW.id AND status NOT IN ('done')
      RETURNING id, space_id INTO v_item_id, v_space_id;
    END IF;

    IF v_item_id IS NOT NULL THEN
      PERFORM pg_notify(
        'space_automation_eval',
        json_build_object(
          'item_id', v_item_id,
          'space_id', v_space_id,
          'mission_id', NEW.id,
          'mission_status', NEW.status,
          'trigger_type', CASE
            WHEN NEW.status = 'done' THEN 'mission_completed'
            WHEN NEW.status IN ('failed', 'error') THEN 'mission_failed'
            ELSE NULL
          END
        )::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
