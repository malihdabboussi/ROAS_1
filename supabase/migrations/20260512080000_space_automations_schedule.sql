BEGIN;

-- Time-based ("schedule") trigger support for space automations.
-- The cron-style trigger config lives inside the existing `trigger` JSONB
-- (e.g. { type: 'schedule', schedule: {...}, timezone: 'America/New_York' }).
-- These two materialized columns let the apps/api `@Cron` job locate due rows
-- without parsing JSON, and record the last fire for audit.

ALTER TABLE public.space_automations
  ADD COLUMN IF NOT EXISTS schedule_next_fire_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS schedule_last_fired_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS space_automations_schedule_due_idx
  ON public.space_automations(schedule_next_fire_at)
  WHERE schedule_next_fire_at IS NOT NULL
    AND enabled = true
    AND is_draft = false;

-- Schedule runs have no source space item, so the runs audit table must
-- accept NULL item_id. The FK still cascades when a real item is deleted.
ALTER TABLE public.space_automation_runs
  ALTER COLUMN item_id DROP NOT NULL;

COMMIT;
