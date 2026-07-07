CREATE TABLE IF NOT EXISTS public.dream_ops_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  target_id UUID,
  enabled BOOLEAN NOT NULL DEFAULT false,
  schedule TEXT NOT NULL DEFAULT 'manual_only',
  local_time TIME NOT NULL DEFAULT '02:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  lookback_hours INTEGER NOT NULL DEFAULT 24,
  min_activity_threshold INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_queued_local_date TEXT,
  last_successful_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dream_ops_settings_operation_type_check CHECK (
    operation_type IN ('company_daily_dream', 'agent_learning_dream')
  ),
  CONSTRAINT dream_ops_settings_subject_kind_check CHECK (
    subject_kind IN ('company_brain', 'agent')
  ),
  CONSTRAINT dream_ops_settings_schedule_check CHECK (
    schedule IN ('daily', 'weekdays', 'manual_only')
  ),
  CONSTRAINT dream_ops_settings_lookback_check CHECK (lookback_hours BETWEEN 1 AND 168),
  CONSTRAINT dream_ops_settings_min_activity_check CHECK (min_activity_threshold >= 0),
  CONSTRAINT dream_ops_settings_metadata_shape_check CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT dream_ops_settings_unique_subject UNIQUE (
    org_id,
    operation_type,
    subject_kind,
    subject_key
  )
);

CREATE INDEX IF NOT EXISTS idx_dream_ops_settings_due
  ON public.dream_ops_settings (enabled, operation_type, schedule, local_time);

CREATE INDEX IF NOT EXISTS idx_dream_ops_settings_org_operation
  ON public.dream_ops_settings (org_id, operation_type, subject_key);

