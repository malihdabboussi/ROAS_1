-- Atomic completion ownership for media generation jobs. get_video_status
-- polling and the stale-job sweeper can both observe a provider success and
-- race through upload + billing + job update; completion_claimed_at/_by is a
-- single-UPDATE claim so exactly one caller runs those terminal side effects
-- (stale claims are retaken after a bounded timeout for crash recovery), and
-- billing_recorded_at is a never-expiring one-shot flip so credits are
-- debited at most once per job even across stale-claim retries.
ALTER TABLE media_generation_jobs
  ADD COLUMN IF NOT EXISTS completion_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_claimed_by TEXT,
  ADD COLUMN IF NOT EXISTS billing_recorded_at TIMESTAMPTZ;
