-- Phase 3 of org-Fathom (.docs/plans/fathom-org-sharing.md):
-- Denormalize the Fathom rule's source picker onto the trigger row so the
-- webhook router can match without parsing JSONB at the rule level.
--
-- Source shape mirrors `FathomSourceSchema` in spaces DTOs:
--   {"mode":"self"}
--   {"mode":"user","user_integration_id":"<uuid>"}
--   {"mode":"team","team_id":"<uuid>"}
--
-- Existing fathom rows pre-Phase-3 had no concept of a source picker; their
-- intent matches `self` (rule owner listens to their own Fathom). Backfill
-- accordingly so behavior is unchanged.

BEGIN;

ALTER TABLE public.space_external_automation_triggers
  ADD COLUMN IF NOT EXISTS source JSONB;

UPDATE public.space_external_automation_triggers
SET source = '{"mode":"self"}'::jsonb
WHERE provider = 'fathom' AND source IS NULL;

-- Three partial indexes mirror the three webhook lookup paths in
-- `SpaceAutomationService.processFathomRecordingEvent`. Partials keep them
-- tiny; only fathom + active + matching mode are indexed.

CREATE INDEX IF NOT EXISTS idx_seat_fathom_self_user
  ON public.space_external_automation_triggers (user_id)
  WHERE provider = 'fathom'
    AND status = 'active'
    AND (source ->> 'mode') = 'self';

CREATE INDEX IF NOT EXISTS idx_seat_fathom_user_integration
  ON public.space_external_automation_triggers ((source ->> 'user_integration_id'))
  WHERE provider = 'fathom'
    AND status = 'active'
    AND (source ->> 'mode') = 'user';

CREATE INDEX IF NOT EXISTS idx_seat_fathom_team
  ON public.space_external_automation_triggers ((source ->> 'team_id'))
  WHERE provider = 'fathom'
    AND status = 'active'
    AND (source ->> 'mode') = 'team';

COMMIT;
