-- 036: Expand tasks status to include backlog, planning, review, blocked, archived

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN (
    'backlog',
    'planning',
    'todo',
    'in_progress',
    'review',
    'done',
    'blocked',
    'archived'
  ));
