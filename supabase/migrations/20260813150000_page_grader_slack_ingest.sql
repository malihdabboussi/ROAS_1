BEGIN;

ALTER TABLE public.slack_observation_events
  DROP CONSTRAINT IF EXISTS slack_observation_events_source_check;

ALTER TABLE public.slack_observation_events
  ADD CONSTRAINT slack_observation_events_source_check
  CHECK (source IN ('webhook', 'reconciliation', 'backfill', 'page_grader'));

COMMENT ON COLUMN public.slack_observation_events.source IS
  'Capture path for an idempotent Slack event. page_grader preserves client-scoped context from the ROAS Portal source cache.';

COMMIT;
