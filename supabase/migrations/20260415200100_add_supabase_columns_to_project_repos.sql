-- Add Supabase project columns to project_repos
ALTER TABLE project_repos
  ADD COLUMN IF NOT EXISTS supabase_project_ref TEXT,
  ADD COLUMN IF NOT EXISTS supabase_project_name TEXT,
  ADD COLUMN IF NOT EXISTS supabase_region TEXT,
  ADD COLUMN IF NOT EXISTS supabase_api_url TEXT,
  ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT;

CREATE INDEX IF NOT EXISTS idx_project_repos_supabase_ref
  ON project_repos(supabase_project_ref)
  WHERE supabase_project_ref IS NOT NULL;
