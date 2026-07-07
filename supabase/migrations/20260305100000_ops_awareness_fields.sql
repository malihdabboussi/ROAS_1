-- Ops + awareness state and cooldown fields.

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS has_active_work BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_ceo_eval_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ops_backoff_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consecutive_unresponded_notifications INTEGER NOT NULL DEFAULT 0;

-- Backfill campaign active-work state from existing mission statuses.
UPDATE campaigns c
SET has_active_work = EXISTS (
  SELECT 1
  FROM missions m
  WHERE m.campaign_id = c.id
    AND m.status = 'in_progress'
);

-- Read-heavy access paths for scheduler/evaluator checks.
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status_active_work
  ON campaigns (user_id, status, has_active_work);

CREATE INDEX IF NOT EXISTS idx_profiles_ceo_eval_backoff
  ON profiles (id, last_ceo_eval_at, ops_backoff_until);
