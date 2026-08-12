-- Persist the requested Space on video generation jobs so the finished asset
-- can be registered in Space Media even when the polling call has no request
-- context (previously space_id was inferred only at poll time and could be lost).
ALTER TABLE media_generation_jobs
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES spaces(id) ON DELETE SET NULL;
