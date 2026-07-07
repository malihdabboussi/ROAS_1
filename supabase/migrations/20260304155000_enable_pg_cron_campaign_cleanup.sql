-- Enable pg_cron and register campaign retention cleanup schedule.

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron schema is not available after extension install';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'campaign-retention-cleanup';

  PERFORM cron.schedule(
    'campaign-retention-cleanup',
    '0 3 * * *',
    'SELECT public.cleanup_soft_deleted_campaigns();'
  );
END;
$$;
