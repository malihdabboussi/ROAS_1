-- ROAS social scheduling completion: policies + realtime missed because social_posts
-- did not exist when dependent migrations first ran.

-- Realtime (calendar + schedule views subscribe to social_posts + social_post_schedules)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'social_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'social_post_schedules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_post_schedules;
  END IF;
END $$;

-- Org-scoped access (20260327100002 — failed when table was missing)
DROP POLICY IF EXISTS "Org members can read org social_posts" ON public.social_posts;
CREATE POLICY "Org members can read org social_posts"
  ON public.social_posts FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS "Org members can write org social_posts" ON public.social_posts;
CREATE POLICY "Org members can write org social_posts"
  ON public.social_posts FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

-- Campaign-scoped org permissions (20260401100000 — org_social_posts_all)
DROP POLICY IF EXISTS org_social_posts_all ON public.social_posts;
CREATE POLICY org_social_posts_all ON public.social_posts FOR ALL
  USING (
    campaign_id IS NOT NULL
    AND public.has_org_campaign_access(campaign_id, 'view')
  )
  WITH CHECK (
    campaign_id IS NOT NULL
    AND public.has_org_campaign_access(campaign_id, 'edit')
  );

-- Consolidated schedule policies (20260513144500 perf phase 2 — partial apply)
DROP POLICY IF EXISTS "Org members can write org social_post_schedules" ON public.social_post_schedules;
DROP POLICY IF EXISTS "Users can manage own social post schedules" ON public.social_post_schedules;
DROP POLICY IF EXISTS "Org members can read org social_post_schedules" ON public.social_post_schedules;
DROP POLICY IF EXISTS "social_post_schedules_select" ON public.social_post_schedules;
DROP POLICY IF EXISTS "social_post_schedules_insert" ON public.social_post_schedules;
DROP POLICY IF EXISTS "social_post_schedules_update" ON public.social_post_schedules;
DROP POLICY IF EXISTS "social_post_schedules_delete" ON public.social_post_schedules;

CREATE POLICY "social_post_schedules_select" ON public.social_post_schedules
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );

CREATE POLICY "social_post_schedules_insert" ON public.social_post_schedules
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );

CREATE POLICY "social_post_schedules_update" ON public.social_post_schedules
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );

CREATE POLICY "social_post_schedules_delete" ON public.social_post_schedules
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );

-- Security advisor hardening for trigger function
ALTER FUNCTION public.update_social_posts_timestamp()
  SET search_path = public, pg_temp;
