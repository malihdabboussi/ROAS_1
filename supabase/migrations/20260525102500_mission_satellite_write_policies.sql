BEGIN;

CREATE POLICY "Org members can insert org missions_logs"
  ON public.missions_logs FOR INSERT TO public
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can update org missions_logs"
  ON public.missions_logs FOR UPDATE TO public
  USING (org_id IS NOT NULL AND is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can insert org missions_plans"
  ON public.missions_plans FOR INSERT TO public
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can update org missions_plans"
  ON public.missions_plans FOR UPDATE TO public
  USING (org_id IS NOT NULL AND is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can insert org mission_subtasks"
  ON public.mission_subtasks FOR INSERT TO public
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can update org mission_subtasks"
  ON public.mission_subtasks FOR UPDATE TO public
  USING (org_id IS NOT NULL AND is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can insert org mission_deliverables"
  ON public.mission_deliverables FOR INSERT TO public
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can update org mission_deliverables"
  ON public.mission_deliverables FOR UPDATE TO public
  USING (org_id IS NOT NULL AND is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

COMMIT;
