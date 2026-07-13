-- Fix messages UPDATE/DELETE RLS: consolidated policy required messages.user_id,
-- but assistant rows are authorized via conversation share level. INSERT/SELECT already
-- use conversation_effective_level; align UPDATE/DELETE with the same model.

DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update" ON public.messages
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      WHERE public.conversation_effective_level(c.id, (SELECT auth.uid())) IN ('edit', 'admin')
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      WHERE public.conversation_effective_level(c.id, (SELECT auth.uid())) IN ('edit', 'admin')
    )
  );

DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_delete" ON public.messages
  AS PERMISSIVE FOR DELETE TO public
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      WHERE public.conversation_effective_level(c.id, (SELECT auth.uid())) IN ('edit', 'admin')
    )
  );
