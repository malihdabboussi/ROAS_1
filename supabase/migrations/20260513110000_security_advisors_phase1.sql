-- =============================================================================
-- Security advisors phase 1: zero-UX-impact hardening (verified against codebase)
-- =============================================================================
-- Addresses 8 ERROR + most WARN-level alerts from Supabase security advisors.
-- Excluded: items that change UX (public-bucket scoping deferred to Phase 2 once
-- decided, HIBP toggle is dashboard-only, plus 3 anon-by-design RPCs that must
-- stay callable for funnel/lead capture).
-- See full analysis in chat / .docs/logs/changelog2026-05-13.md.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. team_roster view: restore security_invoker (lost when view was recreated
--    out-of-band; the original 20260420110200_team_roster_view.sql created it
--    WITH (security_invoker = true) but pg_class.reloptions is NULL in prod).
--    Underlying RLS on agents_registry / org_members / profiles / mission_subtasks
--    / space_items already correctly scopes reads to org members.
-- -----------------------------------------------------------------------------
ALTER VIEW public.team_roster SET (security_invoker = true);

-- Views never need INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER. Postgres
-- granted them by default; revoke to shrink the attack surface.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.team_roster FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Enable RLS on tables exposed via PostgREST without policies. All readers
--    are server-side service-role clients, which bypass RLS — no app behavior
--    changes. Default deny stops any anon/authenticated REST access.
-- -----------------------------------------------------------------------------
ALTER TABLE public.billing_health_log                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_health_checks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_ops_outbox                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ns_brain_lint_results                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_agent_cleanup_backup_skills       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_agent_cleanup_backup_definitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_agent_cleanup_backup_resources    ENABLE ROW LEVEL SECURITY;

-- Document intent for the 3 INFO-level "RLS enabled, no policy" tables that
-- were already in the right state (deny-all to non-service callers).
COMMENT ON TABLE public.app_errors IS
  'Service-role only. Inserted by error-reporter across apps; read by /api/admin/errors via backend (service-role). RLS enabled with no policy = deny-all to anon/authenticated.';
COMMENT ON TABLE public.campaign_retention_cleanup_runs IS
  'Service-role only. Written by pg_cron retention job. RLS enabled with no policy = deny-all to anon/authenticated.';
COMMENT ON TABLE public.media_asset_chunks IS
  'Service-role only. Written by media-indexer; read by search_media_asset_chunks SECURITY DEFINER RPC. RLS enabled with no policy = deny-all direct REST access.';

-- Same intent comment on the newly-RLS-enabled tables.
COMMENT ON TABLE public.billing_health_log IS
  'Service-role only. Written by track-billed-cost / artifacts-legacy; read by admin service. RLS enabled with no policy.';
COMMENT ON TABLE public.billing_health_checks IS
  'Service-role only. Internal billing health probes. RLS enabled with no policy.';
COMMENT ON TABLE public.brain_ops_outbox IS
  'Service-role only. Brain operations work queue (see brain-ops-outbox-dispatcher / -night-janitor). RLS enabled with no policy.';
COMMENT ON TABLE public.ns_brain_lint_results IS
  'Service-role only. Output of brain-library-lint skill. RLS enabled with no policy.';
COMMENT ON TABLE public.system_agent_cleanup_backup_skills IS
  'Rollback snapshot from 20260507135600_system_agent_07_delete_clones. Service-role only. RLS enabled with no policy.';
COMMENT ON TABLE public.system_agent_cleanup_backup_definitions IS
  'Rollback snapshot from 20260507135600_system_agent_07_delete_clones. Service-role only. RLS enabled with no policy.';
COMMENT ON TABLE public.system_agent_cleanup_backup_resources IS
  'Rollback snapshot from 20260507135600_system_agent_07_delete_clones. Service-role only. RLS enabled with no policy.';

-- -----------------------------------------------------------------------------
-- 3. Fix the 4 mis-scoped "service_role" RLS policies. These were created with
--    USING (true) WITH CHECK (true) but applied to PUBLIC role, effectively
--    disabling RLS for everyone (anon + authenticated). Recreate them targeting
--    the service_role role only. Verified all four tables are read exclusively
--    from server-side service-role contexts.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "service_role_all_pending_sends" ON public.email_pending_sends;
CREATE POLICY "service_role_all_pending_sends" ON public.email_pending_sends
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_capabilities" ON public.email_provider_capabilities;
CREATE POLICY "service_role_all_capabilities" ON public.email_provider_capabilities
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_recipes" ON public.email_provider_recipes;
CREATE POLICY "service_role_all_recipes" ON public.email_provider_recipes
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.pending_channel_messages;
CREATE POLICY "Service role full access" ON public.pending_channel_messages
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4. Drop overly-broad public bucket SELECT policies. Buckets remain public=true
--    so getPublicUrl() continues to work for direct file access. We only remove
--    anonymous LIST capability — verified zero callers do .list() on these
--    buckets in apps/web, apps/api, apps/agent-api, apps/mission-worker.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Avatars are publicly readable"          ON storage.objects;
DROP POLICY IF EXISTS "feature_updates_bucket_public_read"     ON storage.objects;
DROP POLICY IF EXISTS "Public read for mission attachments"    ON storage.objects;
DROP POLICY IF EXISTS "skill_assets_bucket_public_read"        ON storage.objects;

-- -----------------------------------------------------------------------------
-- 5. Pin search_path on every public function flagged as mutable
--    (function_search_path_mutable). Hygiene: prevents search_path injection
--    against any session whose search_path was tampered with. Pure metadata
--    change, no behavioral change.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.can_manage_agent(p_agent_key text, p_org_id uuid, p_user_id uuid)                      SET search_path = public, pg_temp;
ALTER FUNCTION public.default_space_item_suggestion_state()                                                  SET search_path = public, pg_temp;
ALTER FUNCTION public.get_channel_unread_counts(p_user_id uuid)                                              SET search_path = public, pg_temp;
ALTER FUNCTION public.get_distinct_contact_countries()                                                       SET search_path = public, pg_temp;
ALTER FUNCTION public.get_distinct_contact_tags()                                                            SET search_path = public, pg_temp;
ALTER FUNCTION public.get_team_overview(p_team_id uuid, p_start timestamp with time zone, p_end timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_brain_counter(p_brain_id uuid, p_field text, p_amount integer)               SET search_path = public, pg_temp;
ALTER FUNCTION public.is_active_org_member_of(p_org_id uuid)                                                 SET search_path = public, pg_temp;
ALTER FUNCTION public.is_agent_team_member(p_team_id uuid)                                                   SET search_path = public, pg_temp;
ALTER FUNCTION public.is_org_campaign(p_campaign_id uuid)                                                    SET search_path = public, pg_temp;
ALTER FUNCTION public.is_org_member(p_org_id uuid)                                                           SET search_path = public, pg_temp;
ALTER FUNCTION public.mission_priority_to_rank(priority_value text)                                          SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_brain_ops_outbox()                                                              SET search_path = public, pg_temp;
ALTER FUNCTION public.preview_segment_contacts(p_filters jsonb)                                              SET search_path = public, pg_temp;
ALTER FUNCTION public.release_space_items_recurrence_lock()                                                  SET search_path = public, pg_temp;
ALTER FUNCTION public.search_integration_capabilities(query_embedding vector, match_count integer, filter_integration_id text, filter_domain text) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_narrative_pages(p_brain_id uuid, p_query_embedding vector, p_match_threshold numeric, p_match_count integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_mission_deliverables_updated_at()                                                  SET search_path = public, pg_temp;
ALTER FUNCTION public.set_social_post_insights_updated_at()                                                  SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_mission_status_to_space_item()                                                    SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_space_item_assignees()                                                            SET search_path = public, pg_temp;
ALTER FUNCTION public.tg_agent_teams_set_updated_at()                                                        SET search_path = public, pg_temp;
ALTER FUNCTION public.tg_sync_management_team_member()                                                       SET search_path = public, pg_temp;
ALTER FUNCTION public.try_acquire_space_items_recurrence_lock()                                              SET search_path = public, pg_temp;
ALTER FUNCTION public.update_campaign_strategy_nodes_timestamp()                                             SET search_path = public, pg_temp;
ALTER FUNCTION public.update_machine_pool_updated_at()                                                       SET search_path = public, pg_temp;
ALTER FUNCTION public.update_project_repos_timestamp()                                                       SET search_path = public, pg_temp;
ALTER FUNCTION public.update_social_posts_timestamp()                                                        SET search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- 6. Lock down SECURITY DEFINER function execution.
--    Three buckets:
--      (a) Trigger functions (return_type=trigger) — never invoked via REST or
--          from RLS policy expressions. Revoke from anon, authenticated, public.
--      (b) RLS helpers + server-only RPCs — keep service_role + authenticated
--          (NestJS user-bound clients run as authenticated; RLS policy
--          expressions also evaluate as the calling role and need EXECUTE).
--          Revoke from anon, public.
--      (c) Anon-by-design (lead capture, signup, page tracking on funnels) —
--          NOT touched. Must remain callable by anon. The lints for these are
--          accepted as intentional public surface.
-- -----------------------------------------------------------------------------

-- (a) Trigger functions: revoke from anon, authenticated, public.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.messages_set_user_id()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_lead_to_contact()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_mission_outbox_priority_rank()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_mission_status_to_space_item()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_sync_management_team_member()        FROM PUBLIC, anon, authenticated;

-- (b) RLS helpers + server-only RPCs: revoke from anon, public. Authenticated
--     stays so RLS policies and authenticated server callers keep working.
REVOKE EXECUTE ON FUNCTION public.billing_agent_spending_org(p_org_id uuid, p_start timestamp with time zone, p_end timestamp with time zone)                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.billing_agent_spending_personal(p_start timestamp with time zone, p_end timestamp with time zone)                          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.billing_usage_analytics_org(p_org_id uuid, p_start timestamp with time zone, p_end timestamp with time zone)               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.billing_usage_analytics_personal(p_start timestamp with time zone, p_end timestamp with time zone)                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_channel(p_channel_id uuid)                                                                                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_agent(p_agent_key text, p_org_id uuid, p_user_id uuid)                                                           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_soft_deleted_campaigns(p_batch_size integer)                                                                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.conversation_effective_level(p_conversation_id uuid, p_user_id uuid)                                                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decay_customer_belief_strength(p_subject_ids text[], p_reinforced_before timestamp with time zone)                          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_dm_channel(p_org_id uuid, p_user_a uuid, p_user_b uuid)                                                                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_ad_analytics(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_ads_budget_sum(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_analytics(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone)      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_contact_source_breakdown(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_contact_stats(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_contacts_timeseries(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_deliverables_by_type(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_email_analytics(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_funnel_dropoff(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_lead_customer_split(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_owner(p_campaign_id uuid)                                                                                      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_sequence_aggregate_stats(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_top_email_row(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_top_funnels(p_campaign_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_limit integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_hub_memories(limit_count integer)                                                                                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_campaign_leaderboard(p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_limit integer)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_space_item_share_access(p_item_id uuid, p_space_id uuid, p_org_id uuid)                                                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_space_write_access(p_space_id uuid, p_org_id uuid)                                                                      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_team_agent_brain_access(p_brain_id uuid, p_min_permission text)                                                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_team_brain_access(p_brain_id uuid, p_min_permission text)                                                               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_team_campaign_access(p_campaign_id uuid, p_min_permission text)                                                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_recalled_count(memory_id uuid)                                                                                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_active_org_member_of(p_org_id uuid)                                                                                      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin()                                                                                                                  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_agent_team_member(p_team_id uuid)                                                                                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_channel_admin(p_channel_id uuid)                                                                                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_channel_member(p_channel_id uuid)                                                                                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin_or_owner(p_org_id uuid)                                                                                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_campaign(p_campaign_id uuid)                                                                                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(p_org_id uuid)                                                                                                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_team_writer(p_org_id uuid)                                                                                           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_system_agent_key(p_agent_key text)                                                                                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_member_of(p_owner_id uuid)                                                                                          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.org_role_for(p_org_id uuid, p_user_id uuid)                                                                                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reconcile_stale_agent_traces()                                                                                              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_space_items_recurrence_lock()                                                                                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_contact_from_customer_avatars(p_contact_id uuid, p_brain_ids uuid[])                                                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_media_asset_chunks(p_asset_id uuid, p_user_id uuid, p_org_id uuid, p_query_embedding text, p_match_count integer, p_min_similarity double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_memories(query_embedding vector, match_threshold double precision, match_count integer, filter_memory_type text, filter_source_type text, filter_project_id uuid, filter_tags text[], min_significance double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_neural_snapshots(query_embedding text, match_count integer)                                                          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.space_view_share_grants_item(p_space_id uuid, p_item_id uuid, p_min_level text)                                             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.try_acquire_space_items_recurrence_lock()                                                                                   FROM PUBLIC, anon;

-- (c) Anon-by-design: NOT touched.
--     - public.create_lead_secure(...)              -- funnel lead capture
--     - public.ingest_lead(...)                     -- legacy funnel lead capture
--     - public.record_page_view_secure(...)         -- both overloads, funnel page tracking
--     - public.redeem_invite_code(...)              -- signup flow

COMMIT;
