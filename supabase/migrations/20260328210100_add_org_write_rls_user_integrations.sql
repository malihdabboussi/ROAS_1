-- ============================================================
-- ADD WRITE RLS FOR ORG MEMBERS ON user_integrations
-- Existing policy is SELECT-only; org admins need INSERT/UPDATE/DELETE
-- ============================================================

CREATE POLICY "Org members can write org integrations"
  ON public.user_integrations FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));
