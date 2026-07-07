-- =============================================================================
-- Performance advisors phase 1, Migration B: wrap auth.uid()/role()/jwt() in
-- (SELECT ...) for InitPlan optimization. Identical boolean result, evaluated
-- once per query instead of per row. 273 policies across 126 tables.
-- =============================================================================

-- public.ad_campaigns
DROP POLICY IF EXISTS "Service role full access ad_campaigns" ON public.ad_campaigns;
CREATE POLICY "Service role full access ad_campaigns" ON public.ad_campaigns
  AS PERMISSIVE FOR ALL TO service_role
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.ad_sets
DROP POLICY IF EXISTS "Service role full access ad_sets" ON public.ad_sets;
CREATE POLICY "Service role full access ad_sets" ON public.ad_sets
  AS PERMISSIVE FOR ALL TO service_role
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.ads
DROP POLICY IF EXISTS "Service role full access ads" ON public.ads;
CREATE POLICY "Service role full access ads" ON public.ads
  AS PERMISSIVE FOR ALL TO service_role
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.agent_awareness_points
DROP POLICY IF EXISTS "Owner can read personal agent_awareness_points" ON public.agent_awareness_points;
CREATE POLICY "Owner can read personal agent_awareness_points" ON public.agent_awareness_points
  AS PERMISSIVE FOR SELECT TO public
  USING (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Owner can write personal agent_awareness_points" ON public.agent_awareness_points;
CREATE POLICY "Owner can write personal agent_awareness_points" ON public.agent_awareness_points
  AS PERMISSIVE FOR ALL TO public
  USING (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Users can delete own agent_awareness_points" ON public.agent_awareness_points;
CREATE POLICY "Users can delete own agent_awareness_points" ON public.agent_awareness_points
  AS PERMISSIVE FOR DELETE TO public
  USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can insert own agent_awareness_points" ON public.agent_awareness_points;
CREATE POLICY "Users can insert own agent_awareness_points" ON public.agent_awareness_points
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can select own agent_awareness_points" ON public.agent_awareness_points;
CREATE POLICY "Users can select own agent_awareness_points" ON public.agent_awareness_points
  AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can update own agent_awareness_points" ON public.agent_awareness_points;
CREATE POLICY "Users can update own agent_awareness_points" ON public.agent_awareness_points
  AS PERMISSIVE FOR UPDATE TO public
  USING ((user_id = (SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())));

-- public.agent_awareness_sessions
DROP POLICY IF EXISTS "Owner can read personal agent_awareness_sessions" ON public.agent_awareness_sessions;
CREATE POLICY "Owner can read personal agent_awareness_sessions" ON public.agent_awareness_sessions
  AS PERMISSIVE FOR SELECT TO public
  USING (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Owner can write personal agent_awareness_sessions" ON public.agent_awareness_sessions;
CREATE POLICY "Owner can write personal agent_awareness_sessions" ON public.agent_awareness_sessions
  AS PERMISSIVE FOR ALL TO public
  USING (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Users can delete own agent_awareness_sessions" ON public.agent_awareness_sessions;
CREATE POLICY "Users can delete own agent_awareness_sessions" ON public.agent_awareness_sessions
  AS PERMISSIVE FOR DELETE TO public
  USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can insert own agent_awareness_sessions" ON public.agent_awareness_sessions;
CREATE POLICY "Users can insert own agent_awareness_sessions" ON public.agent_awareness_sessions
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can select own agent_awareness_sessions" ON public.agent_awareness_sessions;
CREATE POLICY "Users can select own agent_awareness_sessions" ON public.agent_awareness_sessions
  AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can update own agent_awareness_sessions" ON public.agent_awareness_sessions;
CREATE POLICY "Users can update own agent_awareness_sessions" ON public.agent_awareness_sessions
  AS PERMISSIVE FOR UPDATE TO public
  USING ((user_id = (SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())));

-- public.agent_checkpoints
DROP POLICY IF EXISTS "agent_checkpoints_personal_read" ON public.agent_checkpoints;
CREATE POLICY "agent_checkpoints_personal_read" ON public.agent_checkpoints
  AS PERMISSIVE FOR SELECT TO public
  USING (((user_id = (SELECT auth.uid())) AND (org_id IS NULL)));

DROP POLICY IF EXISTS "agent_checkpoints_personal_write" ON public.agent_checkpoints;
CREATE POLICY "agent_checkpoints_personal_write" ON public.agent_checkpoints
  AS PERMISSIVE FOR ALL TO public
  USING (((user_id = (SELECT auth.uid())) AND (org_id IS NULL)))
  WITH CHECK (((user_id = (SELECT auth.uid())) AND (org_id IS NULL)));

-- public.agent_delegations
DROP POLICY IF EXISTS "agent_delegations_org_read" ON public.agent_delegations;
CREATE POLICY "agent_delegations_org_read" ON public.agent_delegations
  AS PERMISSIVE FOR SELECT TO public
  USING (((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = agent_delegations.org_id) AND (om.user_id = (SELECT auth.uid())))))));

DROP POLICY IF EXISTS "agent_delegations_own" ON public.agent_delegations;
CREATE POLICY "agent_delegations_own" ON public.agent_delegations
  AS PERMISSIVE FOR ALL TO public
  USING ((user_id = (SELECT auth.uid())));

-- public.agent_employee_templates
DROP POLICY IF EXISTS "agent_employee_templates_read_all" ON public.agent_employee_templates;
CREATE POLICY "agent_employee_templates_read_all" ON public.agent_employee_templates
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) IS NOT NULL));

-- public.agent_overrides
DROP POLICY IF EXISTS "agent_overrides_personal" ON public.agent_overrides;
CREATE POLICY "agent_overrides_personal" ON public.agent_overrides
  AS PERMISSIVE FOR ALL TO public
  USING (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))))
  WITH CHECK (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))));

-- public.agent_signals
DROP POLICY IF EXISTS "Owner can read personal agent_signals" ON public.agent_signals;
CREATE POLICY "Owner can read personal agent_signals" ON public.agent_signals
  AS PERMISSIVE FOR SELECT TO public
  USING (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Owner can write personal agent_signals" ON public.agent_signals;
CREATE POLICY "Owner can write personal agent_signals" ON public.agent_signals
  AS PERMISSIVE FOR ALL TO public
  USING (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Users can delete own agent_signals" ON public.agent_signals;
CREATE POLICY "Users can delete own agent_signals" ON public.agent_signals
  AS PERMISSIVE FOR DELETE TO public
  USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can insert own agent_signals" ON public.agent_signals;
CREATE POLICY "Users can insert own agent_signals" ON public.agent_signals
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can select own agent_signals" ON public.agent_signals;
CREATE POLICY "Users can select own agent_signals" ON public.agent_signals
  AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can update own agent_signals" ON public.agent_signals;
CREATE POLICY "Users can update own agent_signals" ON public.agent_signals
  AS PERMISSIVE FOR UPDATE TO public
  USING ((user_id = (SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())));

-- public.agent_skill_resources
DROP POLICY IF EXISTS "agent_skill_resources_delete_own" ON public.agent_skill_resources;
CREATE POLICY "agent_skill_resources_delete_own" ON public.agent_skill_resources
  AS PERMISSIVE FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "agent_skill_resources_insert_own" ON public.agent_skill_resources;
CREATE POLICY "agent_skill_resources_insert_own" ON public.agent_skill_resources
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "agent_skill_resources_select_own" ON public.agent_skill_resources;
CREATE POLICY "agent_skill_resources_select_own" ON public.agent_skill_resources
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "agent_skill_resources_update_own" ON public.agent_skill_resources;
CREATE POLICY "agent_skill_resources_update_own" ON public.agent_skill_resources
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.agent_team_grants
DROP POLICY IF EXISTS "agent_team_grants_personal" ON public.agent_team_grants;
CREATE POLICY "agent_team_grants_personal" ON public.agent_team_grants
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM agent_teams t
  WHERE ((t.id = agent_team_grants.team_id) AND (t.org_id IS NULL) AND (t.user_id = (SELECT auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM agent_teams t
  WHERE ((t.id = agent_team_grants.team_id) AND (t.org_id IS NULL) AND (t.user_id = (SELECT auth.uid()))))));

-- public.agent_team_members
DROP POLICY IF EXISTS "agent_team_members_personal" ON public.agent_team_members;
CREATE POLICY "agent_team_members_personal" ON public.agent_team_members
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM agent_teams t
  WHERE ((t.id = agent_team_members.team_id) AND (t.org_id IS NULL) AND (t.user_id = (SELECT auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM agent_teams t
  WHERE ((t.id = agent_team_members.team_id) AND (t.org_id IS NULL) AND (t.user_id = (SELECT auth.uid()))))));

-- public.agent_teams
DROP POLICY IF EXISTS "agent_teams_personal" ON public.agent_teams;
CREATE POLICY "agent_teams_personal" ON public.agent_teams
  AS PERMISSIVE FOR ALL TO public
  USING (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))))
  WITH CHECK (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))));

