BEGIN;

ALTER TABLE public.space_external_automation_triggers
  ADD COLUMN IF NOT EXISTS source JSONB;

UPDATE public.space_external_automation_triggers
SET source = '{"mode":"self"}'::jsonb
WHERE provider = 'fathom'
  AND source IS NULL;

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

NOTIFY pgrst, 'reload schema';

COMMIT;
