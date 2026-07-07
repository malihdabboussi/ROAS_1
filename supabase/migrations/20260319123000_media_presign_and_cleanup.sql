-- Presigned upload support, storage cap removal, and media cleanup jobs.

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready'
  CHECK (status IN ('pending', 'ready', 'deleted'));

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS deletable_after TIMESTAMPTZ;

UPDATE media_assets
SET status = 'ready'
WHERE status IS NULL;

-- Remove plan storage caps (product decision: unlimited storage).
UPDATE subscription_plans
SET max_storage_bytes = NULL;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_stale_media_assets()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stale RECORD;
BEGIN
  FOR stale IN
    SELECT id, bucket_name, file_path
    FROM media_assets
    WHERE status = 'pending'
      AND created_at < (NOW() - INTERVAL '24 hours')
  LOOP
    DELETE FROM storage.objects
    WHERE bucket_id = stale.bucket_name
      AND name = stale.file_path;

    UPDATE media_assets
    SET status = 'deleted',
        public_url = NULL,
        updated_at = NOW()
    WHERE id = stale.id;
  END LOOP;

  FOR stale IN
    SELECT id, bucket_name, file_path
    FROM media_assets
    WHERE status = 'ready'
      AND deletable_after IS NOT NULL
      AND deletable_after <= NOW()
  LOOP
    DELETE FROM storage.objects
    WHERE bucket_id = stale.bucket_name
      AND name = stale.file_path;

    UPDATE media_assets
    SET status = 'deleted',
        public_url = NULL,
        updated_at = NOW()
    WHERE id = stale.id;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron schema is not available after extension install';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'media-assets-cleanup';

  PERFORM cron.schedule(
    'media-assets-cleanup',
    '0 * * * *',
    'SELECT public.cleanup_stale_media_assets();'
  );
END;
$$;
