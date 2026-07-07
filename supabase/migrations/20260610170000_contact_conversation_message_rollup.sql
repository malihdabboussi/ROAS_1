-- Per-conversation-per-day message rollup for the contact activity timeline.
-- Channel engagement events are derived at read time from messages; no
-- per-message activity writes. SECURITY DEFINER with an explicit ownership
-- join (messages RLS may not grant org members row access), EXECUTE revoked
-- from anon per 20260513110000 conventions.

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
  WHERE c.contact_id = p_contact_id
    AND m.role IN ('user', 'assistant')
  GROUP BY m.conversation_id, (m.created_at AT TIME ZONE 'UTC')::date
  ORDER BY day ASC
$$;

REVOKE EXECUTE ON FUNCTION public.get_contact_conversation_message_rollup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_contact_conversation_message_rollup(uuid) TO authenticated, service_role;
