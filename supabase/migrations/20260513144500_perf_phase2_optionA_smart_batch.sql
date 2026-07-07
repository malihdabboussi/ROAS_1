-- Phase 2 Option A: smart batch consolidation of 40 mechanical tables.
-- Per-command policies generated from classifier output. Each table preserves
-- exact OR-union of its existing per-command predicates. Service-role bypass
-- (where present) preserved as TO service_role.

-- agent_awareness_points: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org agent_awareness_points" ON public.agent_awareness_points;
DROP POLICY IF EXISTS "Owner can write personal agent_awareness_points" ON public.agent_awareness_points;
DROP POLICY IF EXISTS "Users can delete own agent_awareness_points" ON public.agent_awareness_points;
DROP POLICY IF EXISTS "Users can insert own agent_awareness_points" ON public.agent_awareness_points;
DROP POLICY IF EXISTS "Org members can read org agent_awareness_points" ON public.agent_awareness_points;
DROP POLICY IF EXISTS "Owner can read personal agent_awareness_points" ON public.agent_awareness_points;
DROP POLICY IF EXISTS "Users can select own agent_awareness_points" ON public.agent_awareness_points;
DROP POLICY IF EXISTS "Users can update own agent_awareness_points" ON public.agent_awareness_points;
CREATE POLICY "agent_awareness_points_select" ON public.agent_awareness_points AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "agent_awareness_points_insert" ON public.agent_awareness_points AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "agent_awareness_points_update" ON public.agent_awareness_points AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "agent_awareness_points_delete" ON public.agent_awareness_points AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- agent_awareness_sessions: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org agent_awareness_sessions" ON public.agent_awareness_sessions;
DROP POLICY IF EXISTS "Owner can write personal agent_awareness_sessions" ON public.agent_awareness_sessions;
DROP POLICY IF EXISTS "Users can delete own agent_awareness_sessions" ON public.agent_awareness_sessions;
DROP POLICY IF EXISTS "Users can insert own agent_awareness_sessions" ON public.agent_awareness_sessions;
DROP POLICY IF EXISTS "Org members can read org agent_awareness_sessions" ON public.agent_awareness_sessions;
DROP POLICY IF EXISTS "Owner can read personal agent_awareness_sessions" ON public.agent_awareness_sessions;
DROP POLICY IF EXISTS "Users can select own agent_awareness_sessions" ON public.agent_awareness_sessions;
DROP POLICY IF EXISTS "Users can update own agent_awareness_sessions" ON public.agent_awareness_sessions;
CREATE POLICY "agent_awareness_sessions_select" ON public.agent_awareness_sessions AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "agent_awareness_sessions_insert" ON public.agent_awareness_sessions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "agent_awareness_sessions_update" ON public.agent_awareness_sessions AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "agent_awareness_sessions_delete" ON public.agent_awareness_sessions AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- agent_channels: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org agent_channels" ON public.agent_channels;
DROP POLICY IF EXISTS "Users can delete own agent channels" ON public.agent_channels;
DROP POLICY IF EXISTS "Users can insert own agent channels" ON public.agent_channels;
DROP POLICY IF EXISTS "Org members can read org agent_channels" ON public.agent_channels;
DROP POLICY IF EXISTS "Users can view own agent channels" ON public.agent_channels;
DROP POLICY IF EXISTS "Users can update own agent channels" ON public.agent_channels;
CREATE POLICY "agent_channels_select" ON public.agent_channels AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "agent_channels_insert" ON public.agent_channels AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "agent_channels_update" ON public.agent_channels AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "agent_channels_delete" ON public.agent_channels AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- ai_usage_events: per-command consolidation
DROP POLICY IF EXISTS "service_role_full" ON public.ai_usage_events;
DROP POLICY IF EXISTS "Org members can read org usage events" ON public.ai_usage_events;
DROP POLICY IF EXISTS "users_read_own" ON public.ai_usage_events;
CREATE POLICY "ai_usage_events_service_all" ON public.ai_usage_events AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ai_usage_events_select" ON public.ai_usage_events AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- brain_cross_suggestions: per-command consolidation
DROP POLICY IF EXISTS "Users can read own cross suggestions" ON public.brain_cross_suggestions;
DROP POLICY IF EXISTS "Users can update own cross suggestions" ON public.brain_cross_suggestions;
CREATE POLICY "brain_cross_suggestions_select" ON public.brain_cross_suggestions AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));
CREATE POLICY "brain_cross_suggestions_update" ON public.brain_cross_suggestions AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));

