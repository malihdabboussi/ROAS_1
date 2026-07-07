-- ============================================================================
-- Brain Ops Outbox — silent queue for Atlas brain maintenance jobs
-- Same outbox pattern as mission_outbox but for internal brain operations
-- that don't appear in Mission Control or the user's Kanban board.
-- ============================================================================

CREATE TABLE IF NOT EXISTS brain_ops_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  org_id uuid,
  event_type text NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  payload jsonb DEFAULT '{}',
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error text,
  next_attempt_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_brain_ops_outbox_pending
  ON brain_ops_outbox (status, next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_brain_ops_outbox_brain
  ON brain_ops_outbox (brain_id, created_at DESC);

-- Real-time dispatch via LISTEN/NOTIFY
CREATE OR REPLACE FUNCTION notify_brain_ops_outbox() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('brain_ops_outbox_new', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brain_ops_outbox_notify
  AFTER INSERT ON brain_ops_outbox
  FOR EACH ROW EXECUTE FUNCTION notify_brain_ops_outbox();
