-- Conversation history timeline: last message activity, not row mutation / open.
-- updated_at still tracks any conversation field change (title, pin, scope, etc.).

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

COMMENT ON COLUMN public.conversations.last_message_at IS
  'Timestamp of the latest message in this conversation. Used for history sort/age; not bumped by title/pin/scope opens.';

-- Backfill from existing messages (empty chats stay null).
UPDATE public.conversations c
SET last_message_at = src.last_message_at
FROM (
  SELECT conversation_id, max(created_at) AS last_message_at
  FROM public.messages
  GROUP BY conversation_id
) src
WHERE c.id = src.conversation_id
  AND (c.last_message_at IS NULL OR c.last_message_at < src.last_message_at);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at_desc
  ON public.conversations (last_message_at DESC NULLS LAST, id DESC);

CREATE OR REPLACE FUNCTION public.tg_conversations_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = GREATEST(
    COALESCE(last_message_at, '-infinity'::timestamptz),
    NEW.created_at
  )
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_last_message_at_after_insert ON public.messages;
CREATE TRIGGER conversations_last_message_at_after_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.tg_conversations_last_message_at();
