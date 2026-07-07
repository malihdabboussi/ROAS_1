-- Agent tracing table for observability (Vibey)
-- Run manually: psql or Supabase SQL editor

CREATE TABLE vb_agent_traces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  conversation_id uuid NOT NULL,
  campaign_id     uuid,
  session_key     text NOT NULL,

  -- Input
  user_message    text NOT NULL,
  system_prompt   text,
  history_length  integer NOT NULL DEFAULT 0,

  -- Output
  response        text,

  -- Tool calls (JSONB array)
  tool_steps      jsonb DEFAULT '[]'::jsonb,

  -- Usage
  input_tokens    integer,
  output_tokens   integer,
  cache_read_tokens integer DEFAULT 0,
  cache_write_tokens integer DEFAULT 0,
  total_tokens    integer,

  -- Timing
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  duration_ms     integer,

  -- Status
  status          text NOT NULL DEFAULT 'streaming'
                  CHECK (status IN ('streaming', 'completed', 'failed')),
  error           text,

  -- Metadata
  model           text DEFAULT 'anthropic/claude-opus-4.6',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vb_agent_traces_user_id ON vb_agent_traces(user_id);
CREATE INDEX idx_vb_agent_traces_conversation_id ON vb_agent_traces(conversation_id);
CREATE INDEX idx_vb_agent_traces_created_at ON vb_agent_traces(created_at DESC);
CREATE INDEX idx_vb_agent_traces_status ON vb_agent_traces(status);

ALTER TABLE vb_agent_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own traces"
  ON vb_agent_traces FOR SELECT
  USING (auth.uid() = user_id);
