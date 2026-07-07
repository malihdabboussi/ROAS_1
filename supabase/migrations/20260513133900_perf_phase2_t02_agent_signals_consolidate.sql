-- Phase 2 table 2/10: consolidate agent_signals RLS (8 policies -> 4)
-- Functionally identical: same access (own signals OR org-scoped signals if org member).
-- Biggest single perf win: 145k rows, every read previously evaluated 3 SELECT policies.

DROP POLICY IF EXISTS "Org members can write org agent_signals" ON public.agent_signals;
DROP POLICY IF EXISTS "Owner can write personal agent_signals" ON public.agent_signals;
DROP POLICY IF EXISTS "Users can delete own agent_signals" ON public.agent_signals;
DROP POLICY IF EXISTS "Users can insert own agent_signals" ON public.agent_signals;
DROP POLICY IF EXISTS "Org members can read org agent_signals" ON public.agent_signals;
DROP POLICY IF EXISTS "Owner can read personal agent_signals" ON public.agent_signals;
DROP POLICY IF EXISTS "Users can select own agent_signals" ON public.agent_signals;
DROP POLICY IF EXISTS "Users can update own agent_signals" ON public.agent_signals;

CREATE POLICY "agent_signals_select" ON public.agent_signals
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (user_id = (SELECT auth.uid()))
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

CREATE POLICY "agent_signals_insert" ON public.agent_signals
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

CREATE POLICY "agent_signals_update" ON public.agent_signals
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (user_id = (SELECT auth.uid()))
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  )
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

CREATE POLICY "agent_signals_delete" ON public.agent_signals
  AS PERMISSIVE FOR DELETE TO public
  USING (
    (user_id = (SELECT auth.uid()))
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );
