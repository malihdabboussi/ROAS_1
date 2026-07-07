-- User Agent State: per-user working state for AI agents (DB-backed STATE.md)
CREATE TABLE user_agent_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL DEFAULT 'vibey',
  state_content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_id)
);

ALTER TABLE user_agent_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON user_agent_state FOR ALL
  USING (true) WITH CHECK (true);
