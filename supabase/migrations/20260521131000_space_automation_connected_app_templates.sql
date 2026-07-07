-- Connected-app Flow templates (13 supported rows)
BEGIN;

DELETE FROM public.space_automation_templates
WHERE template_key IN ('hubspot-new-contact-follow-up', 'hubspot-deal-stage-task');

INSERT INTO public.space_automation_templates (
  template_key, title, description, badge, featured, is_new, workflows, integration, trigger_group, body, sort_order
)
VALUES
  (
    'google-calendar-prep-task',
    'Google Calendar Prep Task',
    'Creates a prep task when a Google Calendar event is starting soon.',
    'Needs account',
    false,
    true,
    ARRAY['team_ops']::text[],
    'google_calendar',
    NULL,
    '{"is_draft":true,"name":"Google Calendar Prep Task","enabled":false,"trigger":{"type":"external_app_event","provider":"googlecalendar","trigger_slug":"GOOGLECALENDAR_EVENT_STARTING_SOON_TRIGGER","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Prep for upcoming calendar event","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"}]}'::jsonb,
    400
  ),
  (
    'google-calendar-new-event-review',
    'Google Calendar New Event Review',
    'Creates a review task when a new Google Calendar event is created.',
    'Needs account',
    false,
    true,
    ARRAY['team_ops']::text[],
    'google_calendar',
    NULL,
    '{"is_draft":true,"name":"Google Calendar New Event Review","enabled":false,"trigger":{"type":"external_app_event","provider":"googlecalendar","trigger_slug":"GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Review new calendar event","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"}]}'::jsonb,
    410
  ),
  (
    'google-drive-new-file-review',
    'Google Drive New File Review',
    'Creates a review task when a new file is added in Google Drive.',
    'Needs account',
    false,
    true,
    ARRAY['content_artifacts', 'team_ops']::text[],
    'google_drive',
    NULL,
    '{"is_draft":true,"name":"Google Drive New File Review","enabled":false,"trigger":{"type":"external_app_event","provider":"googledrive","trigger_slug":"GOOGLEDRIVE_FILE_CREATED_TRIGGER","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Review new Google Drive file","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"}]}'::jsonb,
    420
  ),
  (
    'google-drive-file-updated-review',
    'Google Drive File Updated Review',
    'Creates a review task when a Google Drive file is updated.',
    'Needs account',
    false,
    true,
    ARRAY['content_artifacts', 'team_ops']::text[],
    'google_drive',
    NULL,
    '{"is_draft":true,"name":"Google Drive File Updated Review","enabled":false,"trigger":{"type":"external_app_event","provider":"googledrive","trigger_slug":"GOOGLEDRIVE_FILE_UPDATED_TRIGGER","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Review updated Google Drive file","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"}]}'::jsonb,
    430
  ),
  (
    'google-drive-comment-follow-up',
    'Google Drive Comment Follow-Up',
    'Creates a follow-up task when someone comments on a Google Drive file.',
    'Needs account',
    false,
    true,
    ARRAY['team_ops']::text[],
    'google_drive',
    NULL,
    '{"is_draft":true,"name":"Google Drive Comment Follow-Up","enabled":false,"trigger":{"type":"external_app_event","provider":"googledrive","trigger_slug":"GOOGLEDRIVE_COMMENT_ADDED_TRIGGER","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Follow up on Google Drive comment","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"}]}'::jsonb,
    440
  ),
  (
    'google-sheets-new-row-lead',
    'Google Sheets New Row Lead',
    'Creates a task and sends Vibey to review a new Google Sheets row from a connected spreadsheet.',
    'Needs account',
    false,
    true,
    ARRAY['sales_cs', 'inbound_comms']::text[],
    'google_sheets',
    NULL,
    '{"is_draft":true,"name":"Google Sheets New Row Lead","enabled":false,"trigger":{"type":"external_app_event","provider":"googlesheets","trigger_slug":"GOOGLESHEETS_NEW_ROWS_TRIGGER","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Review new Google Sheets row","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"},{"type":"send_to_agent","agent_key":"vibey","prompt_template":"Review this spreadsheet row payload and summarize the next action.\n\n{{task.description}}"}]}'::jsonb,
    450
  ),
  (
    'google-sheets-row-change-review',
    'Google Sheets Row Change Review',
    'Creates a review task when a Google Sheets row changes.',
    'Needs account',
    false,
    true,
    ARRAY['sales_cs', 'team_ops']::text[],
    'google_sheets',
    NULL,
    '{"is_draft":true,"name":"Google Sheets Row Change Review","enabled":false,"trigger":{"type":"external_app_event","provider":"googlesheets","trigger_slug":"GOOGLESHEETS_SPREADSHEET_ROW_CHANGED_TRIGGER","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Review changed Google Sheets row","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"}]}'::jsonb,
    460
  ),
  (
    'salesforce-new-lead-qualification',
    'Salesforce New Lead Qualification',
    'Creates a qualification task and asks Vibey to score a new Salesforce lead from the event payload.',
    'Needs account',
    false,
    true,
    ARRAY['sales_cs']::text[],
    'salesforce',
    NULL,
    '{"is_draft":true,"name":"Salesforce New Lead Qualification","enabled":false,"trigger":{"type":"external_app_event","provider":"salesforce","trigger_slug":"SALESFORCE_NEW_LEAD_TRIGGER","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Qualify new Salesforce lead","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"},{"type":"send_to_agent","agent_key":"vibey","prompt_template":"Review this Salesforce lead payload and write a qualification summary plus recommended next step.\n\n{{task.description}}"}]}'::jsonb,
    490
  ),
  (
    'salesforce-opportunity-review',
    'Salesforce Opportunity Review',
    'Creates a review task when a Salesforce opportunity is created or updated.',
    'Needs account',
    false,
    true,
    ARRAY['sales_cs']::text[],
    'salesforce',
    NULL,
    '{"is_draft":true,"name":"Salesforce Opportunity Review","enabled":false,"trigger":{"type":"external_app_event","provider":"salesforce","trigger_slug":"SALESFORCE_NEW_OR_UPDATED_OPPORTUNITY_TRIGGER","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Review Salesforce opportunity update","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"}]}'::jsonb,
    500
  ),
  (
    'github-new-issue-triage',
    'GitHub New Issue Triage',
    'Creates a triage task and asks Vibey to classify a new GitHub issue from the event payload.',
    'Needs account',
    false,
    true,
    ARRAY['team_ops']::text[],
    'github',
    NULL,
    '{"is_draft":true,"name":"GitHub New Issue Triage","enabled":false,"trigger":{"type":"external_app_event","provider":"github","trigger_slug":"GITHUB_ISSUE_CREATED_TRIGGER","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Triage new GitHub issue","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"},{"type":"send_to_agent","agent_key":"vibey","prompt_template":"Review this GitHub issue payload. Classify severity, affected area, and recommended owner.\n\n{{task.description}}"}]}'::jsonb,
    510
  ),
  (
    'github-deployment-state-review',
    'GitHub Deployment State Review',
    'Creates a review task when a GitHub deployment state changes.',
    'Needs account',
    false,
    true,
    ARRAY['team_ops']::text[],
    'github',
    NULL,
    '{"is_draft":true,"name":"GitHub Deployment State Review","enabled":false,"trigger":{"type":"external_app_event","provider":"github","trigger_slug":"GITHUB_DEPLOYMENT_STATE_CHANGED_TRIGGER","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Review GitHub deployment state change","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"}]}'::jsonb,
    520
  ),
  (
    'notion-page-added-review',
    'Notion Page Added Review',
    'Creates a review task when a new page is added to a Notion database.',
    'Needs account',
    false,
    true,
    ARRAY['content_artifacts', 'team_ops']::text[],
    'notion',
    NULL,
    '{"is_draft":true,"name":"Notion Page Added Review","enabled":false,"trigger":{"type":"external_app_event","provider":"notion","trigger_slug":"NOTION_PAGE_ADDED_TO_DATABASE","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Review new Notion database page","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"}]}'::jsonb,
    530
  ),
  (
    'notion-page-updated-review',
    'Notion Page Updated Review',
    'Creates a review task when a Notion page is updated.',
    'Needs account',
    false,
    true,
    ARRAY['content_artifacts', 'team_ops']::text[],
    'notion',
    NULL,
    '{"is_draft":true,"name":"Notion Page Updated Review","enabled":false,"trigger":{"type":"external_app_event","provider":"notion","trigger_slug":"NOTION_PAGE_CONTENT_UPDATED","connected_account_id":""},"actions":[{"type":"create_task","title_template":"Review updated Notion page","notes_template":"Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}"}]}'::jsonb,
    540
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
