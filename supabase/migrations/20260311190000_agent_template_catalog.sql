CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('c_level','manager','employee','system')),
  file_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_key, file_name)
);

CREATE TABLE IF NOT EXISTS agent_template_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  skill_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  markdown_content TEXT NOT NULL,
  resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_key, skill_key)
);

CREATE INDEX IF NOT EXISTS idx_agent_templates_template_key ON agent_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_agent_template_skills_template_key
  ON agent_template_skills(template_key);

ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_template_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_templates_read_all ON agent_templates;
CREATE POLICY agent_templates_read_all ON agent_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS agent_template_skills_read_all ON agent_template_skills;
CREATE POLICY agent_template_skills_read_all ON agent_template_skills
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS set_updated_at_agent_templates ON agent_templates;
CREATE TRIGGER set_updated_at_agent_templates
  BEFORE UPDATE ON agent_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_agent_template_skills ON agent_template_skills;
CREATE TRIGGER set_updated_at_agent_template_skills
  BEFORE UPDATE ON agent_template_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
