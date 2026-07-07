BEGIN;

CREATE OR REPLACE FUNCTION public.has_space_item_share_access(
  p_item_id UUID,
  p_space_id UUID,
  p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE item_ancestry AS (
    SELECT si.id, si.parent_item_id, true AS is_self
    FROM public.space_items si
    WHERE si.id = p_item_id
    UNION ALL
    SELECT parent.id, parent.parent_item_id, false
    FROM public.space_items parent
    JOIN item_ancestry ancestry ON ancestry.parent_item_id = parent.id
  )
  SELECT EXISTS (
    SELECT 1
    FROM item_ancestry ancestry
    JOIN public.space_item_shares sis
      ON sis.item_id = ancestry.id
     AND sis.space_id = p_space_id
    WHERE (ancestry.is_self OR sis.inherit_to_children = true)
      AND (
        (sis.entity_type = 'user' AND sis.entity_id = auth.uid())
        OR (
          sis.entity_type = 'org'
          AND p_org_id IS NOT NULL
          AND sis.entity_id = p_org_id
          AND public.is_org_member(p_org_id)
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Users can read shared space items" ON public.space_items;
CREATE POLICY "Users can read shared space items"
  ON public.space_items FOR SELECT TO public
  USING (
    public.has_space_item_share_access(
      public.space_items.id,
      public.space_items.space_id,
      public.space_items.org_id
    )
  );

COMMIT;
