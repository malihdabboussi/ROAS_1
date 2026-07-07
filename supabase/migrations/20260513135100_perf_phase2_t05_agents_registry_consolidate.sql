-- Phase 2 table 5/10: consolidate agents_registry RLS (7 policies -> 4) + Option C delete tightening.
-- READ: own OR org member OR public/widget OR team-campaign view (unchanged from today).
-- INSERT: own OR org member (unchanged from today).
-- UPDATE: own OR org member OR team-campaign edit (unchanged from today).
-- DELETE (TIGHTENED): only owner for personal/personal-in-org agents; only admin/owner
--   for org-shared agents (user_id NULL). Previously any org member could delete any
--   agent in their org including teammates' personal-in-org agents - that was caused by
--   a misnamed policy combo and is now fixed to match what the original 'Org admins
--   manage org agents' policy clearly intended.

DROP POLICY IF EXISTS "Org admins manage org agents" ON public.agents_registry;
DROP POLICY IF EXISTS "Org members can write org agents" ON public.agents_registry;
DROP POLICY IF EXISTS "agents_registry_own" ON public.agents_registry;
DROP POLICY IF EXISTS "Org members read org agents" ON public.agents_registry;
DROP POLICY IF EXISTS "public_agents_readable" ON public.agents_registry;
DROP POLICY IF EXISTS "team_agents_registry_view" ON public.agents_registry;
DROP POLICY IF EXISTS "team_agents_registry_edit" ON public.agents_registry;

CREATE POLICY "agents_registry_select" ON public.agents_registry
  AS PERMISSIVE FOR SELECT TO public
  USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR public_page_enabled = true
    OR widget_enabled = true
    OR EXISTS (
      SELECT 1 FROM campaign_agents ca
      WHERE ca.user_id = agents_registry.user_id
        AND ca.agent_key = agents_registry.agent_key
        AND has_team_campaign_access(ca.campaign_id, 'view')
    )
  );

CREATE POLICY "agents_registry_insert" ON public.agents_registry
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

CREATE POLICY "agents_registry_update" ON public.agents_registry
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM campaign_agents ca
      WHERE ca.user_id = agents_registry.user_id
        AND ca.agent_key = agents_registry.agent_key
        AND has_team_campaign_access(ca.campaign_id, 'edit')
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM campaign_agents ca
      WHERE ca.user_id = agents_registry.user_id
        AND ca.agent_key = agents_registry.agent_key
        AND has_team_campaign_access(ca.campaign_id, 'edit')
    )
  );

-- Option C tightening: DELETE is owner-only OR (org-shared AND admin/owner of that org)
CREATE POLICY "agents_registry_delete" ON public.agents_registry
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (user_id IS NULL AND org_id IS NOT NULL AND is_org_admin_or_owner(org_id))
  );
