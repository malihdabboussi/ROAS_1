-- 042: Agent definitions stored in DB (source of truth for agent files)

CREATE TABLE IF NOT EXISTS agent_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_key, file_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_definitions_user_agent
  ON agent_definitions(user_id, agent_key);

ALTER TABLE agent_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_definitions_read_own ON agent_definitions;
CREATE POLICY agent_definitions_read_own ON agent_definitions
  FOR SELECT USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS set_updated_at_agent_definitions ON agent_definitions;
CREATE TRIGGER set_updated_at_agent_definitions
  BEFORE UPDATE ON agent_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
