CREATE TABLE IF NOT EXISTS public.conversation_response_chain (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_response_id text,
  openclaw_response_id text,
  provider_response_id text,
  agent_id text,
  model_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversation_response_chain_conversation_created_idx
  ON public.conversation_response_chain (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS conversation_response_chain_message_idx
  ON public.conversation_response_chain (message_id);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_response_chain_openclaw_response_uq
  ON public.conversation_response_chain (openclaw_response_id)
  WHERE openclaw_response_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversation_response_chain_provider_response_uq
  ON public.conversation_response_chain (provider_response_id)
  WHERE provider_response_id IS NOT NULL;

ALTER TABLE public.conversation_response_chain ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_response_chain_select_own
  ON public.conversation_response_chain
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY conversation_response_chain_insert_own
  ON public.conversation_response_chain
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.conversation_response_chain IS 'Durable response-id chain for OpenResponses previous_response_id continuity.';