-- public.agent_template_skills
DROP POLICY IF EXISTS "agent_template_skills_read_all" ON public.agent_template_skills;
CREATE POLICY "agent_template_skills_read_all" ON public.agent_template_skills
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) IS NOT NULL));

-- public.agent_templates
DROP POLICY IF EXISTS "agent_templates_read_all" ON public.agent_templates;
CREATE POLICY "agent_templates_read_all" ON public.agent_templates
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) IS NOT NULL));

-- public.agent_workflows
DROP POLICY IF EXISTS "agent_workflows_read_own" ON public.agent_workflows;
CREATE POLICY "agent_workflows_read_own" ON public.agent_workflows
  AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "agent_workflows_write_own" ON public.agent_workflows;
CREATE POLICY "agent_workflows_write_own" ON public.agent_workflows
  AS PERMISSIVE FOR ALL TO public
  USING ((user_id = (SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())));

-- public.ai_usage_events
DROP POLICY IF EXISTS "service_role_full" ON public.ai_usage_events;
CREATE POLICY "service_role_full" ON public.ai_usage_events
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.blog_posts
DROP POLICY IF EXISTS "blog_posts_read_own" ON public.blog_posts;
CREATE POLICY "blog_posts_read_own" ON public.blog_posts
  AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "blog_posts_write_own" ON public.blog_posts;
CREATE POLICY "blog_posts_write_own" ON public.blog_posts
  AS PERMISSIVE FOR ALL TO public
  USING ((user_id = (SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())));

-- public.brain_belief_patterns
DROP POLICY IF EXISTS "brain_bp_service_access" ON public.brain_belief_patterns;
CREATE POLICY "brain_bp_service_access" ON public.brain_belief_patterns
  AS PERMISSIVE FOR ALL TO service_role
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.brain_cross_suggestions
DROP POLICY IF EXISTS "Users can read own cross suggestions" ON public.brain_cross_suggestions;
CREATE POLICY "Users can read own cross suggestions" ON public.brain_cross_suggestions
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own cross suggestions" ON public.brain_cross_suggestions;
CREATE POLICY "Users can update own cross suggestions" ON public.brain_cross_suggestions
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.brain_emotional_responses
DROP POLICY IF EXISTS "brain_er_service_access" ON public.brain_emotional_responses;
CREATE POLICY "brain_er_service_access" ON public.brain_emotional_responses
  AS PERMISSIVE FOR ALL TO service_role
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.brain_import_jobs
DROP POLICY IF EXISTS "Users can read own brain import jobs" ON public.brain_import_jobs;
CREATE POLICY "Users can read own brain import jobs" ON public.brain_import_jobs
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own brain import jobs" ON public.brain_import_jobs;
CREATE POLICY "Users can update own brain import jobs" ON public.brain_import_jobs
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.browser_sessions
DROP POLICY IF EXISTS "Users can manage their own browser sessions" ON public.browser_sessions;
CREATE POLICY "Users can manage their own browser sessions" ON public.browser_sessions
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.campaign_integration_connections
DROP POLICY IF EXISTS "Service role full access campaign_integration_connections" ON public.campaign_integration_connections;
CREATE POLICY "Service role full access campaign_integration_connections" ON public.campaign_integration_connections
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

DROP POLICY IF EXISTS "Users manage own campaign integration connections" ON public.campaign_integration_connections;
CREATE POLICY "Users manage own campaign integration connections" ON public.campaign_integration_connections
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

-- public.campaign_strategy_nodes
DROP POLICY IF EXISTS "Service role full access strategy nodes" ON public.campaign_strategy_nodes;
CREATE POLICY "Service role full access strategy nodes" ON public.campaign_strategy_nodes
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

DROP POLICY IF EXISTS "Users can delete own strategy nodes" ON public.campaign_strategy_nodes;
CREATE POLICY "Users can delete own strategy nodes" ON public.campaign_strategy_nodes
  AS PERMISSIVE FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert own strategy nodes" ON public.campaign_strategy_nodes;
CREATE POLICY "Users can insert own strategy nodes" ON public.campaign_strategy_nodes
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own strategy nodes" ON public.campaign_strategy_nodes;
CREATE POLICY "Users can update own strategy nodes" ON public.campaign_strategy_nodes
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own strategy nodes" ON public.campaign_strategy_nodes;
CREATE POLICY "Users can view own strategy nodes" ON public.campaign_strategy_nodes
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.campaign_user_state
DROP POLICY IF EXISTS "Users delete own campaign state" ON public.campaign_user_state;
CREATE POLICY "Users delete own campaign state" ON public.campaign_user_state
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users insert own campaign state" ON public.campaign_user_state;
CREATE POLICY "Users insert own campaign state" ON public.campaign_user_state
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users select own campaign state" ON public.campaign_user_state;
CREATE POLICY "Users select own campaign state" ON public.campaign_user_state
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users update own campaign state" ON public.campaign_user_state;
CREATE POLICY "Users update own campaign state" ON public.campaign_user_state
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

-- public.channel_members
DROP POLICY IF EXISTS "channel_members_own" ON public.channel_members;
CREATE POLICY "channel_members_own" ON public.channel_members
  AS PERMISSIVE FOR ALL TO public
  USING ((user_id = (SELECT auth.uid())));

-- public.channel_memberships
DROP POLICY IF EXISTS "Service role full access channel_memberships" ON public.channel_memberships;
CREATE POLICY "Service role full access channel_memberships" ON public.channel_memberships
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.channel_messages
DROP POLICY IF EXISTS "Service role full access channel_messages" ON public.channel_messages;
CREATE POLICY "Service role full access channel_messages" ON public.channel_messages
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

DROP POLICY IF EXISTS "Users can insert channel messages" ON public.channel_messages;
CREATE POLICY "Users can insert channel messages" ON public.channel_messages
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((can_access_channel(channel_id) AND (((sender_type = 'user'::text) AND (sender_id = ((SELECT auth.uid()))::text)) OR (sender_type = ANY (ARRAY['agent'::text, 'system'::text])))));

-- public.channels
DROP POLICY IF EXISTS "Channel admins can update channels" ON public.channels;
CREATE POLICY "Channel admins can update channels" ON public.channels
  AS PERMISSIVE FOR UPDATE TO public
  USING (is_channel_admin(id))
  WITH CHECK ((((org_id IS NULL) AND (user_id = (SELECT auth.uid()))) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "Service role full access channels" ON public.channels;
CREATE POLICY "Service role full access channels" ON public.channels
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

DROP POLICY IF EXISTS "Users can create channels in personal/org scope" ON public.channels;
CREATE POLICY "Users can create channels in personal/org scope" ON public.channels
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((user_id = (SELECT auth.uid())) AND ((org_id IS NULL) OR is_org_member(org_id))));

-- public.contact_activity
DROP POLICY IF EXISTS "Users can insert contact activity in their org or personal" ON public.contact_activity;
CREATE POLICY "Users can insert contact activity in their org or personal" ON public.contact_activity
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((((SELECT auth.uid()) = user_id) AND (((org_id IS NOT NULL) AND (org_id IN ( SELECT om.org_id
   FROM org_members om
  WHERE (om.user_id = (SELECT auth.uid()))))) OR (org_id IS NULL))));

DROP POLICY IF EXISTS "Users can read contact activity in their org or personal" ON public.contact_activity;
CREATE POLICY "Users can read contact activity in their org or personal" ON public.contact_activity
  AS PERMISSIVE FOR SELECT TO public
  USING ((((org_id IS NOT NULL) AND (org_id IN ( SELECT om.org_id
   FROM org_members om
  WHERE (om.user_id = (SELECT auth.uid()))))) OR ((org_id IS NULL) AND (user_id = (SELECT auth.uid())))));

-- public.contact_identifiers
DROP POLICY IF EXISTS "contact_identifiers_own" ON public.contact_identifiers;
CREATE POLICY "contact_identifiers_own" ON public.contact_identifiers
  AS PERMISSIVE FOR ALL TO public
  USING ((contact_id IN ( SELECT c.id
   FROM contacts c
  WHERE ((c.user_id = (SELECT auth.uid())) OR ((c.org_id IS NOT NULL) AND is_org_member(c.org_id))))))
  WITH CHECK ((contact_id IN ( SELECT c.id
   FROM contacts c
  WHERE ((c.user_id = (SELECT auth.uid())) OR ((c.org_id IS NOT NULL) AND is_org_member(c.org_id))))));

-- public.contact_notes
DROP POLICY IF EXISTS "Users can insert notes in their org or personal" ON public.contact_notes;
CREATE POLICY "Users can insert notes in their org or personal" ON public.contact_notes
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((((SELECT auth.uid()) = user_id) AND (((org_id IS NOT NULL) AND (org_id IN ( SELECT om.org_id
   FROM org_members om
  WHERE (om.user_id = (SELECT auth.uid()))))) OR (org_id IS NULL))));

DROP POLICY IF EXISTS "Users can read notes in their org or personal" ON public.contact_notes;
CREATE POLICY "Users can read notes in their org or personal" ON public.contact_notes
  AS PERMISSIVE FOR SELECT TO public
  USING ((((org_id IS NOT NULL) AND (org_id IN ( SELECT om.org_id
   FROM org_members om
  WHERE (om.user_id = (SELECT auth.uid()))))) OR ((org_id IS NULL) AND (user_id = (SELECT auth.uid())))));

DROP POLICY IF EXISTS "Users can update notes they authored or as org admin" ON public.contact_notes;
CREATE POLICY "Users can update notes they authored or as org admin" ON public.contact_notes
  AS PERMISSIVE FOR UPDATE TO public
  USING (((user_id = (SELECT auth.uid())) OR ((org_id IS NOT NULL) AND (org_id IN ( SELECT om.org_id
   FROM org_members om
  WHERE ((om.user_id = (SELECT auth.uid())) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text)))))))
  WITH CHECK (((user_id = (SELECT auth.uid())) OR ((org_id IS NOT NULL) AND (org_id IN ( SELECT om.org_id
   FROM org_members om
  WHERE ((om.user_id = (SELECT auth.uid())) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.status = 'active'::text)))))));

