-- ============================================================
-- AGENT TEAM MEMBERS + POLICY WRITE CEILINGS
-- Adds user membership for agent teams and tightens org writes
-- so creators can manage only agents inside assigned teams.
-- ============================================================

-- 1) TEAM USER MEMBERSHIP ------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_team_members (
  team_id   UUID NOT NULL REFERENCES public.agent_teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by  UUID REFERENCES auth.users(id),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_team_members_user
  ON public.agent_team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_team_members_team
  ON public.agent_team_members(team_id);

ALTER TABLE public.agent_team_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_agent_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agent_team_members m
    WHERE m.team_id = p_team_id
      AND m.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_agent(
  p_agent_key TEXT,
  p_org_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agents_registry a
    LEFT JOIN public.agent_team_members m
      ON m.team_id = a.team_id
      AND m.user_id = auth.uid()
    WHERE a.agent_key = p_agent_key
      AND (p_org_id IS NULL OR a.org_id = p_org_id)
      AND (p_user_id IS NULL OR a.user_id = p_user_id)
      AND (
        (a.org_id IS NULL AND a.user_id = auth.uid())
        OR (a.org_id IS NOT NULL AND public.is_org_admin_or_owner(a.org_id))
        OR m.user_id IS NOT NULL
      )
  )
$$;

-- Personal teams: the owner can manage membership rows.
DROP POLICY IF EXISTS agent_team_members_personal ON public.agent_team_members;
CREATE POLICY agent_team_members_personal
  ON public.agent_team_members FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM public.agent_teams t
    WHERE t.id = agent_team_members.team_id
      AND t.org_id IS NULL
      AND t.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.agent_teams t
    WHERE t.id = agent_team_members.team_id
      AND t.org_id IS NULL
      AND t.user_id = auth.uid()
  ));

-- Org members can read team memberships.
DROP POLICY IF EXISTS agent_team_members_org_read ON public.agent_team_members;
CREATE POLICY agent_team_members_org_read
  ON public.agent_team_members FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.agent_teams t
    WHERE t.id = agent_team_members.team_id
      AND t.org_id IS NOT NULL
      AND public.is_org_member(t.org_id)
  ));

-- Only org owners/admins can add or remove team members.
DROP POLICY IF EXISTS agent_team_members_org_write ON public.agent_team_members;
CREATE POLICY agent_team_members_org_write
  ON public.agent_team_members FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM public.agent_teams t
    WHERE t.id = agent_team_members.team_id
      AND t.org_id IS NOT NULL
      AND public.is_org_admin_or_owner(t.org_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.agent_teams t
    WHERE t.id = agent_team_members.team_id
      AND t.org_id IS NOT NULL
      AND public.is_org_admin_or_owner(t.org_id)
  ));

-- 2) TIGHTEN ORG WRITES ON TEAM RBAC TABLES ------------------

DROP POLICY IF EXISTS agent_teams_org_write ON public.agent_teams;
CREATE POLICY agent_teams_org_write
  ON public.agent_teams FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id));

DROP POLICY IF EXISTS agent_team_grants_org ON public.agent_team_grants;
CREATE POLICY agent_team_grants_org
  ON public.agent_team_grants FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.agent_teams t
    WHERE t.id = agent_team_grants.team_id
      AND t.org_id IS NOT NULL
      AND public.is_org_member(t.org_id)
  ));

DROP POLICY IF EXISTS agent_team_grants_org_write ON public.agent_team_grants;
CREATE POLICY agent_team_grants_org_write
  ON public.agent_team_grants FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM public.agent_teams t
    WHERE t.id = agent_team_grants.team_id
      AND t.org_id IS NOT NULL
      AND public.is_org_admin_or_owner(t.org_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.agent_teams t
    WHERE t.id = agent_team_grants.team_id
      AND t.org_id IS NOT NULL
      AND public.is_org_admin_or_owner(t.org_id)
  ));

DROP POLICY IF EXISTS agent_overrides_org ON public.agent_overrides;
DROP POLICY IF EXISTS agent_overrides_org_read ON public.agent_overrides;
CREATE POLICY agent_overrides_org_read
  ON public.agent_overrides FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS agent_overrides_org_write ON public.agent_overrides;
CREATE POLICY agent_overrides_org_write
  ON public.agent_overrides FOR ALL
  USING (
    org_id IS NOT NULL
    AND (
      public.is_org_admin_or_owner(org_id)
      OR (
        mode = 'deny'
        AND public.can_manage_agent(agent_key, org_id, user_id)
      )
    )
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND (
      public.is_org_admin_or_owner(org_id)
      OR (
        mode = 'deny'
        AND public.can_manage_agent(agent_key, org_id, user_id)
      )
    )
  );

-- 3) BACKFILL MEMBERSHIPS ------------------------------------

-- Personal teams: make the owner a member.
INSERT INTO public.agent_team_members (team_id, user_id, added_by)
SELECT t.id, t.user_id, t.user_id
FROM public.agent_teams t
WHERE t.org_id IS NULL
  AND t.user_id IS NOT NULL
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Org teams: every active owner/admin is a member for UI visibility.
INSERT INTO public.agent_team_members (team_id, user_id, added_by)
SELECT t.id, om.user_id, om.user_id
FROM public.agent_teams t
JOIN public.org_members om
  ON om.org_id = t.org_id
WHERE t.org_id IS NOT NULL
  AND om.status = 'active'
  AND om.role IN ('owner', 'admin')
ON CONFLICT (team_id, user_id) DO NOTHING;
