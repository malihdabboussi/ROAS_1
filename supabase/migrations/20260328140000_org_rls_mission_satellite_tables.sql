-- Add org-isolation RLS policies to mission satellite tables and user notifications
-- These tables already have org_id columns but were missing org-scoped RLS policies

-- mission_subtasks
CREATE POLICY "Org members can read org mission_subtasks"
  ON public.mission_subtasks FOR SELECT TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));
CREATE POLICY "Org members can write org mission_subtasks"
  ON public.mission_subtasks FOR ALL TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));

-- missions_plans
CREATE POLICY "Org members can read org missions_plans"
  ON public.missions_plans FOR SELECT TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));
CREATE POLICY "Org members can write org missions_plans"
  ON public.missions_plans FOR ALL TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));

-- missions_logs
CREATE POLICY "Org members can read org missions_logs"
  ON public.missions_logs FOR SELECT TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));
CREATE POLICY "Org members can write org missions_logs"
  ON public.missions_logs FOR ALL TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));

-- mission_deliverables
CREATE POLICY "Org members can read org mission_deliverables"
  ON public.mission_deliverables FOR SELECT TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));
CREATE POLICY "Org members can write org mission_deliverables"
  ON public.mission_deliverables FOR ALL TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));

-- mission_outbox
CREATE POLICY "Org members can read org mission_outbox"
  ON public.mission_outbox FOR SELECT TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));
CREATE POLICY "Org members can write org mission_outbox"
  ON public.mission_outbox FOR ALL TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));

-- agent_awareness_points
CREATE POLICY "Org members can read org agent_awareness_points"
  ON public.agent_awareness_points FOR SELECT TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));
CREATE POLICY "Org members can write org agent_awareness_points"
  ON public.agent_awareness_points FOR ALL TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));

-- user_notifications
CREATE POLICY "Org members can read org user_notifications"
  ON public.user_notifications FOR SELECT TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));
CREATE POLICY "Org members can write org user_notifications"
  ON public.user_notifications FOR ALL TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));
