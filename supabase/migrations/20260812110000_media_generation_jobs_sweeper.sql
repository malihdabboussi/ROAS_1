-- Support the background sweeper that resolves stale video generation jobs.
-- last_swept_at is both a per-job rate limit and a claim marker so concurrent
-- sweeper instances (or a sweep racing an agent poll) do not double-process.
ALTER TABLE media_generation_jobs
  ADD COLUMN IF NOT EXISTS last_swept_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_media_generation_jobs_stale
  ON media_generation_jobs (created_at)
  WHERE status IN ('starting', 'processing');
