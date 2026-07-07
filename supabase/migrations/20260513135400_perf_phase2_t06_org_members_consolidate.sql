-- Phase 2 table 6/10: consolidate org_members RLS (6 policies -> 5)
-- Functionally identical: read own + co-members; only owner manages members.
-- Service-role bypass preserved (cleaner: TO service_role instead of predicate).

DROP POLICY IF EXISTS "Service role full access org_members" ON public.org_members;
DROP POLICY IF EXISTS "Org owner can delete members" ON public.org_members;
DROP POLICY IF EXISTS "Org owner can add members" ON public.org_members;
DROP POLICY IF EXISTS "Members can read co-members in same org" ON public.org_members;
DROP POLICY IF EXISTS "Members can read own membership" ON public.org_members;
DROP POLICY IF EXISTS "Org owner can update members" ON public.org_members;

CREATE POLICY "org_members_service_all" ON public.org_members
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "org_members_select" ON public.org_members
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_active_org_member_of(org_id)
  );

CREATE POLICY "org_members_insert" ON public.org_members
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM organizations o
            WHERE o.id = org_members.org_id
              AND o.owner_id = (SELECT auth.uid())
              AND o.status = 'active')
  );

CREATE POLICY "org_members_update" ON public.org_members
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM organizations o
            WHERE o.id = org_members.org_id
              AND o.owner_id = (SELECT auth.uid())
              AND o.status = 'active')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM organizations o
            WHERE o.id = org_members.org_id
              AND o.owner_id = (SELECT auth.uid())
              AND o.status = 'active')
  );

CREATE POLICY "org_members_delete" ON public.org_members
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM organizations o
            WHERE o.id = org_members.org_id
              AND o.owner_id = (SELECT auth.uid())
              AND o.status = 'active')
  );
