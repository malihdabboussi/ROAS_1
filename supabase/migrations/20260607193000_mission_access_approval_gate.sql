-- Mission Harness access approval gate.
-- Missing mission-scoped permissions become explicit user approvals instead of blocked work.

ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_status_check;
ALTER TABLE public.missions ADD CONSTRAINT missions_status_check
  CHECK (status IN (
    'inbox', 'backlog', 'planning', 'todo', 'in_progress',
    'awaiting_human', 'awaiting_access_approval', 'review', 'blocked', 'done',
    'archived', 'error', 'failed', 'dead_letter', 'pending_approval'
  ));

CREATE TABLE IF NOT EXISTS public.mission_agent_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  subtask_id uuid REFERENCES public.mission_subtasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_key text NOT NULL,
  capability_kind text NOT NULL DEFAULT 'action_domain' CHECK (capability_kind IN ('action_domain')),
  capability_id text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'revoked', 'expired')),
  requested_by text NOT NULL DEFAULT 'mission_preflight',
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mission_agent_access_requests_open_unique
  ON public.mission_agent_access_requests (mission_id, subtask_id, agent_key, capability_kind, capability_id)
  WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_mission_agent_access_requests_mission_status
  ON public.mission_agent_access_requests (mission_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mission_agent_access_requests_agent_capability
  ON public.mission_agent_access_requests (mission_id, agent_key, capability_kind, capability_id, status);

ALTER TABLE public.mission_agent_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mission_agent_access_requests_select" ON public.mission_agent_access_requests;
CREATE POLICY "mission_agent_access_requests_select" ON public.mission_agent_access_requests
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_agent_access_requests.mission_id
        AND m.org_id IS NOT NULL
        AND is_org_member(m.org_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_agent_access_requests.mission_id
        AND m.campaign_id IS NOT NULL
        AND has_team_campaign_access(m.campaign_id, 'view')
    )
  );

DROP POLICY IF EXISTS "mission_agent_access_requests_insert" ON public.mission_agent_access_requests;
CREATE POLICY "mission_agent_access_requests_insert" ON public.mission_agent_access_requests
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_agent_access_requests.mission_id
        AND m.campaign_id IS NOT NULL
        AND has_team_campaign_access(m.campaign_id, 'edit')
    )
  );

DROP POLICY IF EXISTS "mission_agent_access_requests_update" ON public.mission_agent_access_requests;
CREATE POLICY "mission_agent_access_requests_update" ON public.mission_agent_access_requests
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_agent_access_requests.mission_id
        AND m.campaign_id IS NOT NULL
        AND has_team_campaign_access(m.campaign_id, 'view')
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_agent_access_requests.mission_id
        AND m.campaign_id IS NOT NULL
        AND has_team_campaign_access(m.campaign_id, 'edit')
    )
  );

DROP TRIGGER IF EXISTS set_updated_at_mission_agent_access_requests ON public.mission_agent_access_requests;
CREATE TRIGGER set_updated_at_mission_agent_access_requests
  BEFORE UPDATE ON public.mission_agent_access_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mission_agent_access_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_agent_access_requests;
  END IF;
END $$;

ALTER TABLE public.mission_agent_access_requests REPLICA IDENTITY FULL;
