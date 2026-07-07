ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS forked_from JSONB DEFAULT NULL;

COMMENT ON COLUMN public.conversations.forked_from IS
  'Lineage info: { conversation_id, message_id, forked_at }';
