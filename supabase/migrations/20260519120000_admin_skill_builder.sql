-- Platform admin skill builder (invisible to customers)

CREATE TABLE IF NOT EXISTS public.admin_skill_builder_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acting_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  target_agent_key TEXT NOT NULL,
  target_agent_name TEXT,
  acting_user_email TEXT,
  org_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_skill_builder_sessions_admin
  ON public.admin_skill_builder_sessions (admin_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_skill_builder_sessions_acting
  ON public.admin_skill_builder_sessions (acting_user_id, org_id, target_agent_key);

CREATE TABLE IF NOT EXISTS public.admin_skill_builder_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.admin_skill_builder_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  content_blocks JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_skill_builder_messages_session
  ON public.admin_skill_builder_messages (session_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.admin_enterprise_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acting_user_id UUID NOT NULL,
  org_id UUID,
  agent_key TEXT NOT NULL,
  skill_key TEXT,
  action TEXT NOT NULL,
  payload_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_enterprise_audit_log_created
  ON public.admin_enterprise_audit_log (created_at DESC);

ALTER TABLE public.admin_skill_builder_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_skill_builder_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_enterprise_audit_log ENABLE ROW LEVEL SECURITY;
