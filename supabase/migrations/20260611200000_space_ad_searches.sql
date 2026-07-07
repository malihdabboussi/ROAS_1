-- Saved ad searches: frozen snapshots of ad-library research (Meta Ad Library,
-- TikTok Ads Library, Google Ads Transparency Center via SearchAPI.io).
-- Each row stores the full result payload so reopening a saved search renders
-- instantly with zero SearchAPI calls; a refresh re-runs the search server-side
-- and replaces the snapshot. Sibling of space_topic_searches — kept separate
-- because ad results, platforms, and search kinds (topic vs brand) don't share
-- the social research row format.

CREATE TABLE IF NOT EXISTS public.space_ad_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('meta', 'tiktok', 'google')),
  -- 'topic' = keyword search over ad content; 'brand' = all ads from one
  -- advertiser. Google has no keyword search upstream, so google rows are
  -- always 'brand' (enforced in the API service, not here).
  kind text NOT NULL CHECK (kind IN ('topic', 'brand')),
  title text NOT NULL,
  query text NOT NULL,
  -- Brand searches: { id, name, image_url, platform_ref } advertiser reference.
  advertiser jsonb,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_count integer NOT NULL DEFAULT 0,
  next_page_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_run_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_ad_searches_space
  ON public.space_ad_searches (space_id, created_at DESC);

ALTER TABLE public.space_ad_searches ENABLE ROW LEVEL SECURITY;

-- Same access shape as space_topic_searches: owner, team-visible org spaces,
-- and explicit space shares.
DROP POLICY IF EXISTS space_ad_searches_select ON public.space_ad_searches;
CREATE POLICY space_ad_searches_select
  ON public.space_ad_searches FOR SELECT TO authenticated
  USING (
    (auth.uid() = user_id)
    OR (org_id IS NOT NULL AND is_org_member(org_id) AND EXISTS (
      SELECT 1 FROM public.spaces s
      WHERE s.id = space_ad_searches.space_id
        AND s.visibility = 'team'
        AND s.org_id = space_ad_searches.org_id
    ))
    OR EXISTS (
      SELECT 1 FROM public.space_shares ss
      WHERE ss.space_id = space_ad_searches.space_id
        AND (
          (ss.entity_type = 'user' AND ss.entity_id = auth.uid())
          OR (
            ss.entity_type = 'org'
            AND space_ad_searches.org_id IS NOT NULL
            AND ss.entity_id = space_ad_searches.org_id
            AND is_org_member(space_ad_searches.org_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS space_ad_searches_write ON public.space_ad_searches;
CREATE POLICY space_ad_searches_write
  ON public.space_ad_searches FOR ALL TO authenticated
  USING (
    (auth.uid() = user_id)
    OR (
      org_id IS NOT NULL
      AND has_space_write_access(space_id, org_id)
      AND EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = space_ad_searches.space_id
          AND s.visibility = 'team'
          AND s.org_id = space_ad_searches.org_id
      )
    )
  )
  WITH CHECK (
    (auth.uid() = user_id)
    OR (
      org_id IS NOT NULL
      AND has_space_write_access(space_id, org_id)
      AND EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = space_ad_searches.space_id
          AND s.visibility = 'team'
          AND s.org_id = space_ad_searches.org_id
      )
    )
  );
