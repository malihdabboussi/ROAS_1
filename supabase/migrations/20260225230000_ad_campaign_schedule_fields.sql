-- Schedule fields on ad_campaigns: continuous (ongoing) or one_time (with date range)
ALTER TABLE ad_campaigns
ADD COLUMN IF NOT EXISTS schedule_type TEXT NOT NULL DEFAULT 'continuous'
  CHECK (schedule_type IN ('continuous', 'one_time')),
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
