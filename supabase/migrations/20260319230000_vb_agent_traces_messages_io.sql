-- Full LLM trace payloads (aligned with agent-api TracingService)
ALTER TABLE vb_agent_traces
  ADD COLUMN IF NOT EXISTS messages_input jsonb,
  ADD COLUMN IF NOT EXISTS messages_output jsonb;
