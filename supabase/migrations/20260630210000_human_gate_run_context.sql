-- Human gate reject/resume: store review feedback and loop iteration counts on paused runs.
ALTER TABLE public.space_automation_run_state
  ADD COLUMN IF NOT EXISTS run_context JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.space_automation_run_state.run_context IS
  'Automation run scratch context (review_feedback, gate_paused_at, loop_iterations).';
