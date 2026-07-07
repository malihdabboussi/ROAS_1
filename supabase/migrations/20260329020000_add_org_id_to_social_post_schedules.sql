-- Add org_id to social_post_schedules for org-scoped scheduling
ALTER TABLE public.social_post_schedules ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_social_post_schedules_org ON public.social_post_schedules(org_id) WHERE org_id IS NOT NULL;

-- Add missing index on social_posts.org_id (was omitted from 20260327100001)
CREATE INDEX IF NOT EXISTS idx_social_posts_org ON public.social_posts(org_id) WHERE org_id IS NOT NULL;

-- Org RLS policies for social_post_schedules (table already has RLS enabled + personal policy)
CREATE POLICY "Org members can read org social_post_schedules"
  ON public.social_post_schedules FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE POLICY "Org members can write org social_post_schedules"
  ON public.social_post_schedules FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));
