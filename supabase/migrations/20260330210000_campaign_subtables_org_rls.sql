-- ============================================================
-- ORG-AWARE PROFILE VISIBILITY
-- Org co-members can read each other's profiles (name, avatar, email)
-- ============================================================
CREATE POLICY "Org co-members can read profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_members my
      JOIN public.org_members their ON their.org_id = my.org_id
      WHERE my.user_id = auth.uid()
        AND my.status = 'active'
        AND their.user_id = profiles.id
        AND their.status = 'active'
    )
  );

-- ============================================================
-- ORG RLS POLICIES FOR CAMPAIGN SUB-TABLES
-- campaign_agents has org_id directly; all others resolve via campaigns.org_id
-- ============================================================

-- Helper: check org membership through campaign's org_id
CREATE OR REPLACE FUNCTION public.is_org_campaign(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.org_members om ON om.org_id = c.org_id
    WHERE c.id = p_campaign_id
      AND c.org_id IS NOT NULL
      AND om.user_id = auth.uid()
      AND om.status = 'active'
  )
$$;

-- Backfill: set org_id on campaign_agents from parent campaign
UPDATE public.campaign_agents ca
SET org_id = c.org_id
FROM public.campaigns c
WHERE c.id = ca.campaign_id
  AND c.org_id IS NOT NULL
  AND ca.org_id IS NULL;

-- 1. campaign_agents (has org_id directly)
CREATE POLICY "Org members can read org campaign_agents"
  ON public.campaign_agents FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org campaign_agents"
  ON public.campaign_agents FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

-- 2. campaign_nodes
CREATE POLICY "Org members can read org campaign_nodes"
  ON public.campaign_nodes FOR SELECT
  USING (public.is_org_campaign(campaign_id));

CREATE POLICY "Org members can write org campaign_nodes"
  ON public.campaign_nodes FOR ALL
  USING (public.is_org_campaign(campaign_id))
  WITH CHECK (public.is_org_campaign(campaign_id));

-- 3. campaign_node_sources
CREATE POLICY "Org members can read org campaign_node_sources"
  ON public.campaign_node_sources FOR SELECT
  USING (public.is_org_campaign(campaign_id));

CREATE POLICY "Org members can write org campaign_node_sources"
  ON public.campaign_node_sources FOR ALL
  USING (public.is_org_campaign(campaign_id))
  WITH CHECK (public.is_org_campaign(campaign_id));

-- 4. campaign_edges
CREATE POLICY "Org members can read org campaign_edges"
  ON public.campaign_edges FOR SELECT
  USING (public.is_org_campaign(campaign_id));

CREATE POLICY "Org members can write org campaign_edges"
  ON public.campaign_edges FOR ALL
  USING (public.is_org_campaign(campaign_id))
  WITH CHECK (public.is_org_campaign(campaign_id));

-- 5. campaign_plans
CREATE POLICY "Org members can read org campaign_plans"
  ON public.campaign_plans FOR SELECT
  USING (public.is_org_campaign(campaign_id));

CREATE POLICY "Org members can write org campaign_plans"
  ON public.campaign_plans FOR ALL
  USING (public.is_org_campaign(campaign_id))
  WITH CHECK (public.is_org_campaign(campaign_id));

-- 6. campaign_tasks
CREATE POLICY "Org members can read org campaign_tasks"
  ON public.campaign_tasks FOR SELECT
  USING (public.is_org_campaign(campaign_id));

CREATE POLICY "Org members can write org campaign_tasks"
  ON public.campaign_tasks FOR ALL
  USING (public.is_org_campaign(campaign_id))
  WITH CHECK (public.is_org_campaign(campaign_id));

-- 7. campaign_strategy_nodes
CREATE POLICY "Org members can read org campaign_strategy_nodes"
  ON public.campaign_strategy_nodes FOR SELECT
  USING (public.is_org_campaign(campaign_id));

CREATE POLICY "Org members can write org campaign_strategy_nodes"
  ON public.campaign_strategy_nodes FOR ALL
  USING (public.is_org_campaign(campaign_id))
  WITH CHECK (public.is_org_campaign(campaign_id));

-- 8. campaign_workflows
CREATE POLICY "Org members can read org campaign_workflows"
  ON public.campaign_workflows FOR SELECT
  USING (public.is_org_campaign(campaign_id));

CREATE POLICY "Org members can write org campaign_workflows"
  ON public.campaign_workflows FOR ALL
  USING (public.is_org_campaign(campaign_id))
  WITH CHECK (public.is_org_campaign(campaign_id));

-- 9. campaign_workflow_edges
CREATE POLICY "Org members can read org campaign_workflow_edges"
  ON public.campaign_workflow_edges FOR SELECT
  USING (public.is_org_campaign(campaign_id));

CREATE POLICY "Org members can write org campaign_workflow_edges"
  ON public.campaign_workflow_edges FOR ALL
  USING (public.is_org_campaign(campaign_id))
  WITH CHECK (public.is_org_campaign(campaign_id));

-- 10. campaign_workflow_layouts
CREATE POLICY "Org members can read org campaign_workflow_layouts"
  ON public.campaign_workflow_layouts FOR SELECT
  USING (public.is_org_campaign(campaign_id));

CREATE POLICY "Org members can write org campaign_workflow_layouts"
  ON public.campaign_workflow_layouts FOR ALL
  USING (public.is_org_campaign(campaign_id))
  WITH CHECK (public.is_org_campaign(campaign_id));
