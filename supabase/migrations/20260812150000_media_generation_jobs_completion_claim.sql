-- Atomic completion ownership for media generation jobs. get_video_status
-- polling and the stale-job sweeper can both observe a provider success and
-- race through upload + billing + job update; completion_claimed_at/_by is a
-- single-UPDATE claim so exactly one caller runs those terminal side effects
-- (stale claims are retaken after a bounded timeout for crash recovery), and
-- billing_claimed_at/_by is a recoverable lease around the debit. The durable
-- billing_recorded_at marker is written only after the usage event/debit has
-- completed, so a failed debit can be retried without opening concurrent
-- workers to duplicate charges.
ALTER TABLE media_generation_jobs
  ADD COLUMN IF NOT EXISTS completion_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_claimed_by TEXT,
  ADD COLUMN IF NOT EXISTS billing_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_claimed_by TEXT,
  ADD COLUMN IF NOT EXISTS billing_recorded_at TIMESTAMPTZ;
