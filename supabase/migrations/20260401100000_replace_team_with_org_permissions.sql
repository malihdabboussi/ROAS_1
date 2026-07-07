-- ============================================================
-- FULL MIGRATION: Replace team permission model with org model
-- Drops all team_* RLS policies, functions, and tables.
-- Creates has_org_campaign_access + is_org_brain for enforcement.
-- ============================================================

-- ============================================================
-- 1. CREATE ORG PERMISSION FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_org_campaign_access(
  p_campaign_id UUID,
  p_min_permission TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.org_members om ON om.org_id = c.org_id
    LEFT JOIN public.org_campaign_permissions ocp
      ON ocp.org_member_id = om.id AND ocp.campaign_id = c.id
    WHERE c.id = p_campaign_id
      AND c.org_id IS NOT NULL
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND (
        p_min_permission = 'view'
        OR ocp.permission = 'edit'
        OR om.role IN ('owner', 'admin', 'creator')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_brain(p_brain_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ns_brains b
    JOIN public.org_members om ON om.org_id = b.org_id
    WHERE b.id = p_brain_id
      AND b.org_id IS NOT NULL
      AND om.user_id = auth.uid()
      AND om.status = 'active'
  );
$$;

-- ============================================================
-- 2. DROP ALL TEAM RLS POLICIES
-- ============================================================

-- Campaign core
DROP POLICY IF EXISTS team_campaigns_view ON public.campaigns;
DROP POLICY IF EXISTS team_campaigns_edit ON public.campaigns;
DROP POLICY IF EXISTS team_missions_view ON public.missions;
DROP POLICY IF EXISTS team_missions_edit ON public.missions;
DROP POLICY IF EXISTS team_missions_insert ON public.missions;
DROP POLICY IF EXISTS team_missions_delete ON public.missions;

-- Campaign graph
DROP POLICY IF EXISTS team_campaign_agents_view ON public.campaign_agents;
DROP POLICY IF EXISTS team_campaign_agents_edit ON public.campaign_agents;
DROP POLICY IF EXISTS team_campaign_tasks_all ON public.campaign_tasks;
DROP POLICY IF EXISTS team_campaign_plans_all ON public.campaign_plans;
DROP POLICY IF EXISTS team_campaign_nodes_all ON public.campaign_nodes;
DROP POLICY IF EXISTS team_campaign_node_sources_all ON public.campaign_node_sources;
DROP POLICY IF EXISTS team_campaign_edges_all ON public.campaign_edges;
DROP POLICY IF EXISTS team_campaign_workflows_all ON public.campaign_workflows;
DROP POLICY IF EXISTS team_campaign_workflow_edges_all ON public.campaign_workflow_edges;
DROP POLICY IF EXISTS team_campaign_workflow_layouts_all ON public.campaign_workflow_layouts;
DROP POLICY IF EXISTS team_campaign_strategy_nodes_all ON public.campaign_strategy_nodes;

-- Mission child tables
DROP POLICY IF EXISTS team_missions_logs_all ON public.missions_logs;
DROP POLICY IF EXISTS team_missions_plans_all ON public.missions_plans;
DROP POLICY IF EXISTS team_mission_subtasks_all ON public.mission_subtasks;
DROP POLICY IF EXISTS team_mission_deliverables_all ON public.mission_deliverables;

-- Artifacts
DROP POLICY IF EXISTS team_offers_all ON public.offers;
DROP POLICY IF EXISTS team_avatars_all ON public.avatars;
DROP POLICY IF EXISTS team_funnels_all ON public.funnels;
DROP POLICY IF EXISTS team_funnel_pages_all ON public.funnel_pages;
DROP POLICY IF EXISTS team_lead_magnets_all ON public.lead_magnets;
DROP POLICY IF EXISTS team_sequences_all ON public.sequences;
DROP POLICY IF EXISTS team_sequence_emails_all ON public.sequence_emails;
DROP POLICY IF EXISTS team_ad_campaigns_all ON public.ad_campaigns;
DROP POLICY IF EXISTS team_ad_sets_all ON public.ad_sets;
DROP POLICY IF EXISTS team_ads_all ON public.ads;
DROP POLICY IF EXISTS team_social_posts_all ON public.social_posts;
DROP POLICY IF EXISTS team_blog_posts_all ON public.blog_posts;

-- Agents
DROP POLICY IF EXISTS team_agents_registry_view ON public.agents_registry;
DROP POLICY IF EXISTS team_agents_registry_edit ON public.agents_registry;
DROP POLICY IF EXISTS team_tasks_all ON public.tasks;

-- Brain sharing
DROP POLICY IF EXISTS team_ns_brains_view ON public.ns_brains;
DROP POLICY IF EXISTS team_ns_brains_edit ON public.ns_brains;
DROP POLICY IF EXISTS team_ns_memories_all ON public.ns_memories;
DROP POLICY IF EXISTS team_ns_snapshots_all ON public.ns_snapshots;
DROP POLICY IF EXISTS team_ns_sk_sources_all ON public.ns_sk_sources;
DROP POLICY IF EXISTS team_ns_sk_entries_all ON public.ns_sk_entries;
DROP POLICY IF EXISTS team_ns_sk_gaps_all ON public.ns_sk_gaps;
DROP POLICY IF EXISTS team_ns_sk_evolution_all ON public.ns_sk_evolution;
DROP POLICY IF EXISTS team_ns_sk_curriculum_all ON public.ns_sk_curriculum;
DROP POLICY IF EXISTS team_ns_memory_connections_all ON public.ns_memory_connections;
DROP POLICY IF EXISTS team_ns_memory_sessions_all ON public.ns_memory_sessions;
DROP POLICY IF EXISTS team_ns_memory_versions_all ON public.ns_memory_versions;
DROP POLICY IF EXISTS team_ns_snapshot_edges_all ON public.ns_snapshot_edges;
DROP POLICY IF EXISTS team_ns_emotional_responses_all ON public.ns_emotional_responses;
DROP POLICY IF EXISTS team_ns_pending_captures_all ON public.ns_pending_captures;
DROP POLICY IF EXISTS team_ns_content_hashes_all ON public.ns_content_hashes;

-- ============================================================
-- 3. CREATE ORG CAMPAIGN POLICIES (replaces team campaign policies)
-- ============================================================

-- Campaign core
CREATE POLICY org_campaigns_view
  ON public.campaigns FOR SELECT
  USING (public.has_org_campaign_access(id, 'view'));

CREATE POLICY org_campaigns_edit
  ON public.campaigns FOR UPDATE
  USING (public.has_org_campaign_access(id, 'edit'))
  WITH CHECK (public.has_org_campaign_access(id, 'edit'));

CREATE POLICY org_missions_view
  ON public.missions FOR SELECT
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'));

CREATE POLICY org_missions_edit
  ON public.missions FOR UPDATE
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_missions_insert
  ON public.missions FOR INSERT
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_missions_delete
  ON public.missions FOR DELETE
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

-- Campaign graph
CREATE POLICY org_campaign_agents_view
  ON public.campaign_agents FOR SELECT
  USING (public.has_org_campaign_access(campaign_id, 'view'));

CREATE POLICY org_campaign_agents_edit
  ON public.campaign_agents FOR ALL
  USING (public.has_org_campaign_access(campaign_id, 'edit'))
  WITH CHECK (public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_campaign_tasks_all
  ON public.campaign_tasks FOR ALL
  USING (public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_campaign_plans_all
  ON public.campaign_plans FOR ALL
  USING (public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_campaign_nodes_all
  ON public.campaign_nodes FOR ALL
  USING (public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_campaign_node_sources_all
  ON public.campaign_node_sources FOR ALL
  USING (EXISTS (SELECT 1 FROM public.campaign_nodes cn WHERE cn.id = campaign_node_sources.node_id AND public.has_org_campaign_access(cn.campaign_id, 'view')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_nodes cn WHERE cn.id = campaign_node_sources.node_id AND public.has_org_campaign_access(cn.campaign_id, 'edit')));

CREATE POLICY org_campaign_edges_all
  ON public.campaign_edges FOR ALL
  USING (public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_campaign_workflows_all
  ON public.campaign_workflows FOR ALL
  USING (public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_campaign_workflow_edges_all
  ON public.campaign_workflow_edges FOR ALL
  USING (EXISTS (SELECT 1 FROM public.campaign_workflows cw WHERE cw.id = campaign_workflow_edges.workflow_id AND public.has_org_campaign_access(cw.campaign_id, 'view')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_workflows cw WHERE cw.id = campaign_workflow_edges.workflow_id AND public.has_org_campaign_access(cw.campaign_id, 'edit')));

CREATE POLICY org_campaign_workflow_layouts_all
  ON public.campaign_workflow_layouts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.campaign_workflows cw WHERE cw.id = campaign_workflow_layouts.workflow_id AND public.has_org_campaign_access(cw.campaign_id, 'view')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_workflows cw WHERE cw.id = campaign_workflow_layouts.workflow_id AND public.has_org_campaign_access(cw.campaign_id, 'edit')));

CREATE POLICY org_campaign_strategy_nodes_all
  ON public.campaign_strategy_nodes FOR ALL
  USING (public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (public.has_org_campaign_access(campaign_id, 'edit'));

-- Mission child tables
CREATE POLICY org_missions_logs_all
  ON public.missions_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = missions_logs.mission_id AND m.campaign_id IS NOT NULL AND public.has_org_campaign_access(m.campaign_id, 'view')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = missions_logs.mission_id AND m.campaign_id IS NOT NULL AND public.has_org_campaign_access(m.campaign_id, 'edit')));

CREATE POLICY org_missions_plans_all
  ON public.missions_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = missions_plans.mission_id AND m.campaign_id IS NOT NULL AND public.has_org_campaign_access(m.campaign_id, 'view')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = missions_plans.mission_id AND m.campaign_id IS NOT NULL AND public.has_org_campaign_access(m.campaign_id, 'edit')));

CREATE POLICY org_mission_subtasks_all
  ON public.mission_subtasks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = mission_subtasks.mission_id AND m.campaign_id IS NOT NULL AND public.has_org_campaign_access(m.campaign_id, 'view')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = mission_subtasks.mission_id AND m.campaign_id IS NOT NULL AND public.has_org_campaign_access(m.campaign_id, 'edit')));

CREATE POLICY org_mission_deliverables_all
  ON public.mission_deliverables FOR ALL
  USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = mission_deliverables.mission_id AND m.campaign_id IS NOT NULL AND public.has_org_campaign_access(m.campaign_id, 'view')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = mission_deliverables.mission_id AND m.campaign_id IS NOT NULL AND public.has_org_campaign_access(m.campaign_id, 'edit')));

