-- Campaign soft-delete + 30-day retention cleanup via pg_cron.
-- Replaces hard delete behavior in API with deleted_at semantics.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_campaigns_deleted_at
  ON public.campaigns (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- One-time cleanup of mission-generated orphan task rows.
-- We intentionally do NOT delete all mission_id IS NULL rows because manual tasks are valid.
DELETE FROM public.tasks
WHERE mission_id IS NULL
  AND campaign_id IS NULL
  AND tags @> ARRAY['mission']::text[];

CREATE TABLE IF NOT EXISTS public.campaign_retention_cleanup_runs (
  id BIGSERIAL PRIMARY KEY,
  deleted_count INTEGER NOT NULL DEFAULT 0,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.cleanup_soft_deleted_campaigns(p_batch_size INTEGER DEFAULT 250)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  WITH candidates AS (
    SELECT id
    FROM public.campaigns
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
    ORDER BY deleted_at ASC
    LIMIT GREATEST(COALESCE(p_batch_size, 250), 1)
    FOR UPDATE SKIP LOCKED
  ),
  deleted_rows AS (
    DELETE FROM public.campaigns c
    USING candidates
    WHERE c.id = candidates.id
    RETURNING c.id
  )
  SELECT COUNT(*) INTO v_deleted_count
  FROM deleted_rows;

  INSERT INTO public.campaign_retention_cleanup_runs (deleted_count, ran_at)
  VALUES (v_deleted_count, NOW());

  RETURN v_deleted_count;
END;
$$;

DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
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
