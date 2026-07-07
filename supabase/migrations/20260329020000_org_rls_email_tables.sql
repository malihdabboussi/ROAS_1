-- Org-aware RLS policies for email tables that have org_id but only user_id-based policies

-- email_sends
CREATE POLICY "Org members can read org email_sends"
  ON public.email_sends FOR SELECT
  USING (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can write org email_sends"
  ON public.email_sends FOR ALL
  USING (org_id IS NOT NULL AND is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

-- email_single_schedules
CREATE POLICY "Org members can read org email_single_schedules"
  ON public.email_single_schedules FOR SELECT
  USING (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can write org email_single_schedules"
  ON public.email_single_schedules FOR ALL
  USING (org_id IS NOT NULL AND is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

-- email_broadcast_schedules
CREATE POLICY "Org members can read org email_broadcast_schedules"
  ON public.email_broadcast_schedules FOR SELECT
  USING (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can write org email_broadcast_schedules"
  ON public.email_broadcast_schedules FOR ALL
  USING (org_id IS NOT NULL AND is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

-- email_suppressions
CREATE POLICY "Org members can read org email_suppressions"
  ON public.email_suppressions FOR SELECT
  USING (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can write org email_suppressions"
  ON public.email_suppressions FOR ALL
  USING (org_id IS NOT NULL AND is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

-- sequence_email_sends
CREATE POLICY "Org members can read org sequence_email_sends"
  ON public.sequence_email_sends FOR SELECT
  USING (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can write org sequence_email_sends"
  ON public.sequence_email_sends FOR ALL
  USING (org_id IS NOT NULL AND is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

-- email_pending_sends
CREATE POLICY "Org members can read org email_pending_sends"
  ON public.email_pending_sends FOR SELECT
  USING (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can write org email_pending_sends"
  ON public.email_pending_sends FOR ALL
  USING (org_id IS NOT NULL AND is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));

-- broadcast_email_sends (uses join to schedule for user check, but adding direct org policy)
CREATE POLICY "Org members can read org broadcast_email_sends"
  ON public.broadcast_email_sends FOR SELECT
  USING (org_id IS NOT NULL AND is_org_member(org_id));

CREATE POLICY "Org members can write org broadcast_email_sends"
  ON public.broadcast_email_sends FOR ALL
  USING (org_id IS NOT NULL AND is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND is_org_member(org_id));
