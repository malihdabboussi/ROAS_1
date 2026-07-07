ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS summary_message_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary_updated_at timestamptz;

COMMENT ON COLUMN public.conversations.summary IS 'Running conversation summary for smart context windowing';
COMMENT ON COLUMN public.conversations.summary_message_count IS 'Number of messages covered by the summary';
COMMENT ON COLUMN public.conversations.summary_updated_at IS 'When the summary was last generated';;
