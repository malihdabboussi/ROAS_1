-- Phase 2 table 1/10: consolidate space_items RLS (13 policies -> 4)
-- Functionally identical: same items visible, same edit permissions.
-- Eliminates ~24 multiple_permissive_policies lints on this table.
--
-- Visibility rules (SELECT):
--   1. Owner (user_id match)
--   2. Org member of a team-visibility space (non-private items only)
--   3. Space-level share to user or org (non-private only)
--   4. Per-view granular share (non-private only)
--   5. Per-item granular share
--
-- Write rules (INSERT/UPDATE/DELETE):
--   1. Owner
--   2. Org member with write access on team space
--   3. Per-view edit grant (UPDATE/DELETE only, non-private)

DROP POLICY IF EXISTS "Users can read own space items" ON public.space_items;
DROP POLICY IF EXISTS "Org members can read team space items" ON public.space_items;
DROP POLICY IF EXISTS "Users can read space-shared items" ON public.space_items;
DROP POLICY IF EXISTS "Per-view share read" ON public.space_items;
DROP POLICY IF EXISTS "Users can read shared space items" ON public.space_items;
DROP POLICY IF EXISTS "Users can insert own space items" ON public.space_items;
DROP POLICY IF EXISTS "Team space items insert via share-aware writer" ON public.space_items;
DROP POLICY IF EXISTS "Users can update own space items" ON public.space_items;
DROP POLICY IF EXISTS "Team space items update via share-aware writer" ON public.space_items;
DROP POLICY IF EXISTS "Per-view share update" ON public.space_items;
DROP POLICY IF EXISTS "Users can delete own space items" ON public.space_items;
DROP POLICY IF EXISTS "Team space items delete via share-aware writer" ON public.space_items;
DROP POLICY IF EXISTS "Per-view share delete" ON public.space_items;

CREATE POLICY "space_items_select" ON public.space_items
  AS PERMISSIVE FOR SELECT TO public
  USING (
    ((SELECT auth.uid()) = user_id)
    OR (is_private = false AND org_id IS NOT NULL AND is_org_member(org_id) AND EXISTS (
      SELECT 1 FROM spaces s WHERE s.id = space_items.space_id AND s.visibility = 'team'
    ))
    OR (is_private = false AND EXISTS (
      SELECT 1 FROM space_shares ss
      WHERE ss.space_id = space_items.space_id
        AND ((ss.entity_type = 'user' AND ss.entity_id = (SELECT auth.uid()))
          OR (ss.entity_type = 'org' AND space_items.org_id IS NOT NULL
              AND ss.entity_id = space_items.org_id AND is_org_member(space_items.org_id)))
    ))
    OR (is_private = false AND space_view_share_grants_item(space_id, id, 'view'))
    OR has_space_item_share_access(id, space_id, org_id)
  );

CREATE POLICY "space_items_insert" ON public.space_items
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    OR (org_id IS NOT NULL AND has_space_write_access(space_id, org_id) AND EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_items.space_id AND s.visibility = 'team' AND s.org_id = space_items.org_id
    ))
  );

CREATE POLICY "space_items_update" ON public.space_items
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    ((SELECT auth.uid()) = user_id)
    OR (org_id IS NOT NULL AND has_space_write_access(space_id, org_id) AND EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_items.space_id AND s.visibility = 'team' AND s.org_id = space_items.org_id
    ))
    OR (is_private = false AND space_view_share_grants_item(space_id, id, 'edit'))
  )
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    OR (org_id IS NOT NULL AND has_space_write_access(space_id, org_id) AND EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_items.space_id AND s.visibility = 'team' AND s.org_id = space_items.org_id
    ))
    OR (is_private = false AND space_view_share_grants_item(space_id, id, 'edit'))
  );

CREATE POLICY "space_items_delete" ON public.space_items
  AS PERMISSIVE FOR DELETE TO public
  USING (
    ((SELECT auth.uid()) = user_id)
    OR (org_id IS NOT NULL AND has_space_write_access(space_id, org_id) AND EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_items.space_id AND s.visibility = 'team' AND s.org_id = space_items.org_id
    ))
    OR (is_private = false AND space_view_share_grants_item(space_id, id, 'edit'))
  );
