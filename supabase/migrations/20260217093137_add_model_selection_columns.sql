ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS model_id text;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS default_model_id text,
  ADD COLUMN IF NOT EXISTS last_input_tokens integer;

COMMENT ON COLUMN public.messages.model_id IS 'Model ID requested (user) or used (assistant) for this message';
COMMENT ON COLUMN public.conversations.default_model_id IS 'Last selected model for this conversation (UI restore)';
COMMENT ON COLUMN public.conversations.last_input_tokens IS 'Exact input token count from last OpenRouter response';;
