-- Customer signal loop: per-conversation extraction cursor + accumulator index.
-- The mission-worker sweeper flushes unprocessed telegram/widget messages into
-- customer brains; these columns mark how far each conversation has been
-- extracted so episodes are incremental and idempotent.
-- See .docs/plans/customer-signal-loop.md.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_extracted_message_id uuid,
  ADD COLUMN IF NOT EXISTS last_extracted_message_at timestamptz;

COMMENT ON COLUMN public.conversations.last_extracted_message_id IS 'Last message routed to the customer brain signal loop (cursor end, used in outbox dedupe keys)';
COMMENT ON COLUMN public.conversations.last_extracted_message_at IS 'created_at of the last extracted message; sweeper only considers newer messages';

-- The accumulator sums unprocessed message tokens per conversation; the existing
-- idx_messages_conversation index has no created_at component.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages (conversation_id, created_at);