-- Artifacts
CREATE POLICY org_offers_all ON public.offers FOR ALL
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_avatars_all ON public.avatars FOR ALL
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_funnels_all ON public.funnels FOR ALL
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_funnel_pages_all ON public.funnel_pages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_pages.funnel_id AND f.campaign_id IS NOT NULL AND public.has_org_campaign_access(f.campaign_id, 'view')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_pages.funnel_id AND f.campaign_id IS NOT NULL AND public.has_org_campaign_access(f.campaign_id, 'edit')));

CREATE POLICY org_lead_magnets_all ON public.lead_magnets FOR ALL
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_sequences_all ON public.sequences FOR ALL
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_sequence_emails_all ON public.sequence_emails FOR ALL
  USING (EXISTS (SELECT 1 FROM public.sequences s WHERE s.id = sequence_emails.sequence_id AND s.campaign_id IS NOT NULL AND public.has_org_campaign_access(s.campaign_id, 'view')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sequences s WHERE s.id = sequence_emails.sequence_id AND s.campaign_id IS NOT NULL AND public.has_org_campaign_access(s.campaign_id, 'edit')));

CREATE POLICY org_ad_campaigns_all ON public.ad_campaigns FOR ALL
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_ad_sets_all ON public.ad_sets FOR ALL
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_ads_all ON public.ads FOR ALL
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_social_posts_all ON public.social_posts FOR ALL
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY org_blog_posts_all ON public.blog_posts FOR ALL
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

