-- Flow Builder V2 control-plane tables.
-- Runtime execution remains in public.space_automations.

CREATE TABLE IF NOT EXISTS public.project_flow_build_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.space_automations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('needs_clarification', 'planned', 'validated', 'compiled', 'blocked')),
  intent TEXT NOT NULL DEFAULT '',
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  context_hash TEXT,
  trace_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  clarification_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluation_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_flow_build_session_space
  ON public.project_flow_build_session(space_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_flow_build_session_org
  ON public.project_flow_build_session(org_id, updated_at DESC)
  WHERE org_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.project_flow_build_clarification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.project_flow_build_session(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question JSONB NOT NULL DEFAULT '{}'::jsonb,
  answer JSONB,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_flow_build_clarification_session
  ON public.project_flow_build_clarification(session_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.project_flow_action_blueprint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Custom',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_contexts TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  output_contexts TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  promotion_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_flow_action_blueprint_space
  ON public.project_flow_action_blueprint(space_id, status, updated_at DESC)
  WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_flow_action_blueprint_org
  ON public.project_flow_action_blueprint(org_id, status, updated_at DESC)
  WHERE org_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.project_flow_action_blueprint_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.project_flow_action_blueprint(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blueprint_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_project_flow_action_blueprint_version_blueprint
  ON public.project_flow_action_blueprint_version(blueprint_id, version_number DESC);

CREATE TABLE IF NOT EXISTS public.project_flow_build_evaluation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.project_flow_build_session(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scenario_key TEXT,
  prompt TEXT NOT NULL DEFAULT '',
  trace_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC(5,2),
  rank TEXT CHECK (rank IN ('A', 'B', 'C', 'D', 'F')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_flow_build_evaluation_space
  ON public.project_flow_build_evaluation(space_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_flow_action_promotion_candidate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
  blueprint_id UUID REFERENCES public.project_flow_action_blueprint(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  normalized_name TEXT NOT NULL,
  normalized_category TEXT NOT NULL DEFAULT 'Custom',
  meta_step JSONB NOT NULL DEFAULT '{}'::jsonb,
  usage_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate', 'promoted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_flow_action_promotion_candidate_org
  ON public.project_flow_action_promotion_candidate(org_id, status, usage_count DESC)
  WHERE org_id IS NOT NULL;

ALTER TABLE public.project_flow_build_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_flow_build_clarification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_flow_action_blueprint ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_flow_action_blueprint_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_flow_build_evaluation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_flow_action_promotion_candidate ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_flow_build_session_select ON public.project_flow_build_session
  FOR SELECT TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY project_flow_build_session_write ON public.project_flow_build_session
  FOR ALL TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY project_flow_build_clarification_select ON public.project_flow_build_clarification
  FOR SELECT TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY project_flow_build_clarification_write ON public.project_flow_build_clarification
  FOR ALL TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY project_flow_action_blueprint_select ON public.project_flow_action_blueprint
  FOR SELECT TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY project_flow_action_blueprint_write ON public.project_flow_action_blueprint
  FOR ALL TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY project_flow_action_blueprint_version_select ON public.project_flow_action_blueprint_version
  FOR SELECT TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY project_flow_action_blueprint_version_write ON public.project_flow_action_blueprint_version
  FOR ALL TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY project_flow_build_evaluation_select ON public.project_flow_build_evaluation
  FOR SELECT TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY project_flow_build_evaluation_write ON public.project_flow_build_evaluation
  FOR ALL TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY project_flow_action_promotion_candidate_select ON public.project_flow_action_promotion_candidate
  FOR SELECT TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY project_flow_action_promotion_candidate_write ON public.project_flow_action_promotion_candidate
  FOR ALL TO public
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );
