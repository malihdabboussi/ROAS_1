-- ============================================================
-- ADD org_id TO campaign_integration_connections
-- + org-aware RLS so all org members can see/manage campaign connections
-- ============================================================

ALTER TABLE public.campaign_integration_connections
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_campaign_integration_connections_org
  ON public.campaign_integration_connections(org_id)
  WHERE org_id IS NOT NULL;

CREATE POLICY "Org members can read org campaign integration connections"
  ON public.campaign_integration_connections FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org campaign integration connections"
  ON public.campaign_integration_connections FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));
