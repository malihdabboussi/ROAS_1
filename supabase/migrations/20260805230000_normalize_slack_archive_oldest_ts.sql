BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_slack_ts(p_ts text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  trimmed text := btrim(coalesce(p_ts, ''));
  epoch_seconds numeric;
BEGIN
  IF trimmed = '' THEN
    RAISE EXCEPTION 'Slack timestamp is required';
  END IF;
  IF trimmed ~ '^\d+(\.\d+)?$' THEN
    RETURN trimmed;
  END IF;
  epoch_seconds := floor(extract(epoch FROM trimmed::timestamptz));
  RETURN epoch_seconds::bigint::text || '.000000';
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_slack_archive_backfilled(
  p_org_id uuid,
  p_slack_team_id text,
  p_channel_id text,
  p_oldest_ts text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_oldest text := public.normalize_slack_ts(p_oldest_ts);
BEGIN
  UPDATE public.slack_observation_channels
  SET archive_oldest_ts = CASE
        WHEN archive_oldest_ts IS NULL
          OR public.normalize_slack_ts(archive_oldest_ts)::numeric > v_oldest::numeric
          THEN v_oldest
        ELSE public.normalize_slack_ts(archive_oldest_ts)
      END,
      archive_backfilled_at = now(),
      updated_at = now()
  WHERE org_id = p_org_id
    AND slack_team_id = p_slack_team_id
    AND channel_id = p_channel_id;
END;
$$;

UPDATE public.slack_observation_channels
SET archive_oldest_ts = public.normalize_slack_ts(archive_oldest_ts),
    updated_at = now()
WHERE archive_oldest_ts IS NOT NULL
  AND archive_oldest_ts !~ '^\d+(\.\d+)?$';

COMMIT;
