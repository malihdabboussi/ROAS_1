CREATE TABLE agent_awareness_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress',
  trigger_signals UUID[],
  decision TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX agent_awareness_sessions_inprogress
  ON agent_awareness_sessions(user_id)
  WHERE status = 'in_progress';

CREATE TABLE agent_awareness_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  session_id UUID REFERENCES agent_awareness_sessions(id),
  content TEXT NOT NULL,
  point_type TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  injected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agent_awareness_points_user_unread
  ON agent_awareness_points(user_id)
  WHERE read_at IS NULL;
