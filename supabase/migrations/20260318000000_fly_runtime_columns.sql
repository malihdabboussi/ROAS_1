ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_runtime_app TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_runtime_status TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fly_runtime_last_activity_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_runtime_idle
  ON profiles (fly_runtime_status, fly_runtime_last_activity_at)
  WHERE fly_runtime_status = 'running';
