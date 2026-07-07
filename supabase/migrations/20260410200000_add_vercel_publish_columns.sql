-- Add Vercel deployment tracking + publish lifecycle columns to project_repos
-- Supports: build-on-fly → deploy-pre-built-to-vercel architecture

ALTER TABLE project_repos
  ADD COLUMN IF NOT EXISTS vercel_project_id TEXT,
  ADD COLUMN IF NOT EXISTS vercel_deployment_id TEXT,
  ADD COLUMN IF NOT EXISTS vercel_deployment_url TEXT,
  ADD COLUMN IF NOT EXISTS publish_status TEXT NOT NULL DEFAULT 'unpublished'
    CHECK (publish_status IN ('unpublished', 'building', 'deploying', 'published', 'draft', 'failed')),
  ADD COLUMN IF NOT EXISTS publish_error TEXT;

CREATE INDEX IF NOT EXISTS idx_project_repos_publish_status
  ON project_repos(publish_status) WHERE publish_status IN ('published', 'draft');

CREATE INDEX IF NOT EXISTS idx_project_repos_vercel_project
  ON project_repos(vercel_project_id) WHERE vercel_project_id IS NOT NULL;