-- brain_import_jobs: per-command consolidation
DROP POLICY IF EXISTS "Users can read own brain import jobs" ON public.brain_import_jobs;
DROP POLICY IF EXISTS "Users can update own brain import jobs" ON public.brain_import_jobs;
CREATE POLICY "brain_import_jobs_select" ON public.brain_import_jobs AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));
CREATE POLICY "brain_import_jobs_update" ON public.brain_import_jobs AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));

-- campaign_integration_connections: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org campaign integration connections" ON public.campaign_integration_connections;
DROP POLICY IF EXISTS "Service role full access campaign_integration_connections" ON public.campaign_integration_connections;
DROP POLICY IF EXISTS "Users manage own campaign integration connections" ON public.campaign_integration_connections;
DROP POLICY IF EXISTS "Org members can read org campaign integration connections" ON public.campaign_integration_connections;
CREATE POLICY "campaign_integration_connections_service_all" ON public.campaign_integration_connections AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "campaign_integration_connections_select" ON public.campaign_integration_connections AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "campaign_integration_connections_insert" ON public.campaign_integration_connections AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "campaign_integration_connections_update" ON public.campaign_integration_connections AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "campaign_integration_connections_delete" ON public.campaign_integration_connections AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- campaign_user_state: per-command consolidation
DROP POLICY IF EXISTS "Users delete own campaign state" ON public.campaign_user_state;
DROP POLICY IF EXISTS "Users insert own campaign state" ON public.campaign_user_state;
DROP POLICY IF EXISTS "Users select own campaign state" ON public.campaign_user_state;
DROP POLICY IF EXISTS "Users update own campaign state" ON public.campaign_user_state;
CREATE POLICY "campaign_user_state_select" ON public.campaign_user_state AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));
CREATE POLICY "campaign_user_state_insert" ON public.campaign_user_state AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "campaign_user_state_update" ON public.campaign_user_state AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "campaign_user_state_delete" ON public.campaign_user_state AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id));

-- contact_custom_field_definitions: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org custom_field_defs" ON public.contact_custom_field_definitions;
DROP POLICY IF EXISTS "contact_custom_field_definitions_own" ON public.contact_custom_field_definitions;
DROP POLICY IF EXISTS "Org members can read org custom_field_defs" ON public.contact_custom_field_definitions;
CREATE POLICY "contact_custom_field_definitions_select" ON public.contact_custom_field_definitions AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "contact_custom_field_definitions_insert" ON public.contact_custom_field_definitions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "contact_custom_field_definitions_update" ON public.contact_custom_field_definitions AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "contact_custom_field_definitions_delete" ON public.contact_custom_field_definitions AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- contacts: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org contacts" ON public.contacts;
DROP POLICY IF EXISTS "contacts_own" ON public.contacts;
DROP POLICY IF EXISTS "Org members can read org contacts" ON public.contacts;
CREATE POLICY "contacts_select" ON public.contacts AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "contacts_insert" ON public.contacts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "contacts_update" ON public.contacts AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "contacts_delete" ON public.contacts AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- credit_purchases: per-command consolidation
DROP POLICY IF EXISTS "service_role_full" ON public.credit_purchases;
DROP POLICY IF EXISTS "users_read_own" ON public.credit_purchases;
CREATE POLICY "credit_purchases_service_all" ON public.credit_purchases AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "credit_purchases_select" ON public.credit_purchases AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));

