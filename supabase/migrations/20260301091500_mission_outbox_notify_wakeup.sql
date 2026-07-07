-- Event-driven wakeup for outbox dispatcher.
-- Keeps low-frequency reconciliation as safety net in worker code.

CREATE OR REPLACE FUNCTION public.notify_mission_outbox_new()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM pg_notify('mission_outbox_new', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mission_outbox_notify ON public.mission_outbox;
CREATE TRIGGER trg_mission_outbox_notify
AFTER INSERT ON public.mission_outbox
FOR EACH ROW
EXECUTE FUNCTION public.notify_mission_outbox_new();

DROP TRIGGER IF EXISTS trg_mission_outbox_notify_pending ON public.mission_outbox;
CREATE TRIGGER trg_mission_outbox_notify_pending
AFTER UPDATE OF status ON public.mission_outbox
FOR EACH ROW
WHEN (NEW.status = 'pending' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_mission_outbox_new();
