BEGIN;

ALTER TABLE public.space_shares
  ADD COLUMN IF NOT EXISTS allowed_view_ids TEXT[];

-- Internal space shares need RLS read access to the shared space row itself.
DROP POLICY IF EXISTS "Users can read shared spaces" ON public.spaces;
CREATE POLICY "Users can read shared spaces"
  ON public.spaces FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.space_shares ss
      WHERE ss.space_id = public.spaces.id
        AND (
          (ss.entity_type = 'user' AND ss.entity_id = auth.uid())
          OR (
            ss.entity_type = 'org'
            AND public.spaces.org_id IS NOT NULL
            AND ss.entity_id = public.spaces.org_id
            AND public.is_org_member(public.spaces.org_id)
          )
        )
    )
  );

-- A space share grants read access to non-private items in that space.
DROP POLICY IF EXISTS "Users can read space-shared items" ON public.space_items;
CREATE POLICY "Users can read space-shared items"
  ON public.space_items FOR SELECT TO public
  USING (
    public.space_items.is_private = false
    AND EXISTS (
      SELECT 1
      FROM public.space_shares ss
      WHERE ss.space_id = public.space_items.space_id
        AND (
          (ss.entity_type = 'user' AND ss.entity_id = auth.uid())
          OR (
            ss.entity_type = 'org'
            AND public.space_items.org_id IS NOT NULL
            AND ss.entity_id = public.space_items.org_id
            AND public.is_org_member(public.space_items.org_id)
          )
        )
    )
  );

COMMIT;
