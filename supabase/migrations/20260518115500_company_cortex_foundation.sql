-- Company Cortex foundation: org-scoped brain, dream runs/settings, proposed signals.

-- Allow explicit company brain scope alongside existing brain scopes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ns_brains_scope_check'
      AND conrelid = 'ns_brains'::regclass
  ) THEN
    ALTER TABLE public.ns_brains DROP CONSTRAINT ns_brains_scope_check;
  END IF;

  ALTER TABLE public.ns_brains
    ADD CONSTRAINT ns_brains_scope_check
    CHECK (scope IN ('user', 'agent', 'campaign', 'customer', 'company'));
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ns_brains_company_org
  ON public.ns_brains (org_id)
  WHERE scope = 'company' AND org_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.company_cortex_settings (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  brain_id uuid REFERENCES public.ns_brains(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT false,
  schedule text NOT NULL DEFAULT 'manual_only',
  local_time time NOT NULL DEFAULT '02:00',
  timezone text NOT NULL DEFAULT 'UTC',
  lookback_hours integer NOT NULL DEFAULT 24,
  include_sources text[] NOT NULL DEFAULT ARRAY[
    'conversations',
    'channel_messages',
    'space_item_activity',
    'space_item_deliverables',
    'conversation_documents'
  ],
  min_activity_threshold integer NOT NULL DEFAULT 1,
  last_successful_dream_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (schedule IN ('daily', 'weekdays', 'manual_only')),
  CHECK (lookback_hours BETWEEN 1 AND 168),
  CHECK (min_activity_threshold >= 0)
);

CREATE TABLE IF NOT EXISTS public.company_cortex_dream_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brain_id uuid NOT NULL REFERENCES public.ns_brains(id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  source_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  tokens_estimated integer NOT NULL DEFAULT 0,
  signals_created integer NOT NULL DEFAULT 0,
  objects_updated integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  CHECK (status IN ('queued', 'running', 'completed', 'failed', 'skipped')),
  CHECK (window_end > window_start),
  CHECK (tokens_estimated >= 0),
  CHECK (signals_created >= 0),
  CHECK (objects_updated >= 0),
  UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_company_cortex_dream_runs_org_created
  ON public.company_cortex_dream_runs (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_cortex_dream_runs_brain_status
  ON public.company_cortex_dream_runs (brain_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.company_cortex_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brain_id uuid NOT NULL REFERENCES public.ns_brains(id) ON DELETE CASCADE,
  dream_run_id uuid REFERENCES public.company_cortex_dream_runs(id) ON DELETE SET NULL,
  signal_type text NOT NULL,
  truth text NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric NOT NULL DEFAULT 0.5,
  reason text,
  context_form text,
  status text NOT NULL DEFAULT 'proposed',
  source text NOT NULL DEFAULT 'daily_dream',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (signal_type IN (
    'belief',
    'standard',
    'move',
    'anti_pattern',
    'protocol',
    'decision',
    'tension_candidate',
    'retrieval_rule'
  )),
  CHECK (status IN ('proposed', 'active', 'rejected', 'expired', 'merged')),
  CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_company_cortex_signals_brain_status
  ON public.company_cortex_signals (brain_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_cortex_signals_org_type
  ON public.company_cortex_signals (org_id, signal_type, created_at DESC);

ALTER TABLE public.company_cortex_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_cortex_dream_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_cortex_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_cortex_settings_org_read ON public.company_cortex_settings;
CREATE POLICY company_cortex_settings_org_read ON public.company_cortex_settings
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS company_cortex_settings_org_admin_write ON public.company_cortex_settings;
CREATE POLICY company_cortex_settings_org_admin_write ON public.company_cortex_settings
  FOR ALL TO authenticated
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

DROP POLICY IF EXISTS company_cortex_settings_service_all ON public.company_cortex_settings;
CREATE POLICY company_cortex_settings_service_all ON public.company_cortex_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS company_cortex_dream_runs_org_read ON public.company_cortex_dream_runs;
CREATE POLICY company_cortex_dream_runs_org_read ON public.company_cortex_dream_runs
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS company_cortex_dream_runs_service_all ON public.company_cortex_dream_runs;
CREATE POLICY company_cortex_dream_runs_service_all ON public.company_cortex_dream_runs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS company_cortex_signals_org_read ON public.company_cortex_signals;
CREATE POLICY company_cortex_signals_org_read ON public.company_cortex_signals
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS company_cortex_signals_org_admin_write ON public.company_cortex_signals;
CREATE POLICY company_cortex_signals_org_admin_write ON public.company_cortex_signals
  FOR UPDATE TO authenticated
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

DROP POLICY IF EXISTS company_cortex_signals_service_all ON public.company_cortex_signals;
CREATE POLICY company_cortex_signals_service_all ON public.company_cortex_signals
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS set_updated_at_company_cortex_settings ON public.company_cortex_settings;
CREATE TRIGGER set_updated_at_company_cortex_settings
  BEFORE UPDATE ON public.company_cortex_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_company_cortex_signals ON public.company_cortex_signals;
CREATE TRIGGER set_updated_at_company_cortex_signals
  BEFORE UPDATE ON public.company_cortex_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
