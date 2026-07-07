ALTER TABLE public.mission_subtasks
  ADD COLUMN IF NOT EXISTS execution_state JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.mission_subtasks.execution_state IS
  'Retry-resume checkpoint state for subtask execution (completed actions, receipts, and progress hints).';