-- crm_sync_jobs: per-command consolidation
DROP POLICY IF EXISTS "Users can insert own crm sync jobs" ON public.crm_sync_jobs;
DROP POLICY IF EXISTS "Users can read own crm sync jobs" ON public.crm_sync_jobs;
CREATE POLICY "crm_sync_jobs_select" ON public.crm_sync_jobs AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));
CREATE POLICY "crm_sync_jobs_insert" ON public.crm_sync_jobs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));

-- domains: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org domains" ON public.domains;
DROP POLICY IF EXISTS "domains_own" ON public.domains;
DROP POLICY IF EXISTS "service_role_full_access" ON public.domains;
DROP POLICY IF EXISTS "Org members can read org domains" ON public.domains;
DROP POLICY IF EXISTS "users_read_own" ON public.domains;
CREATE POLICY "domains_service_all" ON public.domains AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "domains_select" ON public.domains AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "domains_insert" ON public.domains AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "domains_update" ON public.domains AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "domains_delete" ON public.domains AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- email_broadcast_schedules: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org email_broadcast_schedules" ON public.email_broadcast_schedules;
DROP POLICY IF EXISTS "Users can manage own broadcast schedules" ON public.email_broadcast_schedules;
DROP POLICY IF EXISTS "Org members can read org email_broadcast_schedules" ON public.email_broadcast_schedules;
CREATE POLICY "email_broadcast_schedules_select" ON public.email_broadcast_schedules AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_broadcast_schedules_insert" ON public.email_broadcast_schedules AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_broadcast_schedules_update" ON public.email_broadcast_schedules AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_broadcast_schedules_delete" ON public.email_broadcast_schedules AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- email_domains: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org email_domains" ON public.email_domains;
DROP POLICY IF EXISTS "Users can manage own domains" ON public.email_domains;
DROP POLICY IF EXISTS "Org members can read org email_domains" ON public.email_domains;
CREATE POLICY "email_domains_select" ON public.email_domains AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_domains_insert" ON public.email_domains AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_domains_update" ON public.email_domains AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_domains_delete" ON public.email_domains AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- email_sender_identities: per-command consolidation
DROP POLICY IF EXISTS "Users can manage own sender identities" ON public.email_sender_identities;
DROP POLICY IF EXISTS "Org members can read org email_sender_identities" ON public.email_sender_identities;
CREATE POLICY "email_sender_identities_select" ON public.email_sender_identities AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_sender_identities_insert" ON public.email_sender_identities AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "email_sender_identities_update" ON public.email_sender_identities AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "email_sender_identities_delete" ON public.email_sender_identities AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id));

-- email_settings: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org email_settings" ON public.email_settings;
DROP POLICY IF EXISTS "Users can manage own email settings" ON public.email_settings;
DROP POLICY IF EXISTS "Org members can read org email_settings" ON public.email_settings;
CREATE POLICY "email_settings_select" ON public.email_settings AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_settings_insert" ON public.email_settings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_settings_update" ON public.email_settings AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_settings_delete" ON public.email_settings AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- email_single_schedules: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org email_single_schedules" ON public.email_single_schedules;
DROP POLICY IF EXISTS "Users can manage own single schedules" ON public.email_single_schedules;
DROP POLICY IF EXISTS "Org members can read org email_single_schedules" ON public.email_single_schedules;
CREATE POLICY "email_single_schedules_select" ON public.email_single_schedules AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_single_schedules_insert" ON public.email_single_schedules AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_single_schedules_update" ON public.email_single_schedules AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_single_schedules_delete" ON public.email_single_schedules AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- email_suppressions: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org email_suppressions" ON public.email_suppressions;
DROP POLICY IF EXISTS "Users can manage own suppressions" ON public.email_suppressions;
DROP POLICY IF EXISTS "Org members can read org email_suppressions" ON public.email_suppressions;
CREATE POLICY "email_suppressions_select" ON public.email_suppressions AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_suppressions_insert" ON public.email_suppressions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_suppressions_update" ON public.email_suppressions AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "email_suppressions_delete" ON public.email_suppressions AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- forms: per-command consolidation
DROP POLICY IF EXISTS "org_forms_all" ON public.forms;
DROP POLICY IF EXISTS "owner_forms_all" ON public.forms;
CREATE POLICY "forms_select" ON public.forms AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "forms_insert" ON public.forms AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "forms_update" ON public.forms AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "forms_delete" ON public.forms AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- funnel_conversion_points: per-command consolidation
DROP POLICY IF EXISTS "funnel_conversion_points_delete_own" ON public.funnel_conversion_points;
DROP POLICY IF EXISTS "funnel_conversion_points_insert_own" ON public.funnel_conversion_points;
DROP POLICY IF EXISTS "funnel_conversion_points_select_own" ON public.funnel_conversion_points;
DROP POLICY IF EXISTS "funnel_conversion_points_update_own" ON public.funnel_conversion_points;
CREATE POLICY "funnel_conversion_points_select" ON public.funnel_conversion_points AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));
CREATE POLICY "funnel_conversion_points_insert" ON public.funnel_conversion_points AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "funnel_conversion_points_update" ON public.funnel_conversion_points AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "funnel_conversion_points_delete" ON public.funnel_conversion_points AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id));

