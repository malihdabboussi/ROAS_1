-- V1 skill recommendations: token-free workflow signals + Jaime-reviewed proposals.

CREATE TABLE IF NOT EXISTS public.skill_recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  conversation_id UUID,
  trace_id UUID,
  channel TEXT,
  prompt_fingerprint TEXT NOT NULL,
  prompt_excerpt TEXT,
  tool_signature TEXT NOT NULL DEFAULT '',
  tool_names TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  skill_keys_used TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  workflow_keys_used TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_recommendation_events_org_created
  ON public.skill_recommendation_events(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_recommendation_events_pattern
  ON public.skill_recommendation_events(org_id, agent_key, prompt_fingerprint, tool_signature, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_recommendation_events_trace
  ON public.skill_recommendation_events(trace_id)
  WHERE trace_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.skill_recommendation_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  prompt_fingerprint TEXT NOT NULL,
  tool_signature TEXT NOT NULL DEFAULT '',
  tool_names TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  run_count INTEGER NOT NULL DEFAULT 0,
  evidence_event_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
  first_event_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'analysis_queued', 'analysis_processing', 'recommended', 'skipped', 'dismissed', 'converted')
  ),
  skip_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_recommendation_candidates_group
  ON public.skill_recommendation_candidates(org_id, agent_key, prompt_fingerprint, tool_signature);

