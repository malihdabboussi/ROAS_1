-- Favorite folders for social research: users organize favorited posts into
-- named folders (sidebar "Favorites" section). Membership lives on the item
-- itself (space_items.custom_data.favorite_folder_ids uuid[]), so this table
-- only stores the folder identity — counts and contents are derived from the
-- items already loaded with the space.

CREATE TABLE IF NOT EXISTS public.space_favorite_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_space_favorite_folders_space
  ON public.space_favorite_folders (space_id, created_at ASC);

ALTER TABLE public.space_favorite_folders ENABLE ROW LEVEL SECURITY;

-- Same access shape as space_topic_searches: owner, team-visible org spaces,
-- and explicit space shares.
DROP POLICY IF EXISTS space_favorite_folders_select ON public.space_favorite_folders;
CREATE POLICY space_favorite_folders_select
  ON public.space_favorite_folders FOR SELECT TO authenticated
  USING (
    (auth.uid() = user_id)
    OR (org_id IS NOT NULL AND is_org_member(org_id) AND EXISTS (
      SELECT 1 FROM public.spaces s
      WHERE s.id = space_favorite_folders.space_id
        AND s.visibility = 'team'
        AND s.org_id = space_favorite_folders.org_id
    ))
    OR EXISTS (
      SELECT 1 FROM public.space_shares ss
      WHERE ss.space_id = space_favorite_folders.space_id
        AND (
          (ss.entity_type = 'user' AND ss.entity_id = auth.uid())
          OR (
            ss.entity_type = 'org'
            AND space_favorite_folders.org_id IS NOT NULL
            AND ss.entity_id = space_favorite_folders.org_id
            AND is_org_member(space_favorite_folders.org_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS space_favorite_folders_write ON public.space_favorite_folders;
CREATE POLICY space_favorite_folders_write
  ON public.space_favorite_folders FOR ALL TO authenticated
  USING (
    (auth.uid() = user_id)
    OR (
      org_id IS NOT NULL
      AND has_space_write_access(space_id, org_id)
      AND EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = space_favorite_folders.space_id
          AND s.visibility = 'team'
          AND s.org_id = space_favorite_folders.org_id
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
        WHERE s.id = space_favorite_folders.space_id
          AND s.visibility = 'team'
          AND s.org_id = space_favorite_folders.org_id
      )
    )
  );
