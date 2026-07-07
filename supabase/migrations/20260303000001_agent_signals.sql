CREATE TABLE agent_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_data JSONB DEFAULT '{}',
  weight FLOAT NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agent_signals_user_unconsumed
  ON agent_signals(user_id)
  WHERE consumed_at IS NULL;
