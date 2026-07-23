BEGIN;

UPDATE public.space_automation_templates
SET
  body = jsonb_set(body, '{trigger,schedule,interval}', '5'::jsonb, true),
  version = version + 1,
  updated_at = now()
WHERE template_key = 'slack-team-observation';

UPDATE public.space_automations
SET
  trigger = jsonb_set(trigger, '{schedule,interval}', '5'::jsonb, true),
  updated_at = now()
WHERE actions @> '[{"type":"observe_slack_team"}]'::jsonb
  AND enabled = true;

COMMIT;
