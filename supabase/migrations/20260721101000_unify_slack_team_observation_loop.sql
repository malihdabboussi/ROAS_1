BEGIN;

INSERT INTO public.space_automation_templates (
  template_key,
  title,
  description,
  badge,
  featured,
  is_new,
  workflows,
  integration,
  trigger_group,
  body,
  sort_order
)
VALUES (
  'slack-team-observation',
  'Slack Team Intelligence',
  'Observes Slack once, then routes Person Brain facts, workflow opportunities, unanswered questions, and client risks into reviewable Shadow proposals.',
  'Runs in Shadow',
  true,
  true,
  ARRAY['team_ops']::text[],
  'slack',
  'slack',
  jsonb_build_object(
    'name', 'Slack Team Intelligence',
    'enabled', true,
    'trigger', jsonb_build_object(
      'type', 'schedule',
      'schedule', jsonb_build_object('mode', 'preset', 'preset', 'minutes', 'interval', 15),
      'timezone', 'America/Los_Angeles'
    ),
    'actions', jsonb_build_array(
      jsonb_build_object(
        'type', 'observe_slack_team',
        'loop_kind', 'all',
        'delivery_mode', 'shadow',
        'channel_ids', '[]'::jsonb,
        'person_ids', '[]'::jsonb,
        'lookback_minutes', 30,
        'daily_limit', 40,
        'quiet_hours', jsonb_build_object(
          'start', '22:00',
          'end', '07:00',
          'timezone', 'America/Los_Angeles'
        )
      )
    )
  ),
  600
)
ON CONFLICT (template_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  badge = EXCLUDED.badge,
  featured = EXCLUDED.featured,
  is_new = EXCLUDED.is_new,
  workflows = EXCLUDED.workflows,
  integration = EXCLUDED.integration,
  trigger_group = EXCLUDED.trigger_group,
  body = EXCLUDED.body,
  sort_order = EXCLUDED.sort_order,
  version = public.space_automation_templates.version + 1,
  updated_at = now();

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY space_id ORDER BY created_at, id) AS sequence
  FROM public.space_automations
  WHERE actions @> '[{"type":"observe_slack_team"}]'::jsonb
)
UPDATE public.space_automations automation
SET
  name = CASE WHEN ranked.sequence = 1 THEN 'Slack Team Intelligence' ELSE automation.name END,
  enabled = ranked.sequence = 1,
  actions = CASE
    WHEN ranked.sequence = 1
    THEN jsonb_set(automation.actions, '{0,loop_kind}', '"all"'::jsonb, true)
    ELSE automation.actions
  END,
  updated_at = now()
FROM ranked
WHERE automation.id = ranked.id;

DELETE FROM public.space_automation_templates
WHERE template_key IN (
  'slack-person-brain-compounding',
  'slack-workflow-discovery',
  'slack-unanswered-questions',
  'slack-client-risk'
);

COMMIT;
