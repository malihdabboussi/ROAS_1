-- Add domain_id to project_repos for custom domain support (mirrors funnels/presentations pattern)
ALTER TABLE project_repos
  ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_repos_domain_id ON project_repos(domain_id) WHERE domain_id IS NOT NULL;
