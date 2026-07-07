-- ============================================================
-- Honor canonical share level in team_space_items RLS.
-- Previously: any org member with role >= editor could write any
-- team-visibility space_item in their org (baseline only).
-- Now: org viewers can also write iff they have an explicit
-- space_shares row with level IN ('edit','admin') for that space.
-- This implements the "max wins" model at the DB layer:
--   write_allowed = (org_role >= editor) OR (share_level >= edit)
-- Per-view shares (space_view_shares) DO NOT grant item writes —
-- they grant view-scoped read/edit only and are checked elsewhere.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.has_space_write_access(p_space_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    -- Baseline: org role editor or higher.
    EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = p_org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('editor', 'creator', 'admin', 'owner')
    )
    OR
    -- Upgrade: explicit user-level share with edit/admin.
    EXISTS (
      SELECT 1
      FROM public.space_shares ss
      WHERE ss.space_id = p_space_id
        AND ss.entity_type = 'user'
        AND ss.entity_id = auth.uid()
        AND ss.level IN ('edit', 'admin')
    )
    OR
    -- Upgrade: explicit org-level share with edit/admin (covers org viewers in the org).
    EXISTS (
      SELECT 1
      FROM public.space_shares ss
      WHERE ss.space_id = p_space_id
        AND ss.entity_type = 'org'
        AND ss.org_id = p_org_id
        AND ss.entity_id = p_org_id
        AND ss.level IN ('edit', 'admin')
    )
$$;

DROP POLICY IF EXISTS "Org writers can insert team space items" ON public.space_items;
DROP POLICY IF EXISTS "Org writers can update team space items" ON public.space_items;
DROP POLICY IF EXISTS "Org writers can delete team space items" ON public.space_items;

CREATE POLICY "Team space items insert via share-aware writer"
ON public.space_items
FOR INSERT
WITH CHECK (
  org_id IS NOT NULL
  AND has_space_write_access(space_id, org_id)
  AND EXISTS (
    SELECT 1
    FROM public.spaces s
    WHERE s.id = space_items.space_id
      AND s.visibility = 'team'
      AND s.org_id = space_items.org_id
  )
);

CREATE POLICY "Team space items update via share-aware writer"
ON public.space_items
FOR UPDATE
USING (
  org_id IS NOT NULL
  AND has_space_write_access(space_id, org_id)
  AND EXISTS (
    SELECT 1
    FROM public.spaces s
    WHERE s.id = space_items.space_id
      AND s.visibility = 'team'
      AND s.org_id = space_items.org_id
  )
)
WITH CHECK (
  org_id IS NOT NULL
  AND has_space_write_access(space_id, org_id)
  AND EXISTS (
    SELECT 1
    FROM public.spaces s
    WHERE s.id = space_items.space_id
      AND s.visibility = 'team'
      AND s.org_id = space_items.org_id
  )
);

CREATE POLICY "Team space items delete via share-aware writer"
ON public.space_items
FOR DELETE
USING (
  org_id IS NOT NULL
  AND has_space_write_access(space_id, org_id)
  AND EXISTS (
    SELECT 1
    FROM public.spaces s
    WHERE s.id = space_items.space_id
      AND s.visibility = 'team'
      AND s.org_id = space_items.org_id
  )
);

COMMIT;
