ALTER TABLE public.vb_agent_traces ADD COLUMN IF NOT EXISTS agent_key text;
ALTER TABLE public.app_errors ADD COLUMN IF NOT EXISTS agent_key text;
