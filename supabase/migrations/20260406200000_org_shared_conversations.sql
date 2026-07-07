-- ============================================================
-- ORG SHARED CONVERSATIONS
-- Allows org members to read messages and documents from
-- conversations that belong to any member of their org.
-- Conversations already have an org-level SELECT policy;
-- messages and conversation_documents did not.
-- ============================================================

CREATE POLICY "Org members can read org conversation messages"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE org_id IS NOT NULL AND public.is_org_member(org_id)
    )
  );

CREATE POLICY "Org members can read org conversation documents"
  ON public.conversation_documents FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE org_id IS NOT NULL AND public.is_org_member(org_id)
    )
  );
