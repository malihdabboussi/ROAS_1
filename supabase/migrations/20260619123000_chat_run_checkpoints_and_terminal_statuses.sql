ALTER TABLE public.agent_runtime_runs
  DROP CONSTRAINT IF EXISTS agent_runtime_runs_status_check;

ALTER TABLE public.agent_runtime_runs
  ADD CONSTRAINT agent_runtime_runs_status_check
  CHECK (
    status IN (
      'queued',
      'active',
      'claimed',
      'running',
      'done',
      'failed',
      'failed_recoverable',
      'cancelled',
      'continued',
      'stale'
    )
  );

CREATE TABLE IF NOT EXISTS public.agent_runtime_run_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL REFERENCES public.agent_runtime_runs(run_id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  attempt_index INTEGER NOT NULL DEFAULT 0 CHECK (attempt_index >= 0),
  kind TEXT NOT NULL CHECK (
    kind IN ('tool_batch', 'context_compaction', 'failure', 'continuation', 'final')
  ),
  summary TEXT NOT NULL DEFAULT '',
  remaining_work TEXT,
  last_cursor TEXT,
  tool_count INTEGER NOT NULL DEFAULT 0 CHECK (tool_count >= 0),
  content_length INTEGER NOT NULL DEFAULT 0 CHECK (content_length >= 0),
  context_window_tokens INTEGER CHECK (context_window_tokens IS NULL OR context_window_tokens >= 0),
  last_call_input_tokens INTEGER CHECK (last_call_input_tokens IS NULL OR last_call_input_tokens >= 0),
  compaction_count INTEGER CHECK (compaction_count IS NULL OR compaction_count >= 0),
  raw_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runtime_run_checkpoints_run_created
  ON public.agent_runtime_run_checkpoints(run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runtime_run_checkpoints_conversation_created
  ON public.agent_runtime_run_checkpoints(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runtime_run_checkpoints_user_created
  ON public.agent_runtime_run_checkpoints(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runtime_run_checkpoints_org_created
  ON public.agent_runtime_run_checkpoints(org_id, created_at DESC)
  WHERE org_id IS NOT NULL;

ALTER TABLE public.agent_runtime_run_checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_runtime_run_checkpoints_select_own
  ON public.agent_runtime_run_checkpoints;
CREATE POLICY agent_runtime_run_checkpoints_select_own
  ON public.agent_runtime_run_checkpoints
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS agent_runtime_run_checkpoints_insert_service
  ON public.agent_runtime_run_checkpoints;
CREATE POLICY agent_runtime_run_checkpoints_insert_service
  ON public.agent_runtime_run_checkpoints
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