CREATE INDEX IF NOT EXISTS idx_skill_recommendation_candidates_org_status
  ON public.skill_recommendation_candidates(org_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.skill_recommendation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.skill_recommendation_candidates(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'retry', 'succeeded', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  result JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_recommendation_jobs_due
  ON public.skill_recommendation_jobs(status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_skill_recommendation_jobs_org_created
  ON public.skill_recommendation_jobs(org_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_recommendation_jobs_active_dedupe
  ON public.skill_recommendation_jobs(org_id, dedupe_key)
  WHERE status IN ('queued', 'processing', 'retry');

CREATE TABLE IF NOT EXISTS public.skill_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.skill_recommendation_candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.skill_recommendation_jobs(id) ON DELETE SET NULL,
  target_agent_key TEXT NOT NULL,
  skill_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  markdown_content TEXT NOT NULL,
  resources JSONB NOT NULL DEFAULT '[]'::JSONB,
  evidence_event_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
  workflow_summary TEXT NOT NULL DEFAULT '',
  recommended_actions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'dismissed', 'converted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_recommendations_candidate
  ON public.skill_recommendations(candidate_id);

CREATE INDEX IF NOT EXISTS idx_skill_recommendations_org_status
  ON public.skill_recommendations(org_id, status, created_at DESC);

ALTER TABLE public.skill_recommendation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_recommendation_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_recommendation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_recommendation_events_select_org ON public.skill_recommendation_events;
CREATE POLICY skill_recommendation_events_select_org
  ON public.skill_recommendation_events
  FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS skill_recommendation_candidates_select_org ON public.skill_recommendation_candidates;
CREATE POLICY skill_recommendation_candidates_select_org
  ON public.skill_recommendation_candidates
  FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS skill_recommendation_jobs_select_org ON public.skill_recommendation_jobs;
CREATE POLICY skill_recommendation_jobs_select_org
  ON public.skill_recommendation_jobs
  FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS skill_recommendations_select_org ON public.skill_recommendations;
CREATE POLICY skill_recommendations_select_org
  ON public.skill_recommendations
  FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS skill_recommendations_update_org ON public.skill_recommendations;
CREATE POLICY skill_recommendations_update_org
  ON public.skill_recommendations
  FOR UPDATE
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP TRIGGER IF EXISTS set_updated_at_skill_recommendation_candidates ON public.skill_recommendation_candidates;
CREATE TRIGGER set_updated_at_skill_recommendation_candidates
  BEFORE UPDATE ON public.skill_recommendation_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_skill_recommendation_jobs ON public.skill_recommendation_jobs;
CREATE TRIGGER set_updated_at_skill_recommendation_jobs
  BEFORE UPDATE ON public.skill_recommendation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_skill_recommendations ON public.skill_recommendations;
CREATE TRIGGER set_updated_at_skill_recommendations
  BEFORE UPDATE ON public.skill_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.enqueue_skill_recommendation_candidate()
RETURNS TRIGGER AS $$
DECLARE
  event_count INTEGER;
  event_ids UUID[];
  first_seen TIMESTAMPTZ;
  last_seen TIMESTAMPTZ;
  candidate_row public.skill_recommendation_candidates%ROWTYPE;
BEGIN
  IF cardinality(COALESCE(NEW.skill_keys_used, '{}'::TEXT[])) > 0 THEN
    RETURN NEW;
  END IF;

  IF cardinality(COALESCE(NEW.workflow_keys_used, '{}'::TEXT[])) > 0 THEN
    RETURN NEW;
  END IF;

  SELECT
    count(*)::INTEGER,
    array_agg(id ORDER BY created_at DESC),
    min(created_at),
    max(created_at)
  INTO event_count, event_ids, first_seen, last_seen
  FROM public.skill_recommendation_events
  WHERE org_id = NEW.org_id
    AND agent_key = NEW.agent_key
    AND prompt_fingerprint = NEW.prompt_fingerprint
    AND tool_signature = NEW.tool_signature
    AND cardinality(COALESCE(skill_keys_used, '{}'::TEXT[])) = 0
    AND cardinality(COALESCE(workflow_keys_used, '{}'::TEXT[])) = 0
    AND created_at >= now() - interval '30 days';

  IF event_count < 3 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.skill_recommendation_candidates (
    org_id,
    agent_key,
    prompt_fingerprint,
    tool_signature,
    tool_names,
    run_count,
    evidence_event_ids,
    first_event_at,
    last_event_at,
    status
  )
  VALUES (
    NEW.org_id,
    NEW.agent_key,
    NEW.prompt_fingerprint,
    NEW.tool_signature,
    NEW.tool_names,
    event_count,
    event_ids,
    first_seen,
    last_seen,
    'open'
  )
  ON CONFLICT (org_id, agent_key, prompt_fingerprint, tool_signature)
  DO UPDATE SET
    tool_names = EXCLUDED.tool_names,
    run_count = EXCLUDED.run_count,
    evidence_event_ids = EXCLUDED.evidence_event_ids,
    first_event_at = EXCLUDED.first_event_at,
    last_event_at = EXCLUDED.last_event_at,
    status = CASE
      WHEN public.skill_recommendation_candidates.status IN ('skipped', 'dismissed', 'converted', 'recommended')
        THEN public.skill_recommendation_candidates.status
      ELSE public.skill_recommendation_candidates.status
    END,
    updated_at = now()
  RETURNING * INTO candidate_row;

  IF candidate_row.status IN ('open', 'analysis_queued') THEN
    INSERT INTO public.skill_recommendation_jobs (
      user_id,
      org_id,
      candidate_id,
      dedupe_key,
      payload,
      status,
      next_attempt_at
    )
    VALUES (
      NEW.user_id,
      NEW.org_id,
      candidate_row.id,
      'skill-recommendation:' || candidate_row.id::TEXT,
      jsonb_build_object('candidate_id', candidate_row.id, 'trigger_event_id', NEW.id),
      'queued',
      now()
    )
    ON CONFLICT DO NOTHING;

    UPDATE public.skill_recommendation_candidates
    SET status = 'analysis_queued'
    WHERE id = candidate_row.id
      AND status = 'open';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS skill_recommendation_events_detect_candidate ON public.skill_recommendation_events;
CREATE TRIGGER skill_recommendation_events_detect_candidate
  AFTER INSERT ON public.skill_recommendation_events
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_skill_recommendation_candidate();
