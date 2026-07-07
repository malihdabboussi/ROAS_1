-- Phase 2 table 7/10: consolidate profiles RLS (3 policies -> 4)
-- Functionally identical: read own + co-members; update own OR org admin; delete own.

DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
DROP POLICY IF EXISTS "Org co-members can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Org owners and admins can update member profiles" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM org_members my
      JOIN org_members their ON their.org_id = my.org_id
      WHERE my.user_id = (SELECT auth.uid())
        AND my.status = 'active'
        AND their.user_id = profiles.id
        AND their.status = 'active'
    )
  );

CREATE POLICY "profiles_insert" ON public.profiles
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM org_members admin_member
      JOIN org_members target_member ON target_member.org_id = admin_member.org_id
      WHERE admin_member.user_id = (SELECT auth.uid())
        AND admin_member.status = 'active'
        AND admin_member.role = ANY (ARRAY['owner', 'admin'])
        AND target_member.user_id = profiles.id
        AND target_member.status = 'active'
    )
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM org_members admin_member
      JOIN org_members target_member ON target_member.org_id = admin_member.org_id
      WHERE admin_member.user_id = (SELECT auth.uid())
        AND admin_member.status = 'active'
        AND admin_member.role = ANY (ARRAY['owner', 'admin'])
        AND target_member.user_id = profiles.id
        AND target_member.status = 'active'
    )
  );

CREATE POLICY "profiles_delete" ON public.profiles
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (id = (SELECT auth.uid()));
