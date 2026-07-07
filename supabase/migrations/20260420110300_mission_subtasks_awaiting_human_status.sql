-- Add 'awaiting_human' status to both mission_subtasks and missions.
-- awaiting_human is distinct from 'blocked': SLA-clocked, expected to be acted on.

ALTER TABLE public.mission_subtasks DROP CONSTRAINT IF EXISTS mission_subtasks_status_check;
ALTER TABLE public.mission_subtasks ADD CONSTRAINT mission_subtasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'awaiting_human', 'done', 'revision', 'blocked', 'cancelled'));

ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_status_check;
ALTER TABLE public.missions ADD CONSTRAINT missions_status_check
  CHECK (status IN (
    'inbox', 'backlog', 'planning', 'todo', 'in_progress',
    'awaiting_human', 'review', 'blocked', 'done',
    'archived', 'error', 'failed', 'dead_letter', 'pending_approval'
  ));
