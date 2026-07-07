CREATE TABLE IF NOT EXISTS public.conversation_compactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  from_message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  to_message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  message_count integer NOT NULL,
  summary_md text NOT NULL,
  tokens_estimate integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_compactions_conversation_to_message_uq
  ON public.conversation_compactions(conversation_id, to_message_id);

CREATE INDEX IF NOT EXISTS conversation_compactions_conversation_created_idx
  ON public.conversation_compactions(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS conversation_compactions_user_created_idx
  ON public.conversation_compactions(user_id, created_at DESC);

ALTER TABLE public.conversation_compactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation compactions"
  ON public.conversation_compactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation compactions"
  ON public.conversation_compactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.conversation_compactions IS 'Compacted/summarized historical spans for long-running agent conversations.';
COMMENT ON COLUMN public.conversation_compactions.summary_md IS 'Structured markdown summary for a compacted message span.';
COMMENT ON COLUMN public.conversation_compactions.tokens_estimate IS 'Estimated token count of summary_md.';
