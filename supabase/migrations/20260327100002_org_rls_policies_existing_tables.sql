-- ============================================================
-- ORG RLS POLICIES FOR EXISTING TABLES
-- Adds org member read/write access alongside existing personal policies.
-- Existing personal policies stay untouched.
-- Role-level enforcement (editor vs creator vs admin) is at the API layer.
-- RLS only verifies active org membership.
-- ============================================================

-- Helper function: check if user is active org member
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
$$;

-- ============================================================
-- CAMPAIGN ECOSYSTEM
-- ============================================================

CREATE POLICY "Org members can read org campaigns"
  ON public.campaigns FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org campaigns"
  ON public.campaigns FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org offers"
  ON public.offers FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org offers"
  ON public.offers FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org avatars"
  ON public.avatars FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org avatars"
  ON public.avatars FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org presentations"
  ON public.presentations FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org presentations"
  ON public.presentations FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org funnels"
  ON public.funnels FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org funnels"
  ON public.funnels FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org sequences"
  ON public.sequences FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org sequences"
  ON public.sequences FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org conversations"
  ON public.conversations FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org missions"
  ON public.missions FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org missions"
  ON public.missions FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org social_posts"
  ON public.social_posts FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org social_posts"
  ON public.social_posts FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org blog_posts"
  ON public.blog_posts FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org blog_posts"
  ON public.blog_posts FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org ad_campaigns"
  ON public.ad_campaigns FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org ad_campaigns"
  ON public.ad_campaigns FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org leads"
  ON public.leads FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org leads"
  ON public.leads FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org media_assets"
  ON public.media_assets FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org media_assets"
  ON public.media_assets FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

-- ============================================================
-- AGENT ECOSYSTEM
-- ============================================================

CREATE POLICY "Org members can read org agents"
  ON public.agents_registry FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org agents"
  ON public.agents_registry FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org agent_skills"
  ON public.agent_skills FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org agent_skills"
  ON public.agent_skills FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org agent_skill_resources"
  ON public.agent_skill_resources FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org agent_skill_resources"
  ON public.agent_skill_resources FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org agent_definitions"
  ON public.agent_definitions FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org agent_definitions"
  ON public.agent_definitions FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org agent_workflows"
  ON public.agent_workflows FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org agent_channels"
  ON public.agent_channels FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org agent_channels"
  ON public.agent_channels FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

-- ============================================================
-- BRAIN / KNOWLEDGE
-- ============================================================

CREATE POLICY "Org members can read org brains"
  ON public.ns_brains FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org brains"
  ON public.ns_brains FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

-- ============================================================
-- CRM
-- ============================================================

CREATE POLICY "Org members can read org contacts"
  ON public.contacts FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org contacts"
  ON public.contacts FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org contact_tags"
  ON public.contact_tags FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org contact_tags"
  ON public.contact_tags FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org custom_field_defs"
  ON public.contact_custom_field_definitions FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org custom_field_defs"
  ON public.contact_custom_field_definitions FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org segments"
  ON public.segments FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org segments"
  ON public.segments FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

-- ============================================================
-- INFRASTRUCTURE
-- ============================================================

CREATE POLICY "Org members can read org domains"
  ON public.domains FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org domains"
  ON public.domains FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org branding_themes"
  ON public.branding_themes FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org email_domains"
  ON public.email_domains FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org email_domains"
  ON public.email_domains FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org email_sender_identities"
  ON public.email_sender_identities FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org integrations"
  ON public.user_integrations FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org vault_secrets"
  ON public.vault_secrets FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org github_repos"
  ON public.github_repos FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

-- ============================================================
-- WORKSPACE / PROJECTS
-- ============================================================

CREATE POLICY "Org members can read org workspaces"
  ON public.user_workspaces FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org projects"
  ON public.project_repos FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org projects"
  ON public.project_repos FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

-- ============================================================
-- CUSTOM OBJECTS
-- ============================================================

CREATE POLICY "Org members can read org object_types"
  ON public.user_object_types FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org object_records"
  ON public.user_object_records FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

-- ============================================================
-- OBSERVABILITY (read-only for org members)
-- ============================================================

CREATE POLICY "Org members can read org usage events"
  ON public.ai_usage_events FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can read org agent traces"
  ON public.vb_agent_traces FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

-- ============================================================
-- STORAGE: org members can read media files via media_assets.org_id
-- ============================================================

CREATE POLICY "Org members access org media files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media' AND EXISTS (
      SELECT 1 FROM public.media_assets ma
      JOIN public.org_members om ON om.org_id = ma.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
      WHERE ma.file_path = name
        AND ma.org_id IS NOT NULL
    )
  );

CREATE POLICY "Org members access org project files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'projects' AND EXISTS (
      SELECT 1 FROM public.project_repos pr
      JOIN public.org_members om ON om.org_id = pr.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
      WHERE pr.storage_path = (storage.foldername(name))[1] || '/' || (storage.foldername(name))[2]
        AND pr.org_id IS NOT NULL
    )
  );
