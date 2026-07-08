-- ROAS drift recovery: personal accounts could not read their own agents_registry rows.
-- Production was missing agents_registry_select / agents_registry_update (own user_id path).

DROP POLICY IF EXISTS "agents_registry_select" ON public.agents_registry;
CREATE POLICY "agents_registry_select" ON public.agents_registry
  AS PERMISSIVE FOR SELECT TO public
  USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
    OR public_page_enabled = true
    OR widget_enabled = true
  );

DROP POLICY IF EXISTS "agents_registry_update" ON public.agents_registry;
CREATE POLICY "agents_registry_update" ON public.agents_registry
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );
