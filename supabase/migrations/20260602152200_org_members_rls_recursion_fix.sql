-- Fix org onboarding/org creation RLS recursion.
--
-- Root cause:
-- - org_members INSERT/UPDATE/DELETE policies queried organizations.
-- - organizations SELECT policy queried org_members.
-- - creating a new org inserted organizations first, then org_members, and the
--   owner membership insert could recurse through those policies.

CREATE OR REPLACE FUNCTION public.is_org_owner_of(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = p_org_id
      AND o.owner_id = auth.uid()
      AND o.status = 'active'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_org_owner_of(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_org_owner_of(uuid) TO authenticated;

DROP POLICY IF EXISTS "Org members can read org" ON public.organizations;
CREATE POLICY "Org members can read org" ON public.organizations
  AS PERMISSIVE FOR SELECT TO public
  USING (
    owner_id = (SELECT auth.uid())
    OR public.is_active_org_member_of(id)
  );

DROP POLICY IF EXISTS "org_members_insert" ON public.org_members;
CREATE POLICY "org_members_insert" ON public.org_members
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_org_owner_of(org_id));

DROP POLICY IF EXISTS "org_members_update" ON public.org_members;
CREATE POLICY "org_members_update" ON public.org_members
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.is_org_owner_of(org_id))
  WITH CHECK (public.is_org_owner_of(org_id));

DROP POLICY IF EXISTS "org_members_delete" ON public.org_members;
CREATE POLICY "org_members_delete" ON public.org_members
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.is_org_owner_of(org_id));

INSERT INTO public.org_members (org_id, user_id, role, status, invited_by, accepted_at)
SELECT o.id, o.owner_id, 'owner', 'active', NULL, now()
FROM public.organizations o
WHERE o.status = 'active'
  AND o.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.org_members om
    WHERE om.org_id = o.id
      AND om.user_id = o.owner_id
      AND om.status = 'active'
  )
ON CONFLICT (org_id, user_id) DO UPDATE
SET role = 'owner',
    status = 'active',
    accepted_at = COALESCE(public.org_members.accepted_at, excluded.accepted_at);