-- Agents via campaign
CREATE POLICY org_agents_registry_view
  ON public.agents_registry FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.campaign_agents ca WHERE ca.user_id = agents_registry.user_id AND ca.agent_key = agents_registry.agent_key AND public.has_org_campaign_access(ca.campaign_id, 'view')));

CREATE POLICY org_agents_registry_edit
  ON public.agents_registry FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.campaign_agents ca WHERE ca.user_id = agents_registry.user_id AND ca.agent_key = agents_registry.agent_key AND public.has_org_campaign_access(ca.campaign_id, 'edit')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaign_agents ca WHERE ca.user_id = agents_registry.user_id AND ca.agent_key = agents_registry.agent_key AND public.has_org_campaign_access(ca.campaign_id, 'edit')));

CREATE POLICY org_tasks_all ON public.tasks FOR ALL
  USING (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'view'))
  WITH CHECK (campaign_id IS NOT NULL AND public.has_org_campaign_access(campaign_id, 'edit'));

-- ============================================================
-- 4. ORG BRAIN SUBTABLE POLICIES (replaces team brain policies)
-- ns_brains already has is_org_member policies from org foundation.
-- Brain subtables need org access via is_org_brain helper.
-- ============================================================

CREATE POLICY org_ns_memories_all ON public.ns_memories FOR ALL
  USING (public.is_org_brain(brain_id))
  WITH CHECK (public.is_org_brain(brain_id));

