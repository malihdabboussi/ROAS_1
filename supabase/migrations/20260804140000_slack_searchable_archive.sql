BEGIN;

ALTER TABLE public.slack_observation_channels
  ADD COLUMN IF NOT EXISTS archive_oldest_ts text,
  ADD COLUMN IF NOT EXISTS archive_backfilled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_slack_observation_events_search
  ON public.slack_observation_events
  USING gin (to_tsvector('english', text));

CREATE OR REPLACE FUNCTION public.mark_slack_archive_backfilled(
  p_org_id uuid,
  p_slack_team_id text,
  p_channel_id text,
  p_oldest_ts text
)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.slack_observation_channels
  SET archive_oldest_ts = CASE
        WHEN archive_oldest_ts IS NULL OR archive_oldest_ts::numeric > p_oldest_ts::numeric
          THEN p_oldest_ts
        ELSE archive_oldest_ts
      END,
      archive_backfilled_at = now(),
      updated_at = now()
  WHERE org_id = p_org_id
    AND slack_team_id = p_slack_team_id
    AND channel_id = p_channel_id;
$$;

COMMIT;
