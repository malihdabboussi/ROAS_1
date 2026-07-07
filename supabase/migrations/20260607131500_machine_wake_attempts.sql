CREATE TABLE IF NOT EXISTS public.machine_wake_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  machine_id TEXT,
  fly_app TEXT,
  requested_by TEXT NOT NULL DEFAULT 'api',
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'failed_retryable', 'failed_terminal')),
  phase TEXT NOT NULL DEFAULT 'profile_lookup',
  failure_code TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_wake_attempts_user_created
  ON public.machine_wake_attempts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_machine_wake_attempts_machine_created
  ON public.machine_wake_attempts(machine_id, created_at DESC)
  WHERE machine_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_machine_wake_attempts_status_phase
  ON public.machine_wake_attempts(status, phase, created_at DESC);

ALTER TABLE public.machine_wake_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS machine_wake_attempts_select_own ON public.machine_wake_attempts;
CREATE POLICY machine_wake_attempts_select_own
  ON public.machine_wake_attempts
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS machine_wake_attempts_insert_own ON public.machine_wake_attempts;
CREATE POLICY machine_wake_attempts_insert_own
  ON public.machine_wake_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS machine_wake_attempts_update_own ON public.machine_wake_attempts;
CREATE POLICY machine_wake_attempts_update_own
  ON public.machine_wake_attempts
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.update_machine_wake_attempts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS machine_wake_attempts_updated_at ON public.machine_wake_attempts;
CREATE TRIGGER machine_wake_attempts_updated_at
  BEFORE UPDATE ON public.machine_wake_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_machine_wake_attempts_updated_at();
