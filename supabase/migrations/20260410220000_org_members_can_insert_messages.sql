-- Org members could read messages in org conversations (SELECT policy existed)
-- but could not INSERT — causing RLS violation when User B sends a message
-- in User A's org conversation. Add INSERT policy via conversations subquery.

CREATE POLICY "Org members can insert org conversation messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE org_id IS NOT NULL AND public.is_org_member(org_id)
    )
  );
