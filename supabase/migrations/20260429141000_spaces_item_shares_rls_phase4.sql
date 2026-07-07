BEGIN;

-- Keep team-space reads for non-private items, but enforce item privacy.
DROP POLICY IF EXISTS "Org members can read team space items" ON public.space_items;
CREATE POLICY "Org members can read team space items"
  ON public.space_items FOR SELECT TO public
  USING (
    public.space_items.is_private = false
    AND public.space_items.org_id IS NOT NULL
    AND is_org_member(public.space_items.org_id)
    AND EXISTS (
      SELECT 1
      FROM public.spaces s
      WHERE s.id = public.space_items.space_id
        AND s.visibility = 'team'
    )
  );

-- Item-level share reads (direct item or inherited from shared ancestors).
DROP POLICY IF EXISTS "Users can read shared space items" ON public.space_items;
CREATE POLICY "Users can read shared space items"
  ON public.space_items FOR SELECT TO public
  USING (
    EXISTS (
      WITH RECURSIVE item_ancestry AS (
        SELECT si.id, si.parent_item_id, true AS is_self
        FROM public.space_items si
        WHERE si.id = public.space_items.id
        UNION ALL
        SELECT parent.id, parent.parent_item_id, false
        FROM public.space_items parent
        JOIN item_ancestry ancestry ON ancestry.parent_item_id = parent.id
      )
      SELECT 1
      FROM item_ancestry ancestry
      JOIN public.space_item_shares sis
        ON sis.item_id = ancestry.id
       AND sis.space_id = public.space_items.space_id
      WHERE (ancestry.is_self OR sis.inherit_to_children = true)
        AND (
          (sis.entity_type = 'user' AND sis.entity_id = auth.uid())
          OR (
            sis.entity_type = 'org'
            AND public.space_items.org_id IS NOT NULL
            AND sis.entity_id = public.space_items.org_id
            AND is_org_member(public.space_items.org_id)
          )
        )
    )
  );

COMMIT;
