-- Agency flow presets: funnel build pipeline (task + Slack triggers).
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
VALUES
  (
    'agency-funnel-build',
    'Agency Funnel Build',
    'When a funnel brief task is created, runs copy → wireframe → design agent steps in sequence.',
    'Agency preset',
    true,
    true,
    ARRAY['agency_ops']::text[],
    NULL,
    'tasks',
    '{"is_draft":true,"name":"Agency Funnel Build","enabled":false,"trigger":{"type":"task_created"},"actions":[{"type":"send_to_agent","agent_key":"copywriter","target_item_ref":"trigger","prompt_template":"Write conversion-focused funnel copy for this client brief.\n\nTitle: {{task.title}}\n\nBrief:\n{{task.description}}\n\nDeliver headline, subhead, body sections, and CTA copy ready for wireframe and design.","output_type":"document_artifact","continuation":"after_task_completes","completed_status":"in_progress"},{"type":"send_to_agent","agent_key":"vibey","target_item_ref":"trigger","prompt_template":"Create a funnel wireframe structure from the approved copy.\n\nRead skills/funnel-wireframe/SKILL.md before executing.\n\nClient brief:\n{{task.title}}\n{{task.description}}\n\nCopy from previous step:\n{{steps.1.output}}\n\nOutput section order, hierarchy, and layout notes — no final HTML yet.","output_type":"document_artifact","continuation":"after_task_completes","completed_status":"in_progress"},{"type":"send_to_agent","agent_key":"vibey","target_item_ref":"trigger","prompt_template":"Build the funnel using funnel-builder skill.\n\nRead skills/funnel-builder/SKILL.md before executing.\n\nBrief:\n{{task.title}}\n{{task.description}}\n\nCopy:\n{{steps.1.output}}\n\nWireframe:\n{{steps.2.output}}\n\nProduce the HTML bundle funnel artifact.","output_type":"funnel_artifact","continuation":"after_task_completes","completed_status":"in_review"},{"type":"add_comment","message_template":"Funnel pipeline complete. Copy, wireframe, and funnel artifact are linked to this task."}]}'::jsonb,
    400
  ),
  (
    'agency-funnel-build-slack',
    'Agency Funnel Build (Slack)',
    'Starts the agency funnel pipeline when a Slack DM arrives — creates a brief task, then runs copy → wireframe → design.',
    'Needs Slack',
    true,
    true,
    ARRAY['agency_ops']::text[],
    'slack',
    NULL,
    '{"is_draft":true,"name":"Agency Funnel Build (Slack)","enabled":false,"trigger":{"type":"external_slack_message_received","trigger_slug":"SLACK_RECEIVE_DIRECT_MESSAGE","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Funnel brief: {{trigger.text}}","priority":"high","notes_template":"Slack brief from {{trigger.from}}\n\n{{trigger.text}}\n\nChannel: {{trigger.channel_id}}"},{"type":"send_to_agent","agent_key":"copywriter","target_item_ref":"{{steps.1.item_id}}","prompt_template":"Write conversion-focused funnel copy for this Slack brief.\n\n{{trigger.text}}\n\nDeliver headline, subhead, body sections, and CTA copy.","output_type":"document_artifact","continuation":"after_task_completes","completed_status":"in_progress"},{"type":"send_to_agent","agent_key":"vibey","target_item_ref":"{{steps.1.item_id}}","prompt_template":"Create a funnel wireframe structure from the approved copy.\n\nRead skills/funnel-wireframe/SKILL.md before executing.\n\nSlack brief:\n{{trigger.text}}\n\nCopy:\n{{steps.2.output}}\n\nOutput section order, hierarchy, and layout notes.","output_type":"document_artifact","continuation":"after_task_completes","completed_status":"in_progress"},{"type":"send_to_agent","agent_key":"vibey","target_item_ref":"{{steps.1.item_id}}","prompt_template":"Build the funnel using funnel-builder skill.\n\nRead skills/funnel-builder/SKILL.md before executing.\n\nBrief:\n{{trigger.text}}\n\nCopy:\n{{steps.2.output}}\n\nWireframe:\n{{steps.3.output}}\n\nProduce the HTML bundle funnel artifact.","output_type":"funnel_artifact","continuation":"after_task_completes","completed_status":"in_review"},{"type":"send_slack_message","connected_account_id":"","channel_id":"{{trigger.channel_id}}","text_template":"Funnel pipeline started for your brief. I will reply here when copy, wireframe, and design are ready."}]}'::jsonb,
    410
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

COMMIT;
