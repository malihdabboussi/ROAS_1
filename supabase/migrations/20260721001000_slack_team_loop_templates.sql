BEGIN;

WITH templates(template_key, title, description, sort_order, loop_kind) AS (
  VALUES
    ('slack-person-brain-compounding', 'Slack Person Brain Compounding', 'Observes explicit Slack evidence and prepares durable Person Brain memories for the people involved.', 600, 'brain_compounding'),
    ('slack-workflow-discovery', 'Slack Workflow Discovery', 'Finds repeated manual work in Slack and creates reviewable automation opportunities with evidence.', 610, 'workflow_discovery'),
    ('slack-unanswered-questions', 'Slack Unanswered Questions', 'Finds direct questions that appear unanswered and drafts a safe follow-up for review.', 620, 'unanswered_questions'),
    ('slack-client-risk', 'Slack Stalled Commitments & Client Risk', 'Surfaces explicit blockers, missed commitments, client dissatisfaction, and delivery risk with source evidence.', 630, 'client_risk')
)
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
SELECT
  template_key,
  title,
  description,
  'Starts in Shadow',
  true,
  true,
  ARRAY['team_ops']::text[],
  'slack',
  'slack',
  jsonb_build_object(
    'name', title,
    'enabled', false,
    'trigger', jsonb_build_object(
      'type', 'schedule',
      'schedule', jsonb_build_object('mode', 'preset', 'preset', 'minutes', 'interval', 15),
      'timezone', 'America/Los_Angeles'
    ),
    'actions', jsonb_build_array(
      jsonb_build_object(
        'type', 'observe_slack_team',
        'loop_kind', loop_kind,
        'delivery_mode', 'shadow',
        'channel_ids', '[]'::jsonb,
        'person_ids', '[]'::jsonb,
        'lookback_minutes', 30,
        'daily_limit', 10,
        'quiet_hours', jsonb_build_object(
          'start', '22:00',
          'end', '07:00',
          'timezone', 'America/Los_Angeles'
        )
      )
    )
  ),
  sort_order
FROM templates
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

COMMIT;