-- public.conversation_documents
DROP POLICY IF EXISTS "ConvDoc read by share" ON public.conversation_documents;
CREATE POLICY "ConvDoc read by share" ON public.conversation_documents
  AS PERMISSIVE FOR SELECT TO public
  USING ((conversation_id IN ( SELECT c.id
   FROM conversations c
  WHERE (conversation_effective_level(c.id, (SELECT auth.uid())) IS NOT NULL))));

DROP POLICY IF EXISTS "ConvDoc write by edit" ON public.conversation_documents;
CREATE POLICY "ConvDoc write by edit" ON public.conversation_documents
  AS PERMISSIVE FOR ALL TO public
  USING ((conversation_id IN ( SELECT c.id
   FROM conversations c
  WHERE (conversation_effective_level(c.id, (SELECT auth.uid())) = ANY (ARRAY['edit'::text, 'admin'::text])))))
  WITH CHECK ((conversation_id IN ( SELECT c.id
   FROM conversations c
  WHERE (conversation_effective_level(c.id, (SELECT auth.uid())) = ANY (ARRAY['edit'::text, 'admin'::text])))));

-- public.conversation_shares
DROP POLICY IF EXISTS "ConvShares manage by admin" ON public.conversation_shares;
CREATE POLICY "ConvShares manage by admin" ON public.conversation_shares
  AS PERMISSIVE FOR ALL TO public
  USING ((conversation_effective_level(conversation_id, (SELECT auth.uid())) = 'admin'::text))
  WITH CHECK ((conversation_effective_level(conversation_id, (SELECT auth.uid())) = 'admin'::text));

DROP POLICY IF EXISTS "ConvShares read own grants" ON public.conversation_shares;
CREATE POLICY "ConvShares read own grants" ON public.conversation_shares
  AS PERMISSIVE FOR SELECT TO public
  USING ((((entity_type = 'user'::text) AND (entity_id = (SELECT auth.uid()))) OR ((entity_type = 'org'::text) AND is_org_member(entity_id))));

-- public.conversations
DROP POLICY IF EXISTS "Conv delete by admin" ON public.conversations;
CREATE POLICY "Conv delete by admin" ON public.conversations
  AS PERMISSIVE FOR DELETE TO public
  USING ((conversation_effective_level(id, (SELECT auth.uid())) = 'admin'::text));

DROP POLICY IF EXISTS "Conv read by share" ON public.conversations;
CREATE POLICY "Conv read by share" ON public.conversations
  AS PERMISSIVE FOR SELECT TO public
  USING ((conversation_effective_level(id, (SELECT auth.uid())) IS NOT NULL));

DROP POLICY IF EXISTS "Conv update by edit" ON public.conversations;
CREATE POLICY "Conv update by edit" ON public.conversations
  AS PERMISSIVE FOR UPDATE TO public
  USING ((conversation_effective_level(id, (SELECT auth.uid())) = ANY (ARRAY['edit'::text, 'admin'::text])))
  WITH CHECK ((conversation_effective_level(id, (SELECT auth.uid())) = ANY (ARRAY['edit'::text, 'admin'::text])));

-- public.credit_packs
DROP POLICY IF EXISTS "service_role_full" ON public.credit_packs;
CREATE POLICY "service_role_full" ON public.credit_packs
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.credit_purchases
DROP POLICY IF EXISTS "service_role_full" ON public.credit_purchases;
CREATE POLICY "service_role_full" ON public.credit_purchases
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.crm_sync_jobs
DROP POLICY IF EXISTS "Users can insert own crm sync jobs" ON public.crm_sync_jobs;
CREATE POLICY "Users can insert own crm sync jobs" ON public.crm_sync_jobs
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read own crm sync jobs" ON public.crm_sync_jobs;
CREATE POLICY "Users can read own crm sync jobs" ON public.crm_sync_jobs
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.customer_avatars
DROP POLICY IF EXISTS "customer_avatars_own" ON public.customer_avatars;
CREATE POLICY "customer_avatars_own" ON public.customer_avatars
  AS PERMISSIVE FOR ALL TO public
  USING ((brain_id IN ( SELECT b.id
   FROM ns_brains b
  WHERE ((b.owner_id = (SELECT auth.uid())) OR ((b.org_id IS NOT NULL) AND is_org_member(b.org_id))))))
  WITH CHECK ((brain_id IN ( SELECT b.id
   FROM ns_brains b
  WHERE ((b.owner_id = (SELECT auth.uid())) OR ((b.org_id IS NOT NULL) AND is_org_member(b.org_id))))));

-- public.direct_invite_codes
DROP POLICY IF EXISTS "service_role_full" ON public.direct_invite_codes;
CREATE POLICY "service_role_full" ON public.direct_invite_codes
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.domains
DROP POLICY IF EXISTS "service_role_full_access" ON public.domains;
CREATE POLICY "service_role_full_access" ON public.domains
  AS PERMISSIVE FOR ALL TO service_role
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.domains_cache
DROP POLICY IF EXISTS "service_role_full_access" ON public.domains_cache;
CREATE POLICY "service_role_full_access" ON public.domains_cache
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.email_pending_sends
DROP POLICY IF EXISTS "users_own_pending_sends" ON public.email_pending_sends;
CREATE POLICY "users_own_pending_sends" ON public.email_pending_sends
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

-- public.emails
DROP POLICY IF EXISTS "owner_emails_all" ON public.emails;
CREATE POLICY "owner_emails_all" ON public.emails
  AS PERMISSIVE FOR ALL TO public
  USING ((user_id = (SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())));

-- public.enterprise_applications
DROP POLICY IF EXISTS "service_role_full" ON public.enterprise_applications;
CREATE POLICY "service_role_full" ON public.enterprise_applications
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.evaluation_drift
DROP POLICY IF EXISTS "Users can insert own evaluation drift" ON public.evaluation_drift;
CREATE POLICY "Users can insert own evaluation drift" ON public.evaluation_drift
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own evaluation drift" ON public.evaluation_drift;
CREATE POLICY "Users can update own evaluation drift" ON public.evaluation_drift
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view own evaluation drift" ON public.evaluation_drift;
CREATE POLICY "Users can view own evaluation drift" ON public.evaluation_drift
  AS PERMISSIVE FOR SELECT TO public
  USING ((((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = evaluation_drift.org_id) AND (om.user_id = (SELECT auth.uid()))))))));

-- public.fast_track_purchases
DROP POLICY IF EXISTS "service_role_full" ON public.fast_track_purchases;
CREATE POLICY "service_role_full" ON public.fast_track_purchases
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.form_responses
DROP POLICY IF EXISTS "owner_form_responses_select" ON public.form_responses;
CREATE POLICY "owner_form_responses_select" ON public.form_responses
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM forms f
  WHERE ((f.id = form_responses.form_id) AND (f.user_id = (SELECT auth.uid()))))));

-- public.forms
DROP POLICY IF EXISTS "owner_forms_all" ON public.forms;
CREATE POLICY "owner_forms_all" ON public.forms
  AS PERMISSIVE FOR ALL TO public
  USING ((user_id = (SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())));

-- public.human_dm_conversations
DROP POLICY IF EXISTS "human_dm_conv_insert" ON public.human_dm_conversations;
CREATE POLICY "human_dm_conv_insert" ON public.human_dm_conversations
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((((SELECT auth.uid()) = user_low) OR ((SELECT auth.uid()) = user_high)) AND is_org_member(org_id)));

DROP POLICY IF EXISTS "human_dm_conv_select" ON public.human_dm_conversations;
CREATE POLICY "human_dm_conv_select" ON public.human_dm_conversations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (((((SELECT auth.uid()) = user_low) OR ((SELECT auth.uid()) = user_high)) AND is_org_member(org_id)));

DROP POLICY IF EXISTS "human_dm_conv_update" ON public.human_dm_conversations;
CREATE POLICY "human_dm_conv_update" ON public.human_dm_conversations
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((((SELECT auth.uid()) = user_low) OR ((SELECT auth.uid()) = user_high)) AND is_org_member(org_id)))
  WITH CHECK (((((SELECT auth.uid()) = user_low) OR ((SELECT auth.uid()) = user_high)) AND is_org_member(org_id)));

