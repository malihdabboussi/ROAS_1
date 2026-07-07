-- ============================================================
-- MANAGEMENT SYSTEM TEAM
-- Adds a per-scope `Management` system team that owns the
-- platform's system agents (vibey, hr, atlas, viktor, brain_scholar,
-- widget_builder). Backend already blocks `setAgentTeam` for these
-- keys, so this just gives them their own home so they don't bleed
-- into the user's `General` team.
-- ============================================================

-- 1) Insert one `Management` (system) team per scope that has any system agent.

INSERT INTO public.agent_teams (org_id, user_id, name, color, icon, is_system)
SELECT DISTINCT a.org_id, NULL::uuid, 'Management', 'purple', 'shield-check', TRUE
FROM public.agents_registry a
WHERE a.org_id IS NOT NULL
  AND a.agent_key IN ('vibey','hr','brain_scholar','atlas','viktor','widget_builder')
  AND NOT EXISTS (
    SELECT 1 FROM public.agent_teams t
    WHERE t.org_id = a.org_id AND t.user_id IS NULL AND t.is_system AND t.name = 'Management'
  );

INSERT INTO public.agent_teams (org_id, user_id, name, color, icon, is_system)
SELECT NULL::uuid, du.user_id, 'Management', 'purple', 'shield-check', TRUE
FROM (
  SELECT DISTINCT a.user_id
  FROM public.agents_registry a
  WHERE a.org_id IS NULL AND a.user_id IS NOT NULL
    AND a.agent_key IN ('vibey','hr','brain_scholar','atlas','viktor','widget_builder')
) AS du
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_teams t
  WHERE t.user_id = du.user_id AND t.org_id IS NULL AND t.is_system AND t.name = 'Management'
);

-- 2) Reassign system agents (move them out of `General` into `Management`).

UPDATE public.agents_registry a
SET team_id = t.id
FROM public.agent_teams t
WHERE t.is_system AND t.name = 'Management'
  AND a.agent_key IN ('vibey','hr','brain_scholar','atlas','viktor','widget_builder')
  AND ((a.org_id IS NOT NULL AND t.org_id = a.org_id AND t.user_id IS NULL)
    OR (a.org_id IS NULL AND a.user_id IS NOT NULL AND t.user_id = a.user_id AND t.org_id IS NULL));

-- 3) Seed permissive grants on Management (system agents need full access).

INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT t.id, 'brain_domain', d, 'allow'
FROM public.agent_teams t
CROSS JOIN UNNEST(ARRAY['strategy','marketing','finance','operations','creative','general']) AS d
WHERE t.is_system AND t.name = 'Management'
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT t.id, 'brain_access', 'personal', 'allow'
FROM public.agent_teams t
WHERE t.is_system AND t.name = 'Management'
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT t.id, 'campaign_context', '*', 'allow'
FROM public.agent_teams t
WHERE t.is_system AND t.name = 'Management'
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT t.id, 'channel', c, 'allow'
FROM public.agent_teams t
CROSS JOIN UNNEST(ARRAY['slack','telegram']) AS c
WHERE t.is_system AND t.name = 'Management'
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT t.id, 'integration', ui.integration_id, 'allow'
FROM public.agent_teams t
JOIN public.user_integrations ui
  ON ((t.org_id IS NOT NULL AND ui.org_id = t.org_id)
   OR (t.org_id IS NULL AND t.user_id IS NOT NULL AND ui.user_id = t.user_id AND ui.org_id IS NULL))
WHERE t.is_system AND t.name = 'Management' AND ui.agent_enabled = TRUE
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;
