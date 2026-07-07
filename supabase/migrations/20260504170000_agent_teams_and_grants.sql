-- ============================================================
-- USER-DEFINED AGENT TEAMS + RBAC
-- Adds agent_teams, agent_team_grants, agent_overrides;
-- backfills a system "General" team that mirrors today's
-- behavior so day-one is a no-op functionally.
-- ============================================================

-- 1) TABLES ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_team_id  UUID REFERENCES public.agent_teams(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT 'muted',
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((org_id IS NOT NULL) OR (user_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_teams_org_name
  ON public.agent_teams(org_id, name)
  WHERE org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_teams_user_name
  ON public.agent_teams(user_id, name)
  WHERE user_id IS NOT NULL AND org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_teams_org ON public.agent_teams(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_teams_user ON public.agent_teams(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_teams_parent ON public.agent_teams(parent_team_id) WHERE parent_team_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.agent_team_grants (
  id              BIGSERIAL PRIMARY KEY,
  team_id         UUID NOT NULL REFERENCES public.agent_teams(id) ON DELETE CASCADE,
  capability_kind TEXT NOT NULL CHECK (capability_kind IN
    ('integration','brain_domain','brain_access','campaign_context','channel','mission_type')),
  capability_id   TEXT NOT NULL,
  mode            TEXT NOT NULL DEFAULT 'allow' CHECK (mode IN ('allow')),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, capability_kind, capability_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_team_grants_team
  ON public.agent_team_grants(team_id);

CREATE INDEX IF NOT EXISTS idx_agent_team_grants_kind
  ON public.agent_team_grants(team_id, capability_kind);

CREATE TABLE IF NOT EXISTS public.agent_overrides (
  id              BIGSERIAL PRIMARY KEY,
  agent_key       TEXT NOT NULL,
  org_id          UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  capability_kind TEXT NOT NULL CHECK (capability_kind IN
    ('integration','brain_domain','brain_access','campaign_context','channel','mission_type')),
  capability_id   TEXT NOT NULL,
  mode            TEXT NOT NULL CHECK (mode IN ('allow_extra','deny')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((org_id IS NOT NULL) OR (user_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_overrides_org_unique
  ON public.agent_overrides(org_id, agent_key, capability_kind, capability_id)
  WHERE org_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_overrides_user_unique
  ON public.agent_overrides(user_id, agent_key, capability_kind, capability_id)
  WHERE user_id IS NOT NULL AND org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_overrides_lookup
  ON public.agent_overrides(agent_key, org_id, user_id);

ALTER TABLE public.agents_registry
  ADD COLUMN IF NOT EXISTS team_id UUID
  REFERENCES public.agent_teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agents_registry_team_id
  ON public.agents_registry(team_id) WHERE team_id IS NOT NULL;

-- 2) TIMESTAMP TRIGGER for agent_teams.updated_at -----------

CREATE OR REPLACE FUNCTION public.tg_agent_teams_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_teams_updated_at ON public.agent_teams;
CREATE TRIGGER trg_agent_teams_updated_at
  BEFORE UPDATE ON public.agent_teams
  FOR EACH ROW EXECUTE FUNCTION public.tg_agent_teams_set_updated_at();

-- 3) RLS ------------------------------------------------------

ALTER TABLE public.agent_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_team_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_overrides ENABLE ROW LEVEL SECURITY;

-- agent_teams
DROP POLICY IF EXISTS agent_teams_personal ON public.agent_teams;
CREATE POLICY agent_teams_personal
  ON public.agent_teams FOR ALL
  USING (org_id IS NULL AND user_id = auth.uid())
  WITH CHECK (org_id IS NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS agent_teams_org_read ON public.agent_teams;
CREATE POLICY agent_teams_org_read
  ON public.agent_teams FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS agent_teams_org_write ON public.agent_teams;
CREATE POLICY agent_teams_org_write
  ON public.agent_teams FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

-- agent_team_grants (gated through team RLS via parent team_id)
DROP POLICY IF EXISTS agent_team_grants_personal ON public.agent_team_grants;
CREATE POLICY agent_team_grants_personal
  ON public.agent_team_grants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.agent_teams t
    WHERE t.id = agent_team_grants.team_id
      AND t.org_id IS NULL
      AND t.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agent_teams t
    WHERE t.id = agent_team_grants.team_id
      AND t.org_id IS NULL
      AND t.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS agent_team_grants_org ON public.agent_team_grants;
CREATE POLICY agent_team_grants_org
  ON public.agent_team_grants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.agent_teams t
    WHERE t.id = agent_team_grants.team_id
      AND t.org_id IS NOT NULL
      AND public.is_org_member(t.org_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agent_teams t
    WHERE t.id = agent_team_grants.team_id
      AND t.org_id IS NOT NULL
      AND public.is_org_member(t.org_id)
  ));

-- agent_overrides
DROP POLICY IF EXISTS agent_overrides_personal ON public.agent_overrides;
CREATE POLICY agent_overrides_personal
  ON public.agent_overrides FOR ALL
  USING (org_id IS NULL AND user_id = auth.uid())
  WITH CHECK (org_id IS NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS agent_overrides_org ON public.agent_overrides;
CREATE POLICY agent_overrides_org
  ON public.agent_overrides FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

-- 4) BACKFILL --------------------------------------------------
-- 4a) Insert one "General" (system) team per scope that has agents.

INSERT INTO public.agent_teams (org_id, user_id, name, color, is_system)
SELECT DISTINCT a.org_id, NULL::uuid, 'General', 'muted', TRUE
FROM public.agents_registry a
WHERE a.org_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.agent_teams t
    WHERE t.org_id = a.org_id AND t.user_id IS NULL AND t.is_system AND t.name = 'General'
  );

INSERT INTO public.agent_teams (org_id, user_id, name, color, is_system)
SELECT NULL::uuid, du.user_id, 'General', 'muted', TRUE
FROM (
  SELECT DISTINCT a.user_id
  FROM public.agents_registry a
  WHERE a.org_id IS NULL AND a.user_id IS NOT NULL
) AS du
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_teams t
  WHERE t.user_id = du.user_id AND t.org_id IS NULL AND t.is_system AND t.name = 'General'
);

-- 4b) Seed grants per General team

-- integrations (per scope: org or personal)
INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT t.id, 'integration', ui.integration_id, 'allow'
FROM public.agent_teams t
JOIN public.user_integrations ui
  ON ((t.org_id IS NOT NULL AND ui.org_id = t.org_id)
   OR (t.org_id IS NULL AND t.user_id IS NOT NULL AND ui.user_id = t.user_id AND ui.org_id IS NULL))
WHERE t.is_system AND t.name = 'General' AND ui.agent_enabled = TRUE
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

-- brain_domain (all six, default permissive — matches today)
INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT t.id, 'brain_domain', d, 'allow'
FROM public.agent_teams t
CROSS JOIN UNNEST(ARRAY['strategy','marketing','finance','operations','creative','general']) AS d
WHERE t.is_system AND t.name = 'General'
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

-- brain_access:personal (default permissive — per-agent deny override below for the rest)
INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT t.id, 'brain_access', 'personal', 'allow'
FROM public.agent_teams t
WHERE t.is_system AND t.name = 'General'
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

-- campaign_context:* (default permissive — per-agent deny override below for the rest)
INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT t.id, 'campaign_context', '*', 'allow'
FROM public.agent_teams t
WHERE t.is_system AND t.name = 'General'
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

-- channel:slack/telegram (default permissive)
INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT t.id, 'channel', c, 'allow'
FROM public.agent_teams t
CROSS JOIN UNNEST(ARRAY['slack','telegram']) AS c
WHERE t.is_system AND t.name = 'General'
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

-- 4c) Assign every existing agent to its General team

UPDATE public.agents_registry a
SET team_id = t.id
FROM public.agent_teams t
WHERE t.is_system AND t.name = 'General'
  AND ((a.org_id IS NOT NULL AND t.org_id = a.org_id AND t.user_id IS NULL)
    OR (a.org_id IS NULL AND a.user_id IS NOT NULL AND t.user_id = a.user_id AND t.org_id IS NULL))
  AND a.team_id IS NULL;

-- 4d) Per-agent deny overrides for agents that diverge from team default

-- user_brain_access = false → deny brain_access:personal
INSERT INTO public.agent_overrides (agent_key, org_id, user_id, capability_kind, capability_id, mode)
SELECT a.agent_key, a.org_id, CASE WHEN a.org_id IS NULL THEN a.user_id ELSE NULL END,
       'brain_access', 'personal', 'deny'
FROM public.agents_registry a
WHERE a.user_brain_access = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.agent_overrides o
    WHERE o.agent_key = a.agent_key
      AND o.capability_kind = 'brain_access'
      AND o.capability_id = 'personal'
      AND o.mode = 'deny'
      AND ((a.org_id IS NOT NULL AND o.org_id = a.org_id)
        OR (a.org_id IS NULL AND o.user_id = a.user_id AND o.org_id IS NULL))
  );

-- campaign_context_access = false → deny campaign_context:*
INSERT INTO public.agent_overrides (agent_key, org_id, user_id, capability_kind, capability_id, mode)
SELECT a.agent_key, a.org_id, CASE WHEN a.org_id IS NULL THEN a.user_id ELSE NULL END,
       'campaign_context', '*', 'deny'
FROM public.agents_registry a
WHERE a.campaign_context_access = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.agent_overrides o
    WHERE o.agent_key = a.agent_key
      AND o.capability_kind = 'campaign_context'
      AND o.capability_id = '*'
      AND o.mode = 'deny'
      AND ((a.org_id IS NOT NULL AND o.org_id = a.org_id)
        OR (a.org_id IS NULL AND o.user_id = a.user_id AND o.org_id IS NULL))
  );
