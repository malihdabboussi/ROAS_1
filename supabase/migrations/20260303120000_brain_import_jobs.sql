CREATE TABLE IF NOT EXISTS brain_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  title TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'retry', 'succeeded', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  result JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_import_jobs_due
  ON brain_import_jobs(status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_brain_import_jobs_user_created
  ON brain_import_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brain_import_jobs_user_notifications
  ON brain_import_jobs(user_id, status, notified_at, completed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_brain_import_jobs_active_dedupe
  ON brain_import_jobs(user_id, dedupe_key)
  WHERE status IN ('queued', 'processing', 'retry');

ALTER TABLE brain_import_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brain_import_jobs'
      AND policyname = 'Users can read own brain import jobs'
  ) THEN
    CREATE POLICY "Users can read own brain import jobs"
      ON brain_import_jobs
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brain_import_jobs'
      AND policyname = 'Users can update own brain import jobs'
  ) THEN
    CREATE POLICY "Users can update own brain import jobs"
      ON brain_import_jobs
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_updated_at_brain_import_jobs'
  ) THEN
    CREATE TRIGGER set_updated_at_brain_import_jobs
      BEFORE UPDATE ON brain_import_jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
