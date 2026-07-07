ALTER TABLE media_generation_jobs
  DROP CONSTRAINT IF EXISTS media_generation_jobs_provider_check;

ALTER TABLE media_generation_jobs
  ADD CONSTRAINT media_generation_jobs_provider_check
  CHECK (provider IN ('replicate', 'google'));;