CREATE TABLE IF NOT EXISTS public.dream_ops_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  target_id UUID,
  dedupe_key TEXT NOT NULL,
  local_date TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  source_counts JSONB NOT NULL DEFAULT '{}'::JSONB,
  chunks_processed INTEGER NOT NULL DEFAULT 0,
  output JSONB NOT NULL DEFAULT '{}'::JSONB,
  skipped_reason TEXT,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dream_ops_runs_operation_type_check CHECK (
    operation_type IN ('company_daily_dream', 'agent_learning_dream')
  ),
  CONSTRAINT dream_ops_runs_subject_kind_check CHECK (subject_kind IN ('company_brain', 'agent')),
  CONSTRAINT dream_ops_runs_status_check CHECK (
    status IN ('queued', 'running', 'completed', 'skipped', 'failed')
  ),
  CONSTRAINT dream_ops_runs_skipped_reason_check CHECK (
    skipped_reason IS NULL
    OR skipped_reason IN ('no_source_activity', 'no_meaningful_evidence', 'deduped', 'disabled')
  ),
  CONSTRAINT dream_ops_runs_window_check CHECK (window_end > window_start),
  CONSTRAINT dream_ops_runs_chunks_check CHECK (chunks_processed >= 0),
  CONSTRAINT dream_ops_runs_source_counts_shape_check CHECK (jsonb_typeof(source_counts) = 'object'),
  CONSTRAINT dream_ops_runs_output_shape_check CHECK (jsonb_typeof(output) = 'object'),
  CONSTRAINT dream_ops_runs_dedupe_unique UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_dream_ops_runs_org_created
  ON public.dream_ops_runs (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dream_ops_runs_operation_subject
  ON public.dream_ops_runs (org_id, operation_type, subject_kind, subject_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dream_ops_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  target_id UUID,
  dedupe_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dream_ops_outbox_operation_type_check CHECK (
    operation_type IN ('company_daily_dream', 'agent_learning_dream')
  ),
  CONSTRAINT dream_ops_outbox_subject_kind_check CHECK (subject_kind IN ('company_brain', 'agent')),
  CONSTRAINT dream_ops_outbox_status_check CHECK (
    status IN ('pending', 'processing', 'done', 'failed')
  ),
  CONSTRAINT dream_ops_outbox_attempts_check CHECK (attempts >= 0 AND max_attempts > 0),
  CONSTRAINT dream_ops_outbox_payload_shape_check CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT dream_ops_outbox_dedupe_unique UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_dream_ops_outbox_pending
  ON public.dream_ops_outbox (status, next_attempt_at, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dream_ops_outbox_org_operation
  ON public.dream_ops_outbox (org_id, operation_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_dream_ops_outbox() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('dream_ops_outbox_new', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dream_ops_outbox_notify ON public.dream_ops_outbox;
CREATE TRIGGER dream_ops_outbox_notify
  AFTER INSERT ON public.dream_ops_outbox
  FOR EACH ROW EXECUTE FUNCTION public.notify_dream_ops_outbox();

DROP TRIGGER IF EXISTS set_updated_at_dream_ops_settings ON public.dream_ops_settings;
CREATE TRIGGER set_updated_at_dream_ops_settings
  BEFORE UPDATE ON public.dream_ops_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_dream_ops_runs ON public.dream_ops_runs;
CREATE TRIGGER set_updated_at_dream_ops_runs
  BEFORE UPDATE ON public.dream_ops_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_dream_ops_outbox ON public.dream_ops_outbox;
CREATE TRIGGER set_updated_at_dream_ops_outbox
  BEFORE UPDATE ON public.dream_ops_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.dream_ops_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_ops_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_ops_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dream_ops_settings_select_org ON public.dream_ops_settings;
CREATE POLICY dream_ops_settings_select_org ON public.dream_ops_settings
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS dream_ops_settings_admin_write ON public.dream_ops_settings;
CREATE POLICY dream_ops_settings_admin_write ON public.dream_ops_settings
  FOR ALL TO authenticated
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

DROP POLICY IF EXISTS dream_ops_settings_service_all ON public.dream_ops_settings;
CREATE POLICY dream_ops_settings_service_all ON public.dream_ops_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS dream_ops_runs_select_org ON public.dream_ops_runs;
CREATE POLICY dream_ops_runs_select_org ON public.dream_ops_runs
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS dream_ops_runs_service_all ON public.dream_ops_runs;
CREATE POLICY dream_ops_runs_service_all ON public.dream_ops_runs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS dream_ops_outbox_select_org ON public.dream_ops_outbox;
CREATE POLICY dream_ops_outbox_select_org ON public.dream_ops_outbox
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS dream_ops_outbox_service_all ON public.dream_ops_outbox;
CREATE POLICY dream_ops_outbox_service_all ON public.dream_ops_outbox
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.dream_ops_settings (
  org_id,
  user_id,
  operation_type,
  subject_kind,
  subject_key,
  target_id,
  enabled,
  schedule,
  local_time,
  timezone,
  lookback_hours,
  min_activity_threshold,
  metadata,
  last_successful_run_at
)
SELECT
  ccs.org_id,
  nb.owner_id,
  'company_daily_dream',
  'company_brain',
  ccs.brain_id::TEXT,
  ccs.brain_id,
  ccs.enabled,
  ccs.schedule,
  ccs.local_time,
  ccs.timezone,
  ccs.lookback_hours,
  ccs.min_activity_threshold,
  jsonb_build_object('source', 'company_cortex_settings'),
  ccs.last_successful_dream_at
FROM public.company_cortex_settings ccs
JOIN public.ns_brains nb ON nb.id = ccs.brain_id
WHERE ccs.brain_id IS NOT NULL
ON CONFLICT (org_id, operation_type, subject_kind, subject_key)
DO UPDATE SET
  user_id = EXCLUDED.user_id,
  target_id = EXCLUDED.target_id,
  enabled = EXCLUDED.enabled,
  schedule = EXCLUDED.schedule,
  local_time = EXCLUDED.local_time,
  timezone = EXCLUDED.timezone,
  lookback_hours = EXCLUDED.lookback_hours,
  min_activity_threshold = EXCLUDED.min_activity_threshold,
  metadata = EXCLUDED.metadata,
  last_successful_run_at = EXCLUDED.last_successful_run_at;
