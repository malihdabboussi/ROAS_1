CREATE TABLE IF NOT EXISTS public.agent_runtime_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  workload_type TEXT NOT NULL DEFAULT 'chat'
    CHECK (workload_type IN ('chat', 'brain', 'mission', 'artifact', 'automation', 'sub_agent')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('queued', 'active', 'claimed', 'running', 'done', 'failed', 'cancelled', 'stale')),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  agent_key TEXT,
  gateway_agent_id TEXT,
  session_key TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  queue_name TEXT,
  job_id TEXT,
  worker_id TEXT,
  claimed_at TIMESTAMPTZ,
  claim_expires_at TIMESTAMPTZ,
  heartbeat_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runtime_runs_user_created
  ON public.agent_runtime_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runtime_runs_conversation_created
  ON public.agent_runtime_runs(conversation_id, created_at DESC)
  WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_runtime_runs_org_status_created
  ON public.agent_runtime_runs(org_id, status, created_at DESC)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_runtime_runs_status_heartbeat
  ON public.agent_runtime_runs(status, heartbeat_at, created_at DESC)
  WHERE status IN ('queued', 'active', 'claimed', 'running');

CREATE INDEX IF NOT EXISTS idx_agent_runtime_runs_workload_status_priority
  ON public.agent_runtime_runs(workload_type, status, priority DESC, created_at ASC)
  WHERE status IN ('queued', 'active', 'claimed', 'running');

ALTER TABLE public.agent_runtime_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_runtime_runs_select_own ON public.agent_runtime_runs;
CREATE POLICY agent_runtime_runs_select_own
  ON public.agent_runtime_runs
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS agent_runtime_runs_insert_service ON public.agent_runtime_runs;
CREATE POLICY agent_runtime_runs_insert_service
  ON public.agent_runtime_runs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS agent_runtime_runs_update_service ON public.agent_runtime_runs;
CREATE POLICY agent_runtime_runs_update_service
  ON public.agent_runtime_runs
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.update_agent_runtime_runs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_runtime_runs_updated_at ON public.agent_runtime_runs;
CREATE TRIGGER agent_runtime_runs_updated_at
  BEFORE UPDATE ON public.agent_runtime_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_agent_runtime_runs_updated_at();
