-- Add org-level INSERT, UPDATE, DELETE RLS policies for branding_themes.
-- The SELECT policy was added in 20260327100002; write policies were missing.

CREATE POLICY "Org members can insert org branding_themes"
  ON public.branding_themes FOR INSERT
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id) AND is_system = false);

CREATE POLICY "Org members can update org branding_themes"
  ON public.branding_themes FOR UPDATE
  USING (org_id IS NOT NULL AND public.is_org_member(org_id) AND is_system = false)
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id) AND is_system = false);

CREATE POLICY "Org members can delete org branding_themes"
  ON public.branding_themes FOR DELETE
  USING (org_id IS NOT NULL AND public.is_org_member(org_id) AND is_system = false);