-- github_repos: per-command consolidation
DROP POLICY IF EXISTS "Users can manage own github repos" ON public.github_repos;
DROP POLICY IF EXISTS "Org members can read org github_repos" ON public.github_repos;
CREATE POLICY "github_repos_select" ON public.github_repos AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "github_repos_insert" ON public.github_repos AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "github_repos_update" ON public.github_repos AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "github_repos_delete" ON public.github_repos AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id));

-- media_assets: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org media_assets" ON public.media_assets;
DROP POLICY IF EXISTS "Service role full access media" ON public.media_assets;
DROP POLICY IF EXISTS "Users can delete own media" ON public.media_assets;
DROP POLICY IF EXISTS "Users can insert own media" ON public.media_assets;
DROP POLICY IF EXISTS "Org members can read org media_assets" ON public.media_assets;
DROP POLICY IF EXISTS "Users can view own media" ON public.media_assets;
DROP POLICY IF EXISTS "Users can update own media" ON public.media_assets;
CREATE POLICY "media_assets_service_all" ON public.media_assets AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "media_assets_select" ON public.media_assets AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "media_assets_insert" ON public.media_assets AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "media_assets_update" ON public.media_assets AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "media_assets_delete" ON public.media_assets AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- media_generation_jobs: per-command consolidation
DROP POLICY IF EXISTS "Service role full access media generation jobs" ON public.media_generation_jobs;
DROP POLICY IF EXISTS "Users can delete own media generation jobs" ON public.media_generation_jobs;
DROP POLICY IF EXISTS "Users can insert own media generation jobs" ON public.media_generation_jobs;
DROP POLICY IF EXISTS "Users can view own media generation jobs" ON public.media_generation_jobs;
DROP POLICY IF EXISTS "Users can update own media generation jobs" ON public.media_generation_jobs;
CREATE POLICY "media_generation_jobs_service_all" ON public.media_generation_jobs AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "media_generation_jobs_select" ON public.media_generation_jobs AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));
CREATE POLICY "media_generation_jobs_insert" ON public.media_generation_jobs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "media_generation_jobs_update" ON public.media_generation_jobs AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "media_generation_jobs_delete" ON public.media_generation_jobs AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id));

-- monthly_credit_usage: per-command consolidation
DROP POLICY IF EXISTS "service_role_full" ON public.monthly_credit_usage;
DROP POLICY IF EXISTS "users_read_own" ON public.monthly_credit_usage;
CREATE POLICY "monthly_credit_usage_service_all" ON public.monthly_credit_usage AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "monthly_credit_usage_select" ON public.monthly_credit_usage AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));

-- promo_redemptions: per-command consolidation
DROP POLICY IF EXISTS "service_role_full" ON public.promo_redemptions;
DROP POLICY IF EXISTS "users_read_own" ON public.promo_redemptions;
CREATE POLICY "promo_redemptions_service_all" ON public.promo_redemptions AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "promo_redemptions_select" ON public.promo_redemptions AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));

