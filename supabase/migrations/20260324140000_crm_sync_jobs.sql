CREATE TABLE IF NOT EXISTS crm_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('activecampaign', 'gohighlevel')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'succeeded', 'failed')),
  job_id TEXT,
  total_remote INTEGER,
  fetched INTEGER NOT NULL DEFAULT 0,
  imported INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_sync_jobs_queued
  ON crm_sync_jobs(status, created_at)
  WHERE status = 'queued' AND job_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_sync_jobs_user_created
  ON crm_sync_jobs(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_sync_jobs_active_user_source
  ON crm_sync_jobs(user_id, source)
  WHERE status IN ('queued', 'processing');

ALTER TABLE crm_sync_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crm_sync_jobs' AND policyname = 'Users can read own crm sync jobs'
  ) THEN
    CREATE POLICY "Users can read own crm sync jobs"
      ON crm_sync_jobs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crm_sync_jobs' AND policyname = 'Users can insert own crm sync jobs'
  ) THEN
    CREATE POLICY "Users can insert own crm sync jobs"
      ON crm_sync_jobs FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_crm_sync_jobs'
  ) THEN
    CREATE TRIGGER set_updated_at_crm_sync_jobs
      BEFORE UPDATE ON crm_sync_jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