-- public.human_dm_messages
DROP POLICY IF EXISTS "human_dm_msg_delete" ON public.human_dm_messages;
CREATE POLICY "human_dm_msg_delete" ON public.human_dm_messages
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ((sender_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "human_dm_msg_insert" ON public.human_dm_messages;
CREATE POLICY "human_dm_msg_insert" ON public.human_dm_messages
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((sender_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1
   FROM human_dm_conversations c
  WHERE ((c.id = human_dm_messages.conversation_id) AND (((SELECT auth.uid()) = c.user_low) OR ((SELECT auth.uid()) = c.user_high)))))));

DROP POLICY IF EXISTS "human_dm_msg_select" ON public.human_dm_messages;
CREATE POLICY "human_dm_msg_select" ON public.human_dm_messages
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM human_dm_conversations c
  WHERE ((c.id = human_dm_messages.conversation_id) AND (((SELECT auth.uid()) = c.user_low) OR ((SELECT auth.uid()) = c.user_high))))));

DROP POLICY IF EXISTS "human_dm_msg_update" ON public.human_dm_messages;
CREATE POLICY "human_dm_msg_update" ON public.human_dm_messages
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((sender_id = (SELECT auth.uid())))
  WITH CHECK ((sender_id = (SELECT auth.uid())));

-- public.human_dm_reads
DROP POLICY IF EXISTS "human_dm_reads_select" ON public.human_dm_reads;
CREATE POLICY "human_dm_reads_select" ON public.human_dm_reads
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1
   FROM human_dm_conversations c
  WHERE ((c.id = human_dm_reads.conversation_id) AND (((SELECT auth.uid()) = c.user_low) OR ((SELECT auth.uid()) = c.user_high)))))));

DROP POLICY IF EXISTS "human_dm_reads_update" ON public.human_dm_reads;
CREATE POLICY "human_dm_reads_update" ON public.human_dm_reads
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = (SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "human_dm_reads_upsert" ON public.human_dm_reads;
CREATE POLICY "human_dm_reads_upsert" ON public.human_dm_reads
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1
   FROM human_dm_conversations c
  WHERE ((c.id = human_dm_reads.conversation_id) AND (((SELECT auth.uid()) = c.user_low) OR ((SELECT auth.uid()) = c.user_high)))))));

-- public.machine_pool
DROP POLICY IF EXISTS "service_role_full" ON public.machine_pool;
CREATE POLICY "service_role_full" ON public.machine_pool
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.machine_status_snapshots
DROP POLICY IF EXISTS "Service role full access on machine_status_snapshots" ON public.machine_status_snapshots;
CREATE POLICY "Service role full access on machine_status_snapshots" ON public.machine_status_snapshots
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.media_assets
DROP POLICY IF EXISTS "Service role full access media" ON public.media_assets;
CREATE POLICY "Service role full access media" ON public.media_assets
  AS PERMISSIVE FOR ALL TO service_role
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.media_generation_jobs
DROP POLICY IF EXISTS "Service role full access media generation jobs" ON public.media_generation_jobs;
CREATE POLICY "Service role full access media generation jobs" ON public.media_generation_jobs
  AS PERMISSIVE FOR ALL TO service_role
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.messages
DROP POLICY IF EXISTS "Msg insert by edit" ON public.messages;
CREATE POLICY "Msg insert by edit" ON public.messages
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((conversation_id IN ( SELECT c.id
   FROM conversations c
  WHERE (conversation_effective_level(c.id, (SELECT auth.uid())) = ANY (ARRAY['edit'::text, 'admin'::text])))));

DROP POLICY IF EXISTS "Msg read by share" ON public.messages;
CREATE POLICY "Msg read by share" ON public.messages
  AS PERMISSIVE FOR SELECT TO public
  USING ((conversation_id IN ( SELECT c.id
   FROM conversations c
  WHERE (conversation_effective_level(c.id, (SELECT auth.uid())) IS NOT NULL))));

-- public.mission_outbox
DROP POLICY IF EXISTS "Service role can manage mission outbox rows" ON public.mission_outbox;
CREATE POLICY "Service role can manage mission outbox rows" ON public.mission_outbox
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.mission_subtasks
DROP POLICY IF EXISTS "Assigned human can read own subtask" ON public.mission_subtasks;
CREATE POLICY "Assigned human can read own subtask" ON public.mission_subtasks
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (((assignee_type = 'human'::text) AND (assigned_user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Assigned human can update own subtask" ON public.mission_subtasks;
CREATE POLICY "Assigned human can update own subtask" ON public.mission_subtasks
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((assignee_type = 'human'::text) AND (assigned_user_id = (SELECT auth.uid()))))
  WITH CHECK (((assignee_type = 'human'::text) AND (assigned_user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "mission_subtasks_user_scoped" ON public.mission_subtasks;
CREATE POLICY "mission_subtasks_user_scoped" ON public.mission_subtasks
  AS PERMISSIVE FOR ALL TO public
  USING ((user_id = (SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())));

-- public.monthly_credit_usage
DROP POLICY IF EXISTS "service_role_full" ON public.monthly_credit_usage;
CREATE POLICY "service_role_full" ON public.monthly_credit_usage
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.ns_brain_log
DROP POLICY IF EXISTS "ns_bl_own" ON public.ns_brain_log;
CREATE POLICY "ns_bl_own" ON public.ns_brain_log
  AS PERMISSIVE FOR ALL TO public
  USING ((brain_id IN ( SELECT ns_brains.id
   FROM ns_brains
  WHERE (ns_brains.owner_id = (SELECT auth.uid())))));

-- public.ns_narrative_links
DROP POLICY IF EXISTS "ns_nl_own" ON public.ns_narrative_links;
CREATE POLICY "ns_nl_own" ON public.ns_narrative_links
  AS PERMISSIVE FOR ALL TO public
  USING ((from_page_id IN ( SELECT np.id
   FROM (ns_narrative_pages np
     JOIN ns_brains b ON ((b.id = np.brain_id)))
  WHERE (b.owner_id = (SELECT auth.uid())))));

-- public.ns_narrative_pages
DROP POLICY IF EXISTS "ns_np_own" ON public.ns_narrative_pages;
CREATE POLICY "ns_np_own" ON public.ns_narrative_pages
  AS PERMISSIVE FOR ALL TO public
  USING ((brain_id IN ( SELECT ns_brains.id
   FROM ns_brains
  WHERE (ns_brains.owner_id = (SELECT auth.uid())))));

-- public.org_addons
DROP POLICY IF EXISTS "Org owner can manage addons" ON public.org_addons;
CREATE POLICY "Org owner can manage addons" ON public.org_addons
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = org_addons.org_id) AND (om.user_id = (SELECT auth.uid())) AND (om.status = 'active'::text) AND (om.role = 'owner'::text)))));

DROP POLICY IF EXISTS "Service role full access org_addons" ON public.org_addons;
CREATE POLICY "Service role full access org_addons" ON public.org_addons
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.org_brain_sharing
DROP POLICY IF EXISTS "Brain owner can manage sharing" ON public.org_brain_sharing;
CREATE POLICY "Brain owner can manage sharing" ON public.org_brain_sharing
  AS PERMISSIVE FOR ALL TO public
  USING ((shared_by = (SELECT auth.uid())))
  WITH CHECK ((shared_by = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Org members can read shared brains" ON public.org_brain_sharing;
CREATE POLICY "Org members can read shared brains" ON public.org_brain_sharing
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = org_brain_sharing.org_id) AND (om.user_id = (SELECT auth.uid())) AND (om.status = 'active'::text)))));

DROP POLICY IF EXISTS "Service role full access org_brain_sharing" ON public.org_brain_sharing;
CREATE POLICY "Service role full access org_brain_sharing" ON public.org_brain_sharing
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.org_campaign_permissions
DROP POLICY IF EXISTS "Members can read own campaign permissions" ON public.org_campaign_permissions;
CREATE POLICY "Members can read own campaign permissions" ON public.org_campaign_permissions
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.id = org_campaign_permissions.org_member_id) AND (om.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "Org admins can manage campaign permissions" ON public.org_campaign_permissions;
CREATE POLICY "Org admins can manage campaign permissions" ON public.org_campaign_permissions
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = ( SELECT om2.org_id
           FROM org_members om2
          WHERE (om2.id = org_campaign_permissions.org_member_id))) AND (om.user_id = (SELECT auth.uid())) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

DROP POLICY IF EXISTS "Service role full access org_campaign_permissions" ON public.org_campaign_permissions;
CREATE POLICY "Service role full access org_campaign_permissions" ON public.org_campaign_permissions
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.org_credit_auto_recharge
DROP POLICY IF EXISTS "Org owner can manage auto recharge" ON public.org_credit_auto_recharge;
CREATE POLICY "Org owner can manage auto recharge" ON public.org_credit_auto_recharge
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = org_credit_auto_recharge.org_id) AND (om.user_id = (SELECT auth.uid())) AND (om.status = 'active'::text) AND (om.role = 'owner'::text)))));

