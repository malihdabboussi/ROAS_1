-- Add team-write RLS policies for space_items so that any active org member
-- with a write-eligible role (editor, creator, admin, owner) can insert,
-- update, and delete space_items inside spaces with visibility='team' that
-- belong to their org. Mirrors the API ORG_BASELINE_LEVEL mapping in
-- apps/api/src/modules/spaces/services/space-permissions.service.ts.

CREATE OR REPLACE FUNCTION public.is_org_team_writer(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('editor', 'creator', 'admin', 'owner')
  )
$$;

CREATE POLICY "Org writers can insert team space items"
ON public.space_items
FOR INSERT
WITH CHECK (
  org_id IS NOT NULL
  AND is_org_team_writer(org_id)
  AND EXISTS (
    SELECT 1
    FROM public.spaces s
    WHERE s.id = space_items.space_id
      AND s.visibility = 'team'
      AND s.org_id = space_items.org_id
  )
);

CREATE POLICY "Org writers can update team space items"
ON public.space_items
FOR UPDATE
USING (
  org_id IS NOT NULL
  AND is_org_team_writer(org_id)
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
  AND is_org_team_writer(org_id)
  AND EXISTS (
    SELECT 1
    FROM public.spaces s
    WHERE s.id = space_items.space_id
      AND s.visibility = 'team'
      AND s.org_id = space_items.org_id
  )
);

CREATE POLICY "Org writers can delete team space items"
ON public.space_items
FOR DELETE
USING (
  org_id IS NOT NULL
  AND is_org_team_writer(org_id)
  AND EXISTS (
    SELECT 1
    FROM public.spaces s
    WHERE s.id = space_items.space_id
      AND s.visibility = 'team'
      AND s.org_id = space_items.org_id
  )
);
