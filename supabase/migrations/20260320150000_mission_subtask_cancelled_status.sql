-- Add 'cancelled' to mission_subtasks.status CHECK constraint for manager-driven scope changes.
ALTER TABLE public.mission_subtasks DROP CONSTRAINT IF EXISTS mission_subtasks_status_check;
ALTER TABLE public.mission_subtasks ADD CONSTRAINT mission_subtasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'done', 'revision', 'blocked', 'cancelled'));
