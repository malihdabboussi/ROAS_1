-- GitHub integration: catalog entry + per-user repo tracking

INSERT INTO integrations_available (
  id,
  provider,
  name,
  description,
  auth_type,
  is_available,
  metadata
)
VALUES (
  'github',
  'github',
  'GitHub',
  'Connect GitHub repositories so agents can read code, commit changes, and create pull requests.',
  'github_app',
  true,
  jsonb_build_object(
    'permissions', jsonb_build_object(
      'contents', 'write',
      'pull_requests', 'write',
      'metadata', 'read'
    )
  )
)
ON CONFLICT (id) DO UPDATE
SET
  provider = EXCLUDED.provider,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  is_available = EXCLUDED.is_available,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Track which repos the user granted access to via the GitHub App installation
CREATE TABLE IF NOT EXISTS github_repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installation_id BIGINT NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_id BIGINT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, repo_id)
);

CREATE INDEX IF NOT EXISTS idx_github_repos_user_id ON github_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_installation_id ON github_repos(installation_id);

ALTER TABLE github_repos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'github_repos' AND policyname = 'Users can manage own github repos'
  ) THEN
    CREATE POLICY "Users can manage own github repos"
      ON github_repos FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_github_repos'
  ) THEN
    CREATE TRIGGER set_updated_at_github_repos
      BEFORE UPDATE ON github_repos
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