CREATE POLICY org_ns_snapshots_all ON public.ns_snapshots FOR ALL
  USING (public.is_org_brain(brain_id))
  WITH CHECK (public.is_org_brain(brain_id));

CREATE POLICY org_ns_sk_sources_all ON public.ns_sk_sources FOR ALL
  USING (public.is_org_brain(brain_id))
  WITH CHECK (public.is_org_brain(brain_id));

CREATE POLICY org_ns_sk_entries_all ON public.ns_sk_entries FOR ALL
  USING (public.is_org_brain(brain_id))
  WITH CHECK (public.is_org_brain(brain_id));

CREATE POLICY org_ns_sk_gaps_all ON public.ns_sk_gaps FOR ALL
  USING (public.is_org_brain(brain_id))
  WITH CHECK (public.is_org_brain(brain_id));

CREATE POLICY org_ns_sk_evolution_all ON public.ns_sk_evolution FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ns_sk_entries e WHERE e.id = ns_sk_evolution.entry_id AND public.is_org_brain(e.brain_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ns_sk_entries e WHERE e.id = ns_sk_evolution.entry_id AND public.is_org_brain(e.brain_id)));

CREATE POLICY org_ns_sk_curriculum_all ON public.ns_sk_curriculum FOR ALL
  USING (public.is_org_brain(brain_id))
  WITH CHECK (public.is_org_brain(brain_id));

CREATE POLICY org_ns_memory_connections_all ON public.ns_memory_connections FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_connections.source_memory_id AND public.is_org_brain(m.brain_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_connections.source_memory_id AND public.is_org_brain(m.brain_id)));

CREATE POLICY org_ns_memory_sessions_all ON public.ns_memory_sessions FOR ALL
  USING (public.is_org_brain(brain_id))
  WITH CHECK (public.is_org_brain(brain_id));

