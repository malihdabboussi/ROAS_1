-- media_assets.space_id: scope library rows to a Space (denormalized alongside campaign_id/org_id).
-- RLS: extend policies so members who can read a space can SELECT rows linked via space_id (client-side / realtime).
-- API still uses service_role for writes; app-layer validates attach targets.

BEGIN;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_space_created
  ON public.media_assets (space_id, created_at DESC)
  WHERE space_id IS NOT NULL;

-- Best-effort backfill: only when campaign maps to exactly one space
UPDATE public.media_assets ma
SET space_id = s.id
FROM public.spaces s
WHERE ma.space_id IS NULL
  AND ma.campaign_id IS NOT NULL
  AND ma.campaign_id = s.campaign_id
  AND (
    SELECT COUNT(*)::int FROM public.spaces s2 WHERE s2.campaign_id = ma.campaign_id
  ) = 1;

-- Readable space: owner, team org member, or explicit share (matches spaces SELECT patterns)
DROP POLICY IF EXISTS "media_assets_select" ON public.media_assets;
CREATE POLICY "media_assets_select" ON public.media_assets AS PERMISSIVE FOR SELECT TO authenticated
USING (
  (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)))
  OR (
    space_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.spaces sp
      WHERE sp.id = media_assets.space_id
        AND (
          sp.user_id = (SELECT auth.uid())
          OR (
            sp.visibility = 'team'
            AND sp.org_id IS NOT NULL
            AND public.is_org_member(sp.org_id)
          )
          OR EXISTS (
            SELECT 1
            FROM public.space_shares ss
            WHERE ss.space_id = sp.id
              AND (
                ((ss.entity_type = 'user'::text) AND (ss.entity_id = (SELECT auth.uid())))
                OR (
                  (ss.entity_type = 'org'::text)
                  AND (sp.org_id IS NOT NULL)
                  AND (ss.entity_id = sp.org_id)
                  AND public.is_org_member(sp.org_id)
                )
              )
          )
        )
    )
  )
);

DROP POLICY IF EXISTS "media_assets_insert" ON public.media_assets;
CREATE POLICY "media_assets_insert" ON public.media_assets AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)))
  AND (
    space_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.spaces sp
      WHERE sp.id = media_assets.space_id
        AND (
          sp.user_id = (SELECT auth.uid())
          OR (
            sp.visibility = 'team'
            AND sp.org_id IS NOT NULL
            AND public.is_org_member(sp.org_id)
          )
          OR EXISTS (
            SELECT 1
            FROM public.space_shares ss
            WHERE ss.space_id = sp.id
              AND (
                ((ss.entity_type = 'user'::text) AND (ss.entity_id = (SELECT auth.uid())))
                OR (
                  (ss.entity_type = 'org'::text)
                  AND (sp.org_id IS NOT NULL)
                  AND (ss.entity_id = sp.org_id)
                  AND public.is_org_member(sp.org_id)
                )
              )
          )
        )
    )
  )
);

DROP POLICY IF EXISTS "media_assets_update" ON public.media_assets;
CREATE POLICY "media_assets_update" ON public.media_assets AS PERMISSIVE FOR UPDATE TO authenticated
USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)))
WITH CHECK (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

DROP POLICY IF EXISTS "media_assets_delete" ON public.media_assets;
CREATE POLICY "media_assets_delete" ON public.media_assets AS PERMISSIVE FOR DELETE TO authenticated
USING (((SELECT auth.uid()) = user_id) OR ((org_id IS NOT NULL) AND is_org_member(org_id)));

COMMIT;