-- segments: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org segments" ON public.segments;
DROP POLICY IF EXISTS "segments_own" ON public.segments;
DROP POLICY IF EXISTS "Org members can read org segments" ON public.segments;
CREATE POLICY "segments_select" ON public.segments AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "segments_insert" ON public.segments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "segments_update" ON public.segments AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "segments_delete" ON public.segments AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- sequence_email_sends: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org sequence_email_sends" ON public.sequence_email_sends;
DROP POLICY IF EXISTS "Users can manage own sequence email sends" ON public.sequence_email_sends;
DROP POLICY IF EXISTS "Org members can read org sequence_email_sends" ON public.sequence_email_sends;
CREATE POLICY "sequence_email_sends_select" ON public.sequence_email_sends AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "sequence_email_sends_insert" ON public.sequence_email_sends AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "sequence_email_sends_update" ON public.sequence_email_sends AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "sequence_email_sends_delete" ON public.sequence_email_sends AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- social_post_schedules: per-command consolidation
DROP POLICY IF EXISTS "Org members can write org social_post_schedules" ON public.social_post_schedules;
DROP POLICY IF EXISTS "Users can manage own social post schedules" ON public.social_post_schedules;
DROP POLICY IF EXISTS "Org members can read org social_post_schedules" ON public.social_post_schedules;
CREATE POLICY "social_post_schedules_select" ON public.social_post_schedules AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "social_post_schedules_insert" ON public.social_post_schedules AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "social_post_schedules_update" ON public.social_post_schedules AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id))) WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "social_post_schedules_delete" ON public.social_post_schedules AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- space_view_overrides: per-command consolidation
DROP POLICY IF EXISTS "Users can delete own view overrides" ON public.space_view_overrides;
DROP POLICY IF EXISTS "Users can insert own view overrides" ON public.space_view_overrides;
DROP POLICY IF EXISTS "Users can read own view overrides" ON public.space_view_overrides;
DROP POLICY IF EXISTS "Users can update own view overrides" ON public.space_view_overrides;
CREATE POLICY "space_view_overrides_select" ON public.space_view_overrides AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));
CREATE POLICY "space_view_overrides_insert" ON public.space_view_overrides AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "space_view_overrides_update" ON public.space_view_overrides AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "space_view_overrides_delete" ON public.space_view_overrides AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id));

-- user_credit_auto_recharge: per-command consolidation
DROP POLICY IF EXISTS "service_role_full" ON public.user_credit_auto_recharge;
DROP POLICY IF EXISTS "users_insert_own" ON public.user_credit_auto_recharge;
DROP POLICY IF EXISTS "users_read_own" ON public.user_credit_auto_recharge;
DROP POLICY IF EXISTS "users_update_own" ON public.user_credit_auto_recharge;
CREATE POLICY "user_credit_auto_recharge_service_all" ON public.user_credit_auto_recharge AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_credit_auto_recharge_select" ON public.user_credit_auto_recharge AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));
CREATE POLICY "user_credit_auto_recharge_insert" ON public.user_credit_auto_recharge AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "user_credit_auto_recharge_update" ON public.user_credit_auto_recharge AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));

-- user_object_records: per-command consolidation
DROP POLICY IF EXISTS "user_object_records_insert_own" ON public.user_object_records;
DROP POLICY IF EXISTS "Org members can read org object_records" ON public.user_object_records;
DROP POLICY IF EXISTS "user_object_records_select_own" ON public.user_object_records;
DROP POLICY IF EXISTS "user_object_records_update_own" ON public.user_object_records;
CREATE POLICY "user_object_records_select" ON public.user_object_records AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "user_object_records_insert" ON public.user_object_records AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "user_object_records_update" ON public.user_object_records AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));

