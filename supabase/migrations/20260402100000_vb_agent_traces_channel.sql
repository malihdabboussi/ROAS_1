-- Surface origin for Admin filtering/display: studio | slack | telegram | mission
ALTER TABLE public.vb_agent_traces ADD COLUMN IF NOT EXISTS channel text;