DROP POLICY IF EXISTS "Service role full access org_credit_auto_recharge" ON public.org_credit_auto_recharge;
CREATE POLICY "Service role full access org_credit_auto_recharge" ON public.org_credit_auto_recharge
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.org_credit_purchases
DROP POLICY IF EXISTS "Org owner can manage purchases" ON public.org_credit_purchases;
CREATE POLICY "Org owner can manage purchases" ON public.org_credit_purchases
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = org_credit_purchases.org_id) AND (om.user_id = (SELECT auth.uid())) AND (om.status = 'active'::text) AND (om.role = 'owner'::text)))));

DROP POLICY IF EXISTS "Service role full access org_credit_purchases" ON public.org_credit_purchases;
CREATE POLICY "Service role full access org_credit_purchases" ON public.org_credit_purchases
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.org_invitations
DROP POLICY IF EXISTS "Invitee can read pending invite" ON public.org_invitations;
CREATE POLICY "Invitee can read pending invite" ON public.org_invitations
  AS PERMISSIVE FOR SELECT TO public
  USING (((status = 'pending'::text) AND (lower(email) = lower(COALESCE(((SELECT auth.jwt()) ->> 'email'::text), ''::text)))));

DROP POLICY IF EXISTS "Org admins can manage invitations" ON public.org_invitations;
CREATE POLICY "Org admins can manage invitations" ON public.org_invitations
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = org_invitations.org_id) AND (om.user_id = (SELECT auth.uid())) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

DROP POLICY IF EXISTS "Service role full access org_invitations" ON public.org_invitations;
CREATE POLICY "Service role full access org_invitations" ON public.org_invitations
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.org_member_credit_limits
DROP POLICY IF EXISTS "Members can read own limits" ON public.org_member_credit_limits;
CREATE POLICY "Members can read own limits" ON public.org_member_credit_limits
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.id = org_member_credit_limits.member_id) AND (om.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "Org admins can manage limits" ON public.org_member_credit_limits;
CREATE POLICY "Org admins can manage limits" ON public.org_member_credit_limits
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = org_member_credit_limits.org_id) AND (om.user_id = (SELECT auth.uid())) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

DROP POLICY IF EXISTS "Service role full access org_member_credit_limits" ON public.org_member_credit_limits;
CREATE POLICY "Service role full access org_member_credit_limits" ON public.org_member_credit_limits
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.org_members
DROP POLICY IF EXISTS "Members can read own membership" ON public.org_members;
CREATE POLICY "Members can read own membership" ON public.org_members
  AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Org owner can add members" ON public.org_members;
CREATE POLICY "Org owner can add members" ON public.org_members
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = org_members.org_id) AND (organizations.owner_id = (SELECT auth.uid())) AND (organizations.status = 'active'::text)))));

DROP POLICY IF EXISTS "Org owner can delete members" ON public.org_members;
CREATE POLICY "Org owner can delete members" ON public.org_members
  AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = org_members.org_id) AND (organizations.owner_id = (SELECT auth.uid())) AND (organizations.status = 'active'::text)))));

DROP POLICY IF EXISTS "Org owner can update members" ON public.org_members;
CREATE POLICY "Org owner can update members" ON public.org_members
  AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = org_members.org_id) AND (organizations.owner_id = (SELECT auth.uid())) AND (organizations.status = 'active'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = org_members.org_id) AND (organizations.owner_id = (SELECT auth.uid())) AND (organizations.status = 'active'::text)))));

DROP POLICY IF EXISTS "Service role full access org_members" ON public.org_members;
CREATE POLICY "Service role full access org_members" ON public.org_members
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.org_monthly_credit_usage
DROP POLICY IF EXISTS "Org admins can read usage" ON public.org_monthly_credit_usage;
CREATE POLICY "Org admins can read usage" ON public.org_monthly_credit_usage
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = org_monthly_credit_usage.org_id) AND (om.user_id = (SELECT auth.uid())) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

DROP POLICY IF EXISTS "Service role full access org_monthly_credit_usage" ON public.org_monthly_credit_usage;
CREATE POLICY "Service role full access org_monthly_credit_usage" ON public.org_monthly_credit_usage
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.org_shared_skills
DROP POLICY IF EXISTS "org_shared_skills_owner_all" ON public.org_shared_skills;
CREATE POLICY "org_shared_skills_owner_all" ON public.org_shared_skills
  AS PERMISSIVE FOR ALL TO public
  USING ((owner_id = (SELECT auth.uid())))
  WITH CHECK ((owner_id = (SELECT auth.uid())));

-- public.org_subscriptions
DROP POLICY IF EXISTS "Org members can read subscription" ON public.org_subscriptions;
CREATE POLICY "Org members can read subscription" ON public.org_subscriptions
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = org_subscriptions.org_id) AND (om.user_id = (SELECT auth.uid())) AND (om.status = 'active'::text)))));

DROP POLICY IF EXISTS "Org owner can manage subscription" ON public.org_subscriptions;
CREATE POLICY "Org owner can manage subscription" ON public.org_subscriptions
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM org_members om
  WHERE ((om.org_id = org_subscriptions.org_id) AND (om.user_id = (SELECT auth.uid())) AND (om.status = 'active'::text) AND (om.role = 'owner'::text)))));

DROP POLICY IF EXISTS "Service role full access org_subscriptions" ON public.org_subscriptions;
CREATE POLICY "Service role full access org_subscriptions" ON public.org_subscriptions
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.organizations
DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
CREATE POLICY "Authenticated users can create orgs" ON public.organizations
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = owner_id));

DROP POLICY IF EXISTS "Org members can read org" ON public.organizations;
CREATE POLICY "Org members can read org" ON public.organizations
  AS PERMISSIVE FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM org_members
  WHERE ((org_members.org_id = organizations.id) AND (org_members.user_id = (SELECT auth.uid())) AND (org_members.status = 'active'::text)))) OR (owner_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Owner can update org" ON public.organizations;
CREATE POLICY "Owner can update org" ON public.organizations
  AS PERMISSIVE FOR UPDATE TO public
  USING ((owner_id = (SELECT auth.uid())))
  WITH CHECK ((owner_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Service role full access organizations" ON public.organizations;
CREATE POLICY "Service role full access organizations" ON public.organizations
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

-- public.platform_email_config
DROP POLICY IF EXISTS "service_role_full" ON public.platform_email_config;
CREATE POLICY "service_role_full" ON public.platform_email_config
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.profiles
DROP POLICY IF EXISTS "Org co-members can read profiles" ON public.profiles;
CREATE POLICY "Org co-members can read profiles" ON public.profiles
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (org_members my
     JOIN org_members their ON ((their.org_id = my.org_id)))
  WHERE ((my.user_id = (SELECT auth.uid())) AND (my.status = 'active'::text) AND (their.user_id = profiles.id) AND (their.status = 'active'::text)))));

DROP POLICY IF EXISTS "Org owners and admins can update member profiles" ON public.profiles;
CREATE POLICY "Org owners and admins can update member profiles" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (org_members admin_member
     JOIN org_members target_member ON ((target_member.org_id = admin_member.org_id)))
  WHERE ((admin_member.user_id = (SELECT auth.uid())) AND (admin_member.status = 'active'::text) AND (admin_member.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (target_member.user_id = profiles.id) AND (target_member.status = 'active'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (org_members admin_member
     JOIN org_members target_member ON ((target_member.org_id = admin_member.org_id)))
  WHERE ((admin_member.user_id = (SELECT auth.uid())) AND (admin_member.status = 'active'::text) AND (admin_member.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (target_member.user_id = profiles.id) AND (target_member.status = 'active'::text)))));

-- public.project_mcp_servers
DROP POLICY IF EXISTS "Project members can manage MCP servers" ON public.project_mcp_servers;
CREATE POLICY "Project members can manage MCP servers" ON public.project_mcp_servers
  AS PERMISSIVE FOR ALL TO public
  USING ((project_id IN ( SELECT p.id
   FROM project_repos p
  WHERE (((p.user_id = (SELECT auth.uid())) AND (p.org_id IS NULL)) OR ((p.org_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM org_members om
          WHERE ((om.org_id = p.org_id) AND (om.user_id = (SELECT auth.uid())) AND (om.status = 'active'::text)))))))));

-- public.project_repos
DROP POLICY IF EXISTS "project_repos_delete_own" ON public.project_repos;
CREATE POLICY "project_repos_delete_own" ON public.project_repos
  AS PERMISSIVE FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "project_repos_insert_own" ON public.project_repos;
CREATE POLICY "project_repos_insert_own" ON public.project_repos
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "project_repos_select_own" ON public.project_repos;
CREATE POLICY "project_repos_select_own" ON public.project_repos
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "project_repos_update_own" ON public.project_repos;
CREATE POLICY "project_repos_update_own" ON public.project_repos
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.promo_codes
DROP POLICY IF EXISTS "service_role_full" ON public.promo_codes;
CREATE POLICY "service_role_full" ON public.promo_codes
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.promo_redemptions
DROP POLICY IF EXISTS "service_role_full" ON public.promo_redemptions;
CREATE POLICY "service_role_full" ON public.promo_redemptions
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.skill_library
DROP POLICY IF EXISTS "skill_library_read_all" ON public.skill_library;
CREATE POLICY "skill_library_read_all" ON public.skill_library
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) IS NOT NULL));

-- public.skill_library_resources
DROP POLICY IF EXISTS "skill_library_resources_read_all" ON public.skill_library_resources;
CREATE POLICY "skill_library_resources_read_all" ON public.skill_library_resources
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) IS NOT NULL));

-- public.slack_brain_mappings
DROP POLICY IF EXISTS "slack_brain_mappings_delete" ON public.slack_brain_mappings;
CREATE POLICY "slack_brain_mappings_delete" ON public.slack_brain_mappings
  AS PERMISSIVE FOR DELETE TO public
  USING (((user_id = (SELECT auth.uid())) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "slack_brain_mappings_insert" ON public.slack_brain_mappings;
CREATE POLICY "slack_brain_mappings_insert" ON public.slack_brain_mappings
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((user_id = (SELECT auth.uid())) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "slack_brain_mappings_read" ON public.slack_brain_mappings;
CREATE POLICY "slack_brain_mappings_read" ON public.slack_brain_mappings
  AS PERMISSIVE FOR SELECT TO public
  USING (((user_id = (SELECT auth.uid())) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "slack_brain_mappings_update" ON public.slack_brain_mappings;
CREATE POLICY "slack_brain_mappings_update" ON public.slack_brain_mappings
  AS PERMISSIVE FOR UPDATE TO public
  USING (((user_id = (SELECT auth.uid())) OR ((org_id IS NOT NULL) AND is_org_member(org_id))))
  WITH CHECK (((user_id = (SELECT auth.uid())) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

-- public.social_post_insights
DROP POLICY IF EXISTS "Service role full access social_post_insights" ON public.social_post_insights;
CREATE POLICY "Service role full access social_post_insights" ON public.social_post_insights
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.social_post_schedules
DROP POLICY IF EXISTS "Users can manage own social post schedules" ON public.social_post_schedules;
CREATE POLICY "Users can manage own social post schedules" ON public.social_post_schedules
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.social_posts
DROP POLICY IF EXISTS "Service role full access social_posts" ON public.social_posts;
CREATE POLICY "Service role full access social_posts" ON public.social_posts
  AS PERMISSIVE FOR ALL TO service_role
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.space_automation_run_state
DROP POLICY IF EXISTS "Users can insert own run state" ON public.space_automation_run_state;
CREATE POLICY "Users can insert own run state" ON public.space_automation_run_state
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "Users can read own run state" ON public.space_automation_run_state;
CREATE POLICY "Users can read own run state" ON public.space_automation_run_state
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.space_automation_runs
DROP POLICY IF EXISTS "Org members can view automation runs" ON public.space_automation_runs;
CREATE POLICY "Org members can view automation runs" ON public.space_automation_runs
  AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT om.org_id
   FROM org_members om
  WHERE (om.user_id = (SELECT auth.uid())))));

DROP POLICY IF EXISTS "Users can insert their own automation runs" ON public.space_automation_runs;
CREATE POLICY "Users can insert their own automation runs" ON public.space_automation_runs
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own automation runs" ON public.space_automation_runs;
CREATE POLICY "Users can view their own automation runs" ON public.space_automation_runs
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.space_automations
DROP POLICY IF EXISTS "Users can delete own space automations" ON public.space_automations;
CREATE POLICY "Users can delete own space automations" ON public.space_automations
  AS PERMISSIVE FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert own space automations" ON public.space_automations;
CREATE POLICY "Users can insert own space automations" ON public.space_automations
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read own space automations" ON public.space_automations;
CREATE POLICY "Users can read own space automations" ON public.space_automations
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read shared space automations" ON public.space_automations;
CREATE POLICY "Users can read shared space automations" ON public.space_automations
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (space_shares ss
     JOIN spaces s ON ((s.id = ss.space_id)))
  WHERE ((ss.space_id = space_automations.space_id) AND (((ss.entity_type = 'user'::text) AND (ss.entity_id = (SELECT auth.uid()))) OR ((ss.entity_type = 'org'::text) AND (s.org_id IS NOT NULL) AND (ss.entity_id = s.org_id) AND is_org_member(s.org_id)))))));

DROP POLICY IF EXISTS "Users can update own space automations" ON public.space_automations;
CREATE POLICY "Users can update own space automations" ON public.space_automations
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

-- public.space_drive_folder_mappings
DROP POLICY IF EXISTS "Users can delete own drive folder mappings" ON public.space_drive_folder_mappings;
CREATE POLICY "Users can delete own drive folder mappings" ON public.space_drive_folder_mappings
  AS PERMISSIVE FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert own drive folder mappings" ON public.space_drive_folder_mappings;
CREATE POLICY "Users can insert own drive folder mappings" ON public.space_drive_folder_mappings
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read own drive folder mappings" ON public.space_drive_folder_mappings;
CREATE POLICY "Users can read own drive folder mappings" ON public.space_drive_folder_mappings
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own drive folder mappings" ON public.space_drive_folder_mappings;
CREATE POLICY "Users can update own drive folder mappings" ON public.space_drive_folder_mappings
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

-- public.space_drive_push_channels
DROP POLICY IF EXISTS "space_drive_push_channels_delete_policy" ON public.space_drive_push_channels;
CREATE POLICY "space_drive_push_channels_delete_policy" ON public.space_drive_push_channels
  AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM space_drive_folder_mappings m
  WHERE ((m.id = space_drive_push_channels.mapping_id) AND ((m.user_id = (SELECT auth.uid())) OR (m.org_id IN ( SELECT org_members.org_id
           FROM org_members
          WHERE (org_members.user_id = (SELECT auth.uid())))))))));

DROP POLICY IF EXISTS "space_drive_push_channels_insert_policy" ON public.space_drive_push_channels;
CREATE POLICY "space_drive_push_channels_insert_policy" ON public.space_drive_push_channels
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM space_drive_folder_mappings m
  WHERE ((m.id = space_drive_push_channels.mapping_id) AND ((m.user_id = (SELECT auth.uid())) OR (m.org_id IN ( SELECT org_members.org_id
           FROM org_members
          WHERE (org_members.user_id = (SELECT auth.uid())))))))));

DROP POLICY IF EXISTS "space_drive_push_channels_select_policy" ON public.space_drive_push_channels;
CREATE POLICY "space_drive_push_channels_select_policy" ON public.space_drive_push_channels
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM space_drive_folder_mappings m
  WHERE ((m.id = space_drive_push_channels.mapping_id) AND ((m.user_id = (SELECT auth.uid())) OR (m.org_id IN ( SELECT org_members.org_id
           FROM org_members
          WHERE (org_members.user_id = (SELECT auth.uid())))))))));

DROP POLICY IF EXISTS "space_drive_push_channels_update_policy" ON public.space_drive_push_channels;
CREATE POLICY "space_drive_push_channels_update_policy" ON public.space_drive_push_channels
  AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM space_drive_folder_mappings m
  WHERE ((m.id = space_drive_push_channels.mapping_id) AND ((m.user_id = (SELECT auth.uid())) OR (m.org_id IN ( SELECT org_members.org_id
           FROM org_members
          WHERE (org_members.user_id = (SELECT auth.uid())))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM space_drive_folder_mappings m
  WHERE ((m.id = space_drive_push_channels.mapping_id) AND ((m.user_id = (SELECT auth.uid())) OR (m.org_id IN ( SELECT org_members.org_id
           FROM org_members
          WHERE (org_members.user_id = (SELECT auth.uid())))))))));

-- public.space_external_automation_events
DROP POLICY IF EXISTS "Org members can view external automation events" ON public.space_external_automation_events;
CREATE POLICY "Org members can view external automation events" ON public.space_external_automation_events
  AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT om.org_id
   FROM org_members om
  WHERE (om.user_id = (SELECT auth.uid())))));

DROP POLICY IF EXISTS "Users can view their own external automation events" ON public.space_external_automation_events;
CREATE POLICY "Users can view their own external automation events" ON public.space_external_automation_events
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.space_external_automation_triggers
DROP POLICY IF EXISTS "Org members can view external automation triggers" ON public.space_external_automation_triggers;
CREATE POLICY "Org members can view external automation triggers" ON public.space_external_automation_triggers
  AS PERMISSIVE FOR SELECT TO public
  USING ((org_id IN ( SELECT om.org_id
   FROM org_members om
  WHERE (om.user_id = (SELECT auth.uid())))));

DROP POLICY IF EXISTS "Users can delete their own external automation triggers" ON public.space_external_automation_triggers;
CREATE POLICY "Users can delete their own external automation triggers" ON public.space_external_automation_triggers
  AS PERMISSIVE FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert their own external automation triggers" ON public.space_external_automation_triggers;
CREATE POLICY "Users can insert their own external automation triggers" ON public.space_external_automation_triggers
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((((SELECT auth.uid()) = user_id) AND ((SELECT auth.uid()) = created_by)));

DROP POLICY IF EXISTS "Users can update their own external automation triggers" ON public.space_external_automation_triggers;
CREATE POLICY "Users can update their own external automation triggers" ON public.space_external_automation_triggers
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can view their own external automation triggers" ON public.space_external_automation_triggers;
CREATE POLICY "Users can view their own external automation triggers" ON public.space_external_automation_triggers
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.space_item_activity
DROP POLICY IF EXISTS "Users can insert own activity" ON public.space_item_activity;
CREATE POLICY "Users can insert own activity" ON public.space_item_activity
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read own activity" ON public.space_item_activity;
CREATE POLICY "Users can read own activity" ON public.space_item_activity
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.space_item_deliverables
DROP POLICY IF EXISTS "Users can read own deliverables" ON public.space_item_deliverables;
CREATE POLICY "Users can read own deliverables" ON public.space_item_deliverables
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.space_item_shares
DROP POLICY IF EXISTS "Users can delete space item shares" ON public.space_item_shares;
CREATE POLICY "Users can delete space item shares" ON public.space_item_shares
  AS PERMISSIVE FOR DELETE TO public
  USING ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "Users can insert space item shares" ON public.space_item_shares;
CREATE POLICY "Users can insert space item shares" ON public.space_item_shares
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "Users can read space item shares" ON public.space_item_shares;
CREATE POLICY "Users can read space item shares" ON public.space_item_shares
  AS PERMISSIVE FOR SELECT TO public
  USING ((((SELECT auth.uid()) = created_by) OR ((entity_type = 'user'::text) AND (entity_id = (SELECT auth.uid()))) OR ((entity_type = 'org'::text) AND (org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "Users can update space item shares" ON public.space_item_shares;
CREATE POLICY "Users can update space item shares" ON public.space_item_shares
  AS PERMISSIVE FOR UPDATE TO public
  USING ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))))
  WITH CHECK ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

-- public.space_items
DROP POLICY IF EXISTS "Users can delete own space items" ON public.space_items;
CREATE POLICY "Users can delete own space items" ON public.space_items
  AS PERMISSIVE FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert own space items" ON public.space_items;
CREATE POLICY "Users can insert own space items" ON public.space_items
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read own space items" ON public.space_items;
CREATE POLICY "Users can read own space items" ON public.space_items
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read space-shared items" ON public.space_items;
CREATE POLICY "Users can read space-shared items" ON public.space_items
  AS PERMISSIVE FOR SELECT TO public
  USING (((is_private = false) AND (EXISTS ( SELECT 1
   FROM space_shares ss
  WHERE ((ss.space_id = space_items.space_id) AND (((ss.entity_type = 'user'::text) AND (ss.entity_id = (SELECT auth.uid()))) OR ((ss.entity_type = 'org'::text) AND (space_items.org_id IS NOT NULL) AND (ss.entity_id = space_items.org_id) AND is_org_member(space_items.org_id))))))));

DROP POLICY IF EXISTS "Users can update own space items" ON public.space_items;
CREATE POLICY "Users can update own space items" ON public.space_items
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

-- public.space_shares
DROP POLICY IF EXISTS "Users can delete space shares" ON public.space_shares;
CREATE POLICY "Users can delete space shares" ON public.space_shares
  AS PERMISSIVE FOR DELETE TO public
  USING ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "Users can insert space shares" ON public.space_shares;
CREATE POLICY "Users can insert space shares" ON public.space_shares
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "Users can read space shares" ON public.space_shares;
CREATE POLICY "Users can read space shares" ON public.space_shares
  AS PERMISSIVE FOR SELECT TO public
  USING ((((SELECT auth.uid()) = created_by) OR ((entity_type = 'user'::text) AND (entity_id = (SELECT auth.uid()))) OR ((entity_type = 'org'::text) AND (org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "Users can update space shares" ON public.space_shares;
CREATE POLICY "Users can update space shares" ON public.space_shares
  AS PERMISSIVE FOR UPDATE TO public
  USING ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))))
  WITH CHECK ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

-- public.space_view_overrides
DROP POLICY IF EXISTS "Users can delete own view overrides" ON public.space_view_overrides;
CREATE POLICY "Users can delete own view overrides" ON public.space_view_overrides
  AS PERMISSIVE FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert own view overrides" ON public.space_view_overrides;
CREATE POLICY "Users can insert own view overrides" ON public.space_view_overrides
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read own view overrides" ON public.space_view_overrides;
CREATE POLICY "Users can read own view overrides" ON public.space_view_overrides
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own view overrides" ON public.space_view_overrides;
CREATE POLICY "Users can update own view overrides" ON public.space_view_overrides
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

-- public.space_view_shares
DROP POLICY IF EXISTS "Users can delete space view shares" ON public.space_view_shares;
CREATE POLICY "Users can delete space view shares" ON public.space_view_shares
  AS PERMISSIVE FOR DELETE TO public
  USING ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "Users can insert space view shares" ON public.space_view_shares;
CREATE POLICY "Users can insert space view shares" ON public.space_view_shares
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "Users can read space view shares" ON public.space_view_shares;
CREATE POLICY "Users can read space view shares" ON public.space_view_shares
  AS PERMISSIVE FOR SELECT TO public
  USING ((((SELECT auth.uid()) = created_by) OR ((entity_type = 'user'::text) AND (entity_id = (SELECT auth.uid()))) OR ((entity_type = 'org'::text) AND (org_id IS NOT NULL) AND is_org_member(org_id))));

DROP POLICY IF EXISTS "Users can update space view shares" ON public.space_view_shares;
CREATE POLICY "Users can update space view shares" ON public.space_view_shares
  AS PERMISSIVE FOR UPDATE TO public
  USING ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))))
  WITH CHECK ((((SELECT auth.uid()) = created_by) OR ((org_id IS NOT NULL) AND is_org_member(org_id))));

-- public.spaces
DROP POLICY IF EXISTS "Users can delete own spaces" ON public.spaces;
CREATE POLICY "Users can delete own spaces" ON public.spaces
  AS PERMISSIVE FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can insert own spaces" ON public.spaces;
CREATE POLICY "Users can insert own spaces" ON public.spaces
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read own spaces" ON public.spaces;
CREATE POLICY "Users can read own spaces" ON public.spaces
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can read shared spaces" ON public.spaces;
CREATE POLICY "Users can read shared spaces" ON public.spaces
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM space_shares ss
  WHERE ((ss.space_id = spaces.id) AND (((ss.entity_type = 'user'::text) AND (ss.entity_id = (SELECT auth.uid()))) OR ((ss.entity_type = 'org'::text) AND (spaces.org_id IS NOT NULL) AND (ss.entity_id = spaces.org_id) AND is_org_member(spaces.org_id)))))));

DROP POLICY IF EXISTS "Users can update own spaces" ON public.spaces;
CREATE POLICY "Users can update own spaces" ON public.spaces
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

-- public.subscription_plans
DROP POLICY IF EXISTS "service_role_full" ON public.subscription_plans;
CREATE POLICY "service_role_full" ON public.subscription_plans
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.team_brain_permissions
DROP POLICY IF EXISTS "team_brain_permissions_member_read" ON public.team_brain_permissions;
CREATE POLICY "team_brain_permissions_member_read" ON public.team_brain_permissions
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.id = team_brain_permissions.team_member_id) AND (tm.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "team_brain_permissions_owner_all" ON public.team_brain_permissions;
CREATE POLICY "team_brain_permissions_owner_all" ON public.team_brain_permissions
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.id = team_brain_permissions.team_member_id) AND (tm.owner_id = (SELECT auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.id = team_brain_permissions.team_member_id) AND (tm.owner_id = (SELECT auth.uid()))))));

-- public.team_campaign_permissions
DROP POLICY IF EXISTS "team_campaign_permissions_member_read" ON public.team_campaign_permissions;
CREATE POLICY "team_campaign_permissions_member_read" ON public.team_campaign_permissions
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.id = team_campaign_permissions.team_member_id) AND (tm.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "team_campaign_permissions_owner_all" ON public.team_campaign_permissions;
CREATE POLICY "team_campaign_permissions_owner_all" ON public.team_campaign_permissions
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.id = team_campaign_permissions.team_member_id) AND (tm.owner_id = (SELECT auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.id = team_campaign_permissions.team_member_id) AND (tm.owner_id = (SELECT auth.uid()))))));

-- public.team_invitations
DROP POLICY IF EXISTS "team_invitations_invitee_read" ON public.team_invitations;
CREATE POLICY "team_invitations_invitee_read" ON public.team_invitations
  AS PERMISSIVE FOR SELECT TO public
  USING (((status = 'pending'::text) AND (lower(email) = lower(COALESCE(((SELECT auth.jwt()) ->> 'email'::text), ''::text)))));

DROP POLICY IF EXISTS "team_invitations_owner_all" ON public.team_invitations;
CREATE POLICY "team_invitations_owner_all" ON public.team_invitations
  AS PERMISSIVE FOR ALL TO public
  USING ((owner_id = (SELECT auth.uid())))
  WITH CHECK ((owner_id = (SELECT auth.uid())));

