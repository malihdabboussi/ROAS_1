-- Phase 2 table 3/10: consolidate messages RLS (3 policies -> 4)
-- Functionally identical: own messages OR shared-conversation visibility/edit.

DROP POLICY IF EXISTS "messages_own" ON public.messages;
DROP POLICY IF EXISTS "Msg insert by edit" ON public.messages;
DROP POLICY IF EXISTS "Msg read by share" ON public.messages;

CREATE POLICY "messages_select" ON public.messages
  AS PERMISSIVE FOR SELECT TO public
  USING (
    user_id = (SELECT auth.uid())
    OR conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE conversation_effective_level(c.id, (SELECT auth.uid())) IS NOT NULL
    )
  );

CREATE POLICY "messages_insert" ON public.messages
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE conversation_effective_level(c.id, (SELECT auth.uid())) = ANY (ARRAY['edit', 'admin'])
    )
  );

CREATE POLICY "messages_update" ON public.messages
  AS PERMISSIVE FOR UPDATE TO public
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "messages_delete" ON public.messages
  AS PERMISSIVE FOR DELETE TO public
  USING (user_id = (SELECT auth.uid()));
