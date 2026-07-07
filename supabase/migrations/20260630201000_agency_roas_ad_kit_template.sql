-- Agency ROAS Ad Kit (Slack) preset — concepts → copy → human gate → design.
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
  'agency-roas-ad-kit-slack',
  'ROAS Ad Kit (Slack)',
  'When a message lands in your Slack channel, runs ad concepts → copy → human approval → ad design on Blaze.',
  'Needs Slack',
  true,
  true,
  ARRAY['agency_ops']::text[],
  'slack',
  'slack',
  '{"is_draft":true,"name":"ROAS Ad Kit (Slack)","enabled":false,"trigger":{"type":"external_slack_message_received","trigger_slug":"SLACK_CHANNEL_MESSAGE_RECEIVED","connected_account_id":"","channel_id":""},"actions":[{"type":"create_task","title_template":"ROAS ad brief: {{trigger.text}}","priority":"high","notes_template":"Slack ad brief from {{trigger.from}}\n\n{{trigger.text}}\n\nChannel: {{trigger.channel_id}}"},{"type":"send_to_agent","agent_key":"ads_manager","target_item_ref":"{{steps.1.item_id}}","prompt_template":"Generate ROAS ad concepts for this Slack brief.\n\nRead skills/roas-ad-concepts/SKILL.md before executing.\n\nBrief:\n{{trigger.text}}\n\nFrom: {{trigger.from}}","output_type":"document_artifact","continuation":"after_task_completes","completed_status":"in_progress"},{"type":"send_to_agent","agent_key":"ads_manager","target_item_ref":"{{steps.1.item_id}}","prompt_template":"Write ROAS Meta ad copy from the approved concepts.\n\nRead skills/roas-ad-copy/SKILL.md and references/human-written-copy.md before executing.\n\nBrief:\n{{trigger.text}}\n\nConcepts:\n{{steps.2.output}}","output_type":"document_artifact","continuation":"after_task_completes","completed_status":"in_progress"},{"type":"human_gate","target_item_ref":"{{steps.1.item_id}}","waiting_status":"in_review","resume_on_status":"done","message_template":"Review the ad concepts and copy on this task. Move to Done when approved to run ad design."},{"type":"send_to_agent","agent_key":"ads_manager","target_item_ref":"{{steps.1.item_id}}","prompt_template":"Render ROAS Meta ad creatives from the approved copy.\n\nRead skills/roas-ad-design/SKILL.md before executing.\n\nBrief:\n{{trigger.text}}\n\nApproved copy:\n{{steps.3.output}}","output_type":"document_artifact","continuation":"after_task_completes","completed_status":"in_review"},{"type":"send_slack_message","channel_id":"{{trigger.channel_id}}","text_template":"ROAS ad kit complete — concepts, copy, and design are ready on the linked task."}]}'::jsonb,
  420
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
  updated_at = now();

COMMIT;
