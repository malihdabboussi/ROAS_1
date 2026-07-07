-- Phase 2 table 10/10: consolidate email_sends RLS (3 policies -> 4 per-command).
-- Functionally identical: own OR org member.

DROP POLICY IF EXISTS "Org members can write org email_sends" ON public.email_sends;
DROP POLICY IF EXISTS "Users can manage own email sends" ON public.email_sends;
DROP POLICY IF EXISTS "Org members can read org email_sends" ON public.email_sends;

CREATE POLICY "email_sends_select" ON public.email_sends
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

CREATE POLICY "email_sends_insert" ON public.email_sends
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

CREATE POLICY "email_sends_update" ON public.email_sends
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

CREATE POLICY "email_sends_delete" ON public.email_sends
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );
