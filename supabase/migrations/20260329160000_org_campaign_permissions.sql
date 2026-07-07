-- ============================================================
-- ORG CAMPAIGN PERMISSIONS
-- Replaces team_campaign_permissions with org-aware table
-- referencing org_members instead of team_members.
-- ============================================================

CREATE TABLE public.org_campaign_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_member_id   UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  campaign_id     UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  permission      TEXT NOT NULL DEFAULT 'view'
                  CHECK (permission IN ('view', 'edit')),
  granted_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_member_id, campaign_id)
);

CREATE INDEX idx_org_campaign_perms_member ON public.org_campaign_permissions(org_member_id);
CREATE INDEX idx_org_campaign_perms_campaign ON public.org_campaign_permissions(campaign_id);

ALTER TABLE public.org_campaign_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage campaign permissions"
  ON public.org_campaign_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = (
        SELECT om2.org_id FROM public.org_members om2
        WHERE om2.id = org_campaign_permissions.org_member_id
      )
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members can read own campaign permissions"
  ON public.org_campaign_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.id = org_campaign_permissions.org_member_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access org_campaign_permissions"
  ON public.org_campaign_permissions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Migrate existing data from team_campaign_permissions
INSERT INTO public.org_campaign_permissions (org_member_id, campaign_id, permission, granted_by, created_at)
SELECT
  om.id,
  tcp.campaign_id,
  tcp.permission,
  tcp.granted_by,
  tcp.created_at
FROM public.team_campaign_permissions tcp
JOIN public.team_members tm ON tm.id = tcp.team_member_id
JOIN public.org_members om ON om.user_id = tm.user_id
  AND om.org_id = (
    SELECT o.id FROM public.organizations o WHERE o.owner_id = tm.owner_id LIMIT 1
  )
ON CONFLICT (org_member_id, campaign_id) DO NOTHING;