-- public.team_member_credit_limits
DROP POLICY IF EXISTS "team_member_credit_limits_member_read" ON public.team_member_credit_limits;
CREATE POLICY "team_member_credit_limits_member_read" ON public.team_member_credit_limits
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.id = team_member_credit_limits.team_member_id) AND (tm.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "team_member_credit_limits_owner_all" ON public.team_member_credit_limits;
CREATE POLICY "team_member_credit_limits_owner_all" ON public.team_member_credit_limits
  AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.id = team_member_credit_limits.team_member_id) AND (tm.owner_id = (SELECT auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.id = team_member_credit_limits.team_member_id) AND (tm.owner_id = (SELECT auth.uid()))))));

-- public.team_member_credit_log
DROP POLICY IF EXISTS "team_member_credit_log_member_read" ON public.team_member_credit_log;
CREATE POLICY "team_member_credit_log_member_read" ON public.team_member_credit_log
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.id = team_member_credit_log.team_member_id) AND (tm.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "team_member_credit_log_owner_all" ON public.team_member_credit_log;
CREATE POLICY "team_member_credit_log_owner_all" ON public.team_member_credit_log
  AS PERMISSIVE FOR ALL TO public
  USING ((owner_id = (SELECT auth.uid())))
  WITH CHECK ((owner_id = (SELECT auth.uid())));

-- public.team_members
DROP POLICY IF EXISTS "team_members_accept_invite" ON public.team_members;
CREATE POLICY "team_members_accept_invite" ON public.team_members
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "team_members_member_read" ON public.team_members;
CREATE POLICY "team_members_member_read" ON public.team_members
  AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "team_members_owner_all" ON public.team_members;
CREATE POLICY "team_members_owner_all" ON public.team_members
  AS PERMISSIVE FOR ALL TO public
  USING ((owner_id = (SELECT auth.uid())))
  WITH CHECK ((owner_id = (SELECT auth.uid())));

-- public.template_skill_assignments
DROP POLICY IF EXISTS "tsa_read_all" ON public.template_skill_assignments;
CREATE POLICY "tsa_read_all" ON public.template_skill_assignments
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) IS NOT NULL));

-- public.token_providers_pricing
DROP POLICY IF EXISTS "service_role_full" ON public.token_providers_pricing;
CREATE POLICY "service_role_full" ON public.token_providers_pricing
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.user_credit_auto_recharge
DROP POLICY IF EXISTS "service_role_full" ON public.user_credit_auto_recharge;
CREATE POLICY "service_role_full" ON public.user_credit_auto_recharge
  AS PERMISSIVE FOR ALL TO service_role
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.user_integrations
DROP POLICY IF EXISTS "Service role full access user_integrations" ON public.user_integrations;
CREATE POLICY "Service role full access user_integrations" ON public.user_integrations
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text));

DROP POLICY IF EXISTS "Users manage org personal integrations" ON public.user_integrations;
CREATE POLICY "Users manage org personal integrations" ON public.user_integrations
  AS PERMISSIVE FOR ALL TO public
  USING (((org_id IS NOT NULL) AND (scope_mode = 'personal'::text) AND ((SELECT auth.uid()) = user_id) AND is_org_member(org_id)))
  WITH CHECK (((org_id IS NOT NULL) AND (scope_mode = 'personal'::text) AND ((SELECT auth.uid()) = user_id) AND is_org_member(org_id)));

DROP POLICY IF EXISTS "Users manage personal integrations" ON public.user_integrations;
CREATE POLICY "Users manage personal integrations" ON public.user_integrations
  AS PERMISSIVE FOR ALL TO public
  USING ((((SELECT auth.uid()) = user_id) AND (org_id IS NULL) AND (scope_mode = 'personal'::text)))
  WITH CHECK ((((SELECT auth.uid()) = user_id) AND (org_id IS NULL) AND (scope_mode = 'personal'::text)));

-- public.user_notifications
DROP POLICY IF EXISTS "Owner can read personal user_notifications" ON public.user_notifications;
CREATE POLICY "Owner can read personal user_notifications" ON public.user_notifications
  AS PERMISSIVE FOR SELECT TO public
  USING (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Owner can write personal user_notifications" ON public.user_notifications;
CREATE POLICY "Owner can write personal user_notifications" ON public.user_notifications
  AS PERMISSIVE FOR ALL TO public
  USING (((org_id IS NULL) AND (user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Users can read own notifications" ON public.user_notifications;
CREATE POLICY "Users can read own notifications" ON public.user_notifications
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" ON public.user_notifications
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

-- public.user_object_records
DROP POLICY IF EXISTS "user_object_records_insert_own" ON public.user_object_records;
CREATE POLICY "user_object_records_insert_own" ON public.user_object_records
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "user_object_records_select_own" ON public.user_object_records;
CREATE POLICY "user_object_records_select_own" ON public.user_object_records
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "user_object_records_update_own" ON public.user_object_records;
CREATE POLICY "user_object_records_update_own" ON public.user_object_records
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.user_object_types
DROP POLICY IF EXISTS "user_object_types_insert_own" ON public.user_object_types;
CREATE POLICY "user_object_types_insert_own" ON public.user_object_types
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "user_object_types_select_own" ON public.user_object_types;
CREATE POLICY "user_object_types_select_own" ON public.user_object_types
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "user_object_types_update_own" ON public.user_object_types;
CREATE POLICY "user_object_types_update_own" ON public.user_object_types
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.user_subscriptions
DROP POLICY IF EXISTS "service_role_full" ON public.user_subscriptions;
CREATE POLICY "service_role_full" ON public.user_subscriptions
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.user_trials
DROP POLICY IF EXISTS "service_role_full" ON public.user_trials;
CREATE POLICY "service_role_full" ON public.user_trials
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.user_widget_folders
DROP POLICY IF EXISTS "Users can manage their own widget folders" ON public.user_widget_folders;
CREATE POLICY "Users can manage their own widget folders" ON public.user_widget_folders
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.user_widgets
DROP POLICY IF EXISTS "user_widgets_delete_own" ON public.user_widgets;
CREATE POLICY "user_widgets_delete_own" ON public.user_widgets
  AS PERMISSIVE FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "user_widgets_insert_own" ON public.user_widgets;
CREATE POLICY "user_widgets_insert_own" ON public.user_widgets
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "user_widgets_select_own" ON public.user_widgets;
CREATE POLICY "user_widgets_select_own" ON public.user_widgets
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "user_widgets_update_own" ON public.user_widgets;
CREATE POLICY "user_widgets_update_own" ON public.user_widgets
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.user_workspaces
DROP POLICY IF EXISTS "user_workspaces_delete_own" ON public.user_workspaces;
CREATE POLICY "user_workspaces_delete_own" ON public.user_workspaces
  AS PERMISSIVE FOR DELETE TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "user_workspaces_insert_own" ON public.user_workspaces;
CREATE POLICY "user_workspaces_insert_own" ON public.user_workspaces
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "user_workspaces_select_own" ON public.user_workspaces;
CREATE POLICY "user_workspaces_select_own" ON public.user_workspaces
  AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()) = user_id));

DROP POLICY IF EXISTS "user_workspaces_update_own" ON public.user_workspaces;
CREATE POLICY "user_workspaces_update_own" ON public.user_workspaces
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()) = user_id));

-- public.waitlist_entries
DROP POLICY IF EXISTS "service_role_full" ON public.waitlist_entries;
CREATE POLICY "service_role_full" ON public.waitlist_entries
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.waitlist_invites
DROP POLICY IF EXISTS "service_role_full" ON public.waitlist_invites;
CREATE POLICY "service_role_full" ON public.waitlist_invites
  AS PERMISSIVE FOR ALL TO public
  USING (((SELECT auth.role()) = 'service_role'::text));

-- public.workspace_pages
DROP POLICY IF EXISTS "workspace_pages_delete_own" ON public.workspace_pages;
CREATE POLICY "workspace_pages_delete_own" ON public.workspace_pages
  AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM user_workspaces uw
  WHERE ((uw.id = workspace_pages.workspace_id) AND (uw.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "workspace_pages_insert_own" ON public.workspace_pages;
CREATE POLICY "workspace_pages_insert_own" ON public.workspace_pages
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_workspaces uw
  WHERE ((uw.id = workspace_pages.workspace_id) AND (uw.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "workspace_pages_select_own" ON public.workspace_pages;
CREATE POLICY "workspace_pages_select_own" ON public.workspace_pages
  AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM user_workspaces uw
  WHERE ((uw.id = workspace_pages.workspace_id) AND (uw.user_id = (SELECT auth.uid()))))));

DROP POLICY IF EXISTS "workspace_pages_update_own" ON public.workspace_pages;
CREATE POLICY "workspace_pages_update_own" ON public.workspace_pages
  AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM user_workspaces uw
  WHERE ((uw.id = workspace_pages.workspace_id) AND (uw.user_id = (SELECT auth.uid()))))));

