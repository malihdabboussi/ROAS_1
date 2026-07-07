-- Fix: Org members RLS on messages was checking org_id on the messages row
-- (always NULL), instead of checking via the parent conversations table.
-- Replace with a subquery-based policy that checks conversations.org_id.

DROP POLICY IF EXISTS "Org members can read org messages" ON public.messages;
DROP POLICY IF EXISTS "Org members can read org conversation messages" ON public.messages;

CREATE POLICY "Org members can read org conversation messages"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE org_id IS NOT NULL AND public.is_org_member(org_id)
    )
  );
