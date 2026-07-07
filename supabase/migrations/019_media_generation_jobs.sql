-- Media generation jobs
-- Tracks async media generation requests (e.g., Replicate video) so the agent can poll status

CREATE TABLE IF NOT EXISTS media_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- What are we generating?
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video')),

  -- Provider tracking (e.g., Replicate prediction id)
  provider TEXT NOT NULL CHECK (provider IN ('replicate')),
  provider_job_id TEXT NOT NULL,

  -- Lifecycle
  status TEXT NOT NULL CHECK (status IN ('starting', 'processing', 'succeeded', 'failed', 'canceled')),
  error TEXT,

  -- Inputs (kept for audit/debugging)
  prompt TEXT,
  model TEXT,
  aspect_ratio TEXT,
  duration_seconds INTEGER,

  -- Output linkage
  result_url TEXT,
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_media_generation_jobs_provider_job_id
  ON media_generation_jobs(provider, provider_job_id);

CREATE INDEX IF NOT EXISTS idx_media_generation_jobs_user_id
  ON media_generation_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_media_generation_jobs_campaign_id
  ON media_generation_jobs(campaign_id);

CREATE INDEX IF NOT EXISTS idx_media_generation_jobs_status
  ON media_generation_jobs(status);

-- RLS
ALTER TABLE media_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media generation jobs"
  ON media_generation_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media generation jobs"
  ON media_generation_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media generation jobs"
  ON media_generation_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media generation jobs"
  ON media_generation_jobs
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access media generation jobs"
  ON media_generation_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_media_generation_jobs_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS media_generation_jobs_updated_at ON media_generation_jobs;
CREATE TRIGGER media_generation_jobs_updated_at
  BEFORE UPDATE ON media_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_media_generation_jobs_timestamp();

