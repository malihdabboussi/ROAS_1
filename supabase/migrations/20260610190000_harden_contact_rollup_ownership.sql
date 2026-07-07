-- Harden get_contact_conversation_message_rollup (security advisor finding):
-- SECURITY DEFINER bypasses RLS, so the function itself must verify the caller
-- owns the contact (directly or via active org membership). Service-role
-- callers (apps/api service client) pass through.

CREATE OR REPLACE FUNCTION public.get_contact_conversation_message_rollup(p_contact_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  day date,
  message_count bigint,
  last_message_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.conversation_id,
    (m.created_at AT TIME ZONE 'UTC')::date AS day,
    count(*) AS message_count,
    max(m.created_at) AS last_message_at
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  JOIN contacts ct ON ct.id = c.contact_id
  WHERE c.contact_id = p_contact_id
    AND m.role IN ('user', 'assistant')
    AND (
      auth.role() = 'service_role'
      OR ct.user_id = auth.uid()
      OR (
        ct.org_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM org_members om
          WHERE om.org_id = ct.org_id
            AND om.user_id = auth.uid()
            AND om.status = 'active'
        )
      )
    )
  GROUP BY m.conversation_id, (m.created_at AT TIME ZONE 'UTC')::date
  ORDER BY day ASC
$$;

REVOKE EXECUTE ON FUNCTION public.get_contact_conversation_message_rollup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_contact_conversation_message_rollup(uuid) TO authenticated, service_role;
