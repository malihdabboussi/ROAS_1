-- 049: Agent skills managed in DB and synced to VM SKILL.md files

CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  skill_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  markdown_content TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_key, skill_key)
);

CREATE INDEX IF NOT EXISTS idx_agent_skills_user_agent
  ON agent_skills(user_id, agent_key);

CREATE INDEX IF NOT EXISTS idx_agent_skills_user_enabled
  ON agent_skills(user_id, is_enabled);

ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_skills_read_own ON agent_skills;
CREATE POLICY agent_skills_read_own ON agent_skills
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS agent_skills_write_own ON agent_skills;
CREATE POLICY agent_skills_write_own ON agent_skills
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS set_updated_at_agent_skills ON agent_skills;
CREATE TRIGGER set_updated_at_agent_skills
  BEFORE UPDATE ON agent_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
