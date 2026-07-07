-- Agent Workflows: mirrors agent_skills pattern exactly.
-- A workflow is a "super-skill" that references multiple skills in ordered steps.
-- Synced to filesystem as SKILL.md files inside workflows/{key}/ directories.

CREATE TABLE IF NOT EXISTS agent_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  workflow_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  markdown_content TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  archetype_filter text[] DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX agent_workflows_system_unique
  ON agent_workflows (agent_key, workflow_key) WHERE user_id IS NULL;
CREATE UNIQUE INDEX agent_workflows_user_unique
  ON agent_workflows (user_id, agent_key, workflow_key) WHERE user_id IS NOT NULL;

CREATE INDEX idx_agent_workflows_user_agent
  ON agent_workflows(user_id, agent_key);
CREATE INDEX idx_agent_workflows_user_enabled
  ON agent_workflows(user_id, is_enabled);

ALTER TABLE agent_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_workflows_read_own ON agent_workflows
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY agent_workflows_read_system ON agent_workflows
  FOR SELECT USING (user_id IS NULL);

CREATE POLICY agent_workflows_write_own ON agent_workflows
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS set_updated_at_agent_workflows ON agent_workflows;
CREATE TRIGGER set_updated_at_agent_workflows
  BEFORE UPDATE ON agent_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
