-- MCP server configurations per project
-- Users connect remote MCP servers (HTTP/SSE) and agents call their tools at runtime.

CREATE TABLE IF NOT EXISTS project_mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_repos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  server_url TEXT NOT NULL,
  vault_secret_id UUID REFERENCES vault_secrets(id) ON DELETE SET NULL,
  domain TEXT NOT NULL DEFAULT 'shared'
    CHECK (domain IN ('shared', 'marketing', 'analyst', 'developer')),
  agent_enabled BOOLEAN NOT NULL DEFAULT true,
  enabled BOOLEAN NOT NULL DEFAULT true,
  cached_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_project_mcp_servers_project_id ON project_mcp_servers(project_id);

ALTER TABLE project_mcp_servers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_mcp_servers' AND policyname = 'Project members can manage MCP servers'
  ) THEN
    CREATE POLICY "Project members can manage MCP servers"
      ON project_mcp_servers FOR ALL
      USING (
        project_id IN (
          SELECT id FROM project_repos WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_project_mcp_servers'
  ) THEN
    CREATE TRIGGER set_updated_at_project_mcp_servers
      BEFORE UPDATE ON project_mcp_servers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
