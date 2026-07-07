-- Phase 2 table 8/10: consolidate conversations RLS (4 policies -> 4, no overlap)
-- Functionally identical: read by share OR own; insert own; update by edit-or-admin; delete by admin.

DROP POLICY IF EXISTS "conversations_own" ON public.conversations;
DROP POLICY IF EXISTS "Conv delete by admin" ON public.conversations;
DROP POLICY IF EXISTS "Conv read by share" ON public.conversations;
DROP POLICY IF EXISTS "Conv update by edit" ON public.conversations;

CREATE POLICY "conversations_select" ON public.conversations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR conversation_effective_level(id, (SELECT auth.uid())) IS NOT NULL
  );

CREATE POLICY "conversations_insert" ON public.conversations
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "conversations_update" ON public.conversations
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR conversation_effective_level(id, (SELECT auth.uid())) = ANY (ARRAY['edit', 'admin'])
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR conversation_effective_level(id, (SELECT auth.uid())) = ANY (ARRAY['edit', 'admin'])
  );

CREATE POLICY "conversations_delete" ON public.conversations
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR conversation_effective_level(id, (SELECT auth.uid())) = 'admin'
  );
