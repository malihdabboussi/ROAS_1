-- Phase 2 table 4/10: consolidate mission_subtasks RLS (11 policies -> 5: 4 user + 1 service)
-- Functionally identical: same access (own / assigned-human / org / team-campaign).
-- service_role bypass policy preserved (mission_subtasks_service_all).

DROP POLICY IF EXISTS "Org members can write org mission_subtasks" ON public.mission_subtasks;
DROP POLICY IF EXISTS "mission_subtasks_user_scoped" ON public.mission_subtasks;
DROP POLICY IF EXISTS "team_mission_subtasks_all" ON public.mission_subtasks;
DROP POLICY IF EXISTS "mission_subtasks_user_insert" ON public.mission_subtasks;
DROP POLICY IF EXISTS "Assigned human can read own subtask" ON public.mission_subtasks;
DROP POLICY IF EXISTS "Org members can read org mission_subtasks" ON public.mission_subtasks;
DROP POLICY IF EXISTS "Org members read mission_subtasks via parent mission" ON public.mission_subtasks;
DROP POLICY IF EXISTS "mission_subtasks_user_select" ON public.mission_subtasks;
DROP POLICY IF EXISTS "Assigned human can update own subtask" ON public.mission_subtasks;
DROP POLICY IF EXISTS "mission_subtasks_user_update" ON public.mission_subtasks;

CREATE POLICY "mission_subtasks_select" ON public.mission_subtasks
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (assignee_type = 'human' AND assigned_user_id = (SELECT auth.uid()))
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_subtasks.mission_id AND m.org_id IS NOT NULL AND is_org_member(m.org_id))
    OR EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_subtasks.mission_id AND m.campaign_id IS NOT NULL AND has_team_campaign_access(m.campaign_id, 'view'))
  );

CREATE POLICY "mission_subtasks_insert" ON public.mission_subtasks
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_subtasks.mission_id AND m.campaign_id IS NOT NULL AND has_team_campaign_access(m.campaign_id, 'edit'))
  );

CREATE POLICY "mission_subtasks_update" ON public.mission_subtasks
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (assignee_type = 'human' AND assigned_user_id = (SELECT auth.uid()))
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_subtasks.mission_id AND m.campaign_id IS NOT NULL AND has_team_campaign_access(m.campaign_id, 'view'))
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (assignee_type = 'human' AND assigned_user_id = (SELECT auth.uid()))
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_subtasks.mission_id AND m.campaign_id IS NOT NULL AND has_team_campaign_access(m.campaign_id, 'edit'))
  );

CREATE POLICY "mission_subtasks_delete" ON public.mission_subtasks
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR EXISTS (SELECT 1 FROM missions m WHERE m.id = mission_subtasks.mission_id AND m.campaign_id IS NOT NULL AND has_team_campaign_access(m.campaign_id, 'view'))
  );
