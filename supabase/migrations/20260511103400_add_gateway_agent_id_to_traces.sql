ALTER TABLE public.vb_agent_traces
  ADD COLUMN IF NOT EXISTS gateway_agent_id text;

CREATE INDEX IF NOT EXISTS idx_vb_agent_traces_gateway_agent_id
  ON public.vb_agent_traces(gateway_agent_id)
  WHERE gateway_agent_id IS NOT NULL;
