CREATE TABLE IF NOT EXISTS public.conversation_reads (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_reads_user_id
  ON public.conversation_reads(user_id);

ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_reads_select ON public.conversation_reads
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    AND public.conversation_effective_level(conversation_id, (SELECT auth.uid())) IS NOT NULL
  );

CREATE POLICY conversation_reads_insert ON public.conversation_reads
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.conversation_effective_level(conversation_id, (SELECT auth.uid())) IS NOT NULL
  );

CREATE POLICY conversation_reads_update ON public.conversation_reads
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    AND public.conversation_effective_level(conversation_id, (SELECT auth.uid())) IS NOT NULL
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.conversation_effective_level(conversation_id, (SELECT auth.uid())) IS NOT NULL
  );

INSERT INTO public.conversation_reads (conversation_id, user_id, last_read_at)
SELECT id, user_id, now()
FROM public.conversations
ON CONFLICT (conversation_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_conversation_activity_states(p_conversation_ids uuid[])
RETURNS TABLE(conversation_id uuid, is_unread boolean, needs_action boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id,
    EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE m.conversation_id = c.id
        AND m.role = 'assistant'
        AND m.created_at > COALESCE(r.last_read_at, c.created_at)
    ) AS is_unread,
    EXISTS (
      SELECT 1
      FROM public.messages m
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(m.metadata->'content_blocks_ordered') = 'array'
            THEN m.metadata->'content_blocks_ordered'
          ELSE '[]'::jsonb
        END
      ) block
      WHERE m.conversation_id = c.id
        AND (
          (block->>'type' = 'clarification'
            AND COALESCE(block->>'status', 'pending') = 'pending')
          OR (block->>'type' = 'delete_confirm' AND block->>'status' = 'pending')
          OR (block->>'type' = 'email_send_confirm'
            AND COALESCE(block->>'status', 'pending') = 'pending')
          OR (block->>'type' = 'campaign_context_confirm'
            AND COALESCE(block->>'status', 'pending') = 'pending')
          OR (block->>'type' = 'agent_integration_confirm'
            AND COALESCE(block->>'status', 'pending') = 'pending')
          OR (block->>'type' = 'agent_access_request'
            AND COALESCE(block->>'status', 'pending') = 'pending')
          OR (block->>'type' = 'agent_hire_suggestion' AND block->>'status' = 'pending')
        )
    ) AS needs_action
  FROM public.conversations c
  LEFT JOIN public.conversation_reads r
    ON r.conversation_id = c.id
   AND r.user_id = (SELECT auth.uid())
  WHERE c.id = ANY(p_conversation_ids)
    AND public.conversation_effective_level(c.id, (SELECT auth.uid())) IS NOT NULL;
$$;

REVOKE ALL ON TABLE public.conversation_reads FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.conversation_reads TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_conversation_activity_states(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_activity_states(uuid[]) TO authenticated;
