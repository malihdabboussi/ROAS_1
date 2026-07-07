-- 032: Add 'blocked' status to missions lifecycle

ALTER TABLE missions
  DROP CONSTRAINT IF EXISTS missions_status_check;

ALTER TABLE missions
  ADD CONSTRAINT missions_status_check
  CHECK (
    status IN (
      'inbox',
      'planning',
      'todo',
      'in_progress',
      'review',
      'blocked',
      'done',
      'failed',
      'dead_letter',
      'queued',
      'dispatching',
      'running'
    )
  );
