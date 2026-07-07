-- Agent Learning Loops: broaden skill recommendations into guarded agent/skill proposals.

ALTER TABLE public.skill_recommendation_candidates
  DROP CONSTRAINT IF EXISTS skill_recommendation_candidates_status_check;

ALTER TABLE public.skill_recommendation_candidates
  ADD CONSTRAINT skill_recommendation_candidates_status_check
  CHECK (
    status IN (
      'open',
      'analysis_queued',
      'analysis_processing',
      'recommended',
      'routed_out',
      'skipped',
      'dismissed',
      'converted'
    )
  );

ALTER TABLE public.skill_recommendations
  ADD COLUMN IF NOT EXISTS proposal_kind TEXT NOT NULL DEFAULT 'skill_create',
  ADD COLUMN IF NOT EXISTS route_out_type TEXT,
  ADD COLUMN IF NOT EXISTS customer_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS target_artifact_kind TEXT NOT NULL DEFAULT 'skill',
  ADD COLUMN IF NOT EXISTS target_artifact_key TEXT,
  ADD COLUMN IF NOT EXISTS artifact_lock_key TEXT,
  ADD COLUMN IF NOT EXISTS priority_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proposed_patch JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS quality_failures TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS applied_checkpoint_id UUID REFERENCES public.agent_checkpoints(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS applied_experiment_id UUID,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.skill_recommendations
SET
  proposal_kind = COALESCE(proposal_kind, 'skill_create'),
  customer_visible = COALESCE(customer_visible, true),
  target_artifact_kind = COALESCE(target_artifact_kind, 'skill'),
  target_artifact_key = COALESCE(target_artifact_key, skill_key),
  artifact_lock_key = COALESCE(
    artifact_lock_key,
    org_id::TEXT || ':' || target_agent_key || ':skill:' || skill_key
  ),
  proposed_patch = CASE
    WHEN proposed_patch = '{}'::JSONB THEN jsonb_build_object(
      'skill_key', skill_key,
      'name', name,
      'description', description,
      'markdown_content', markdown_content,
      'resources', resources
    )
    ELSE proposed_patch
  END
WHERE proposal_kind = 'skill_create';

ALTER TABLE public.skill_recommendations
  DROP CONSTRAINT IF EXISTS skill_recommendations_status_check,
  DROP CONSTRAINT IF EXISTS skill_recommendations_proposal_kind_check,
  DROP CONSTRAINT IF EXISTS skill_recommendations_route_out_type_check,
  DROP CONSTRAINT IF EXISTS skill_recommendations_target_artifact_kind_check,
  DROP CONSTRAINT IF EXISTS skill_recommendations_priority_score_check,
  DROP CONSTRAINT IF EXISTS skill_recommendations_proposed_patch_shape_check;

ALTER TABLE public.skill_recommendations
  ADD CONSTRAINT skill_recommendations_status_check
  CHECK (
    status IN (
      'ready',
      'dismissed',
      'converted',
      'routed_out',
      'experiment_running',
      'kept',
      'revising',
      'reverted',
      'inconclusive'
    )
  ),
  ADD CONSTRAINT skill_recommendations_proposal_kind_check
  CHECK (
    proposal_kind IN (
      'skill_create',
      'skill_update',
      'skill_resource_update',
      'agent_file_update',
      'route_out'
    )
  ),
  ADD CONSTRAINT skill_recommendations_route_out_type_check
  CHECK (
    route_out_type IS NULL
    OR route_out_type IN (
      'system_artifact_internal_review',
      'product_fix_proposal',
      'unsupported_scope'
    )
  ),
  ADD CONSTRAINT skill_recommendations_target_artifact_kind_check
  CHECK (target_artifact_kind IN ('skill', 'skill_resource', 'agent_file', 'tool_schema')),
  ADD CONSTRAINT skill_recommendations_priority_score_check
  CHECK (priority_score >= 0 AND priority_score <= 100),
  ADD CONSTRAINT skill_recommendations_proposed_patch_shape_check
  CHECK (jsonb_typeof(proposed_patch) = 'object');

CREATE INDEX IF NOT EXISTS idx_skill_recommendations_org_artifact_lock
  ON public.skill_recommendations(org_id, artifact_lock_key, status)
  WHERE artifact_lock_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_skill_recommendations_org_customer_visible
  ON public.skill_recommendations(org_id, customer_visible, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_learning_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES public.skill_recommendations(id) ON DELETE CASCADE,
  target_agent_key TEXT NOT NULL,
  artifact_lock_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'reverted')),
  baseline_metrics JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(baseline_metrics) = 'object'),
  current_metrics JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(current_metrics) = 'object'),
  qualifying_events INTEGER NOT NULL DEFAULT 0 CHECK (qualifying_events >= 0),
  decision TEXT CHECK (decision IN ('keep', 'revise', 'revert', 'inconclusive')),
  decision_reasons TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_learning_experiments_org_recommendation
  ON public.agent_learning_experiments(org_id, recommendation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_learning_experiments_org_artifact_running
  ON public.agent_learning_experiments(org_id, artifact_lock_key, created_at DESC)
  WHERE status = 'running';

ALTER TABLE public.agent_learning_experiments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_learning_experiments_select_org
  ON public.agent_learning_experiments;
CREATE POLICY agent_learning_experiments_select_org
  ON public.agent_learning_experiments
  FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS agent_learning_experiments_update_org
  ON public.agent_learning_experiments;
CREATE POLICY agent_learning_experiments_update_org
  ON public.agent_learning_experiments
  FOR UPDATE
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP TRIGGER IF EXISTS set_updated_at_agent_learning_experiments
  ON public.agent_learning_experiments;
CREATE TRIGGER set_updated_at_agent_learning_experiments
  BEFORE UPDATE ON public.agent_learning_experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