CREATE POLICY org_ns_memory_versions_all ON public.ns_memory_versions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_versions.memory_id AND public.is_org_brain(m.brain_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_versions.memory_id AND public.is_org_brain(m.brain_id)));

CREATE POLICY org_ns_snapshot_edges_all ON public.ns_snapshot_edges FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ns_snapshots s WHERE s.id = ns_snapshot_edges.source_id AND public.is_org_brain(s.brain_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ns_snapshots s WHERE s.id = ns_snapshot_edges.source_id AND public.is_org_brain(s.brain_id)));

CREATE POLICY org_ns_emotional_responses_all ON public.ns_emotional_responses FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_emotional_responses.memory_id AND public.is_org_brain(m.brain_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_emotional_responses.memory_id AND public.is_org_brain(m.brain_id)));

CREATE POLICY org_ns_pending_captures_all ON public.ns_pending_captures FOR ALL
  USING (public.is_org_brain(brain_id))
  WITH CHECK (public.is_org_brain(brain_id));

CREATE POLICY org_ns_content_hashes_all ON public.ns_content_hashes FOR ALL
  USING (public.is_org_brain(brain_id))
  WITH CHECK (public.is_org_brain(brain_id));

-- ============================================================
-- 5. PERSIST agent_definitions ORG UNIQUE INDEX (bug 2 fix)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS agent_definitions_org_unique
  ON public.agent_definitions(org_id, agent_key, file_name)
  WHERE org_id IS NOT NULL;

-- ============================================================
-- 6. DROP TEAM FUNCTIONS
-- ============================================================

DROP FUNCTION IF EXISTS public.has_team_campaign_access(UUID, TEXT);
DROP FUNCTION IF EXISTS public.has_team_brain_access(UUID, TEXT);
DROP FUNCTION IF EXISTS public.has_team_agent_brain_access(UUID, TEXT);
DROP FUNCTION IF EXISTS public.is_team_member_of(UUID);
DROP FUNCTION IF EXISTS public.get_campaign_owner(UUID);

-- ============================================================
-- 7. DROP TEAM RLS POLICIES ON TEAM TABLES THEMSELVES
-- ============================================================

DROP POLICY IF EXISTS "Team invitations owner read" ON public.team_invitations;
DROP POLICY IF EXISTS "Team invitations owner write" ON public.team_invitations;
DROP POLICY IF EXISTS "Team invitations invitee read" ON public.team_invitations;
DROP POLICY IF EXISTS "Team members owner" ON public.team_members;
DROP POLICY IF EXISTS "Team members self read" ON public.team_members;
DROP POLICY IF EXISTS "Team campaign permissions member read" ON public.team_campaign_permissions;
DROP POLICY IF EXISTS "Team campaign permissions owner" ON public.team_campaign_permissions;
DROP POLICY IF EXISTS "team_member_credit_limits_read" ON public.team_member_credit_limits;
DROP POLICY IF EXISTS "team_member_credit_limits_write" ON public.team_member_credit_limits;
DROP POLICY IF EXISTS "team_member_credit_log_read" ON public.team_member_credit_log;
DROP POLICY IF EXISTS "team_member_credit_log_insert" ON public.team_member_credit_log;
DROP POLICY IF EXISTS "Team brain permissions member read" ON public.team_brain_permissions;
DROP POLICY IF EXISTS "Team brain permissions owner" ON public.team_brain_permissions;
DROP POLICY IF EXISTS "org_shared_skills_owner" ON public.org_shared_skills;
DROP POLICY IF EXISTS "org_shared_skills_member_read" ON public.org_shared_skills;

-- ============================================================
-- 8. DROP TEAM TABLES (order: dependents first)
-- ============================================================

DROP TABLE IF EXISTS public.team_member_credit_log CASCADE;
DROP TABLE IF EXISTS public.team_member_credit_limits CASCADE;
DROP TABLE IF EXISTS public.team_brain_permissions CASCADE;
DROP TABLE IF EXISTS public.team_campaign_permissions CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.team_invitations CASCADE;