-- user_object_types: per-command consolidation
DROP POLICY IF EXISTS "user_object_types_insert_own" ON public.user_object_types;
DROP POLICY IF EXISTS "Org members can read org object_types" ON public.user_object_types;
DROP POLICY IF EXISTS "user_object_types_select_own" ON public.user_object_types;
DROP POLICY IF EXISTS "user_object_types_update_own" ON public.user_object_types;
CREATE POLICY "user_object_types_select" ON public.user_object_types AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "user_object_types_insert" ON public.user_object_types AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "user_object_types_update" ON public.user_object_types AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));

-- user_subscriptions: per-command consolidation
DROP POLICY IF EXISTS "service_role_full" ON public.user_subscriptions;
DROP POLICY IF EXISTS "users_read_own" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_service_all" ON public.user_subscriptions AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_subscriptions_select" ON public.user_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));

-- user_trials: per-command consolidation
DROP POLICY IF EXISTS "service_role_full" ON public.user_trials;
DROP POLICY IF EXISTS "users_read_own" ON public.user_trials;
CREATE POLICY "user_trials_service_all" ON public.user_trials AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_trials_select" ON public.user_trials AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));

-- user_widgets: per-command consolidation
DROP POLICY IF EXISTS "user_widgets_delete_own" ON public.user_widgets;
DROP POLICY IF EXISTS "user_widgets_insert_own" ON public.user_widgets;
DROP POLICY IF EXISTS "user_widgets_select_own" ON public.user_widgets;
DROP POLICY IF EXISTS "user_widgets_update_own" ON public.user_widgets;
CREATE POLICY "user_widgets_select" ON public.user_widgets AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));
CREATE POLICY "user_widgets_insert" ON public.user_widgets AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "user_widgets_update" ON public.user_widgets AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "user_widgets_delete" ON public.user_widgets AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id));

-- user_workspaces: per-command consolidation
DROP POLICY IF EXISTS "user_workspaces_delete_own" ON public.user_workspaces;
DROP POLICY IF EXISTS "user_workspaces_insert_own" ON public.user_workspaces;
DROP POLICY IF EXISTS "Org members can read org workspaces" ON public.user_workspaces;
DROP POLICY IF EXISTS "user_workspaces_select_own" ON public.user_workspaces;
DROP POLICY IF EXISTS "user_workspaces_update_own" ON public.user_workspaces;
CREATE POLICY "user_workspaces_select" ON public.user_workspaces AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "user_workspaces_insert" ON public.user_workspaces AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "user_workspaces_update" ON public.user_workspaces AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "user_workspaces_delete" ON public.user_workspaces AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id));

-- vault_secrets: per-command consolidation
DROP POLICY IF EXISTS "Users can manage own vault secrets" ON public.vault_secrets;
DROP POLICY IF EXISTS "Org members can read org vault_secrets" ON public.vault_secrets;
CREATE POLICY "vault_secrets_select" ON public.vault_secrets AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));
CREATE POLICY "vault_secrets_insert" ON public.vault_secrets AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "vault_secrets_update" ON public.vault_secrets AS PERMISSIVE FOR UPDATE TO authenticated USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
CREATE POLICY "vault_secrets_delete" ON public.vault_secrets AS PERMISSIVE FOR DELETE TO authenticated USING (((SELECT auth.uid()) = user_id));

-- vb_agent_traces: per-command consolidation
DROP POLICY IF EXISTS "Org members can read org agent traces" ON public.vb_agent_traces;
DROP POLICY IF EXISTS "Users can view own traces" ON public.vb_agent_traces;
CREATE POLICY "vb_agent_traces_select" ON public.vb_agent_traces AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

-- vb_message_timeline_events: per-command consolidation
DROP POLICY IF EXISTS "Users can insert own message timeline events" ON public.vb_message_timeline_events;
DROP POLICY IF EXISTS "Users can view own message timeline events" ON public.vb_message_timeline_events;
CREATE POLICY "vb_message_timeline_events_select" ON public.vb_message_timeline_events AS PERMISSIVE FOR SELECT TO authenticated USING (((SELECT auth.uid()) = user_id));
CREATE POLICY "vb_message_timeline_events_insert" ON public.vb_message_timeline_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((SELECT auth.uid()) = user_id));
