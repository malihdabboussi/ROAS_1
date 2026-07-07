-- Saved topic searches: frozen snapshots of social keyword research
-- (1of10-style). Each row stores the full result payload so reopening a saved
-- search renders instantly with zero ScrapeCreators calls; a refresh re-runs
-- the search server-side and replaces the snapshot.
-- Results live here instead of the space schema view config because snapshots
-- run 30-100KB — putting them on the space row would bloat every space load.

CREATE TABLE IF NOT EXISTS public.space_topic_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  title text NOT NULL,
  query text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_count integer NOT NULL DEFAULT 0,
  next_cursor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_run_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_topic_searches_space
  ON public.space_topic_searches (space_id, created_at DESC);

ALTER TABLE public.space_topic_searches ENABLE ROW LEVEL SECURITY;

-- Same access shape as space_semantic_objects: owner, team-visible org spaces,
-- and explicit space shares.
DROP POLICY IF EXISTS space_topic_searches_select ON public.space_topic_searches;
CREATE POLICY space_topic_searches_select
  ON public.space_topic_searches FOR SELECT TO authenticated
  USING (
    (auth.uid() = user_id)
    OR (org_id IS NOT NULL AND is_org_member(org_id) AND EXISTS (
      SELECT 1 FROM public.spaces s
      WHERE s.id = space_topic_searches.space_id
        AND s.visibility = 'team'
        AND s.org_id = space_topic_searches.org_id
    ))
    OR EXISTS (
      SELECT 1 FROM public.space_shares ss
      WHERE ss.space_id = space_topic_searches.space_id
        AND (
          (ss.entity_type = 'user' AND ss.entity_id = auth.uid())
          OR (
            ss.entity_type = 'org'
            AND space_topic_searches.org_id IS NOT NULL
            AND ss.entity_id = space_topic_searches.org_id
            AND is_org_member(space_topic_searches.org_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS space_topic_searches_write ON public.space_topic_searches;
CREATE POLICY space_topic_searches_write
  ON public.space_topic_searches FOR ALL TO authenticated
  USING (
    (auth.uid() = user_id)
    OR (
      org_id IS NOT NULL
      AND has_space_write_access(space_id, org_id)
      AND EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = space_topic_searches.space_id
          AND s.visibility = 'team'
          AND s.org_id = space_topic_searches.org_id
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
        WHERE s.id = space_topic_searches.space_id
          AND s.visibility = 'team'
          AND s.org_id = space_topic_searches.org_id
      )
    )
  );
