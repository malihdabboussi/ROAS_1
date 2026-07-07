import type { SpaceAutomationTemplateSeed } from './space-automation-template-catalog.types'
import { draft } from './space-automation-template-catalog-builders'

export const CONNECTED_APP_AUTOMATION_TEMPLATES: SpaceAutomationTemplateSeed[] = [
  {
    template_key: 'google-calendar-prep-task',
    is_new: true,
    workflows: ['team_ops'],
    integration: 'google_calendar',
    sort_order: 400,
    title: 'Google Calendar Prep Task',
    description: 'Creates a prep task when a Google Calendar event is starting soon.',
    badge: 'Needs account',
    body: draft(
      'Google Calendar Prep Task',
      {
        type: 'external_app_event',
        provider: 'googlecalendar',
        trigger_slug: 'GOOGLECALENDAR_EVENT_STARTING_SOON_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Prep for upcoming calendar event',
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
      ],
    ),
  },
  {
    template_key: 'google-calendar-new-event-review',
    is_new: true,
    workflows: ['team_ops'],
    integration: 'google_calendar',
    sort_order: 410,
    title: 'Google Calendar New Event Review',
    description: 'Creates a review task when a new Google Calendar event is created.',
    badge: 'Needs account',
    body: draft(
      'Google Calendar New Event Review',
      {
        type: 'external_app_event',
        provider: 'googlecalendar',
        trigger_slug: 'GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Review new calendar event',
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
      ],
    ),
  },
  {
    template_key: 'google-drive-new-file-review',
    is_new: true,
    workflows: ['content_artifacts', 'team_ops'],
    integration: 'google_drive',
    sort_order: 420,
    title: 'Google Drive New File Review',
    description: 'Creates a review task when a new file is added in Google Drive.',
    badge: 'Needs account',
    body: draft(
      'Google Drive New File Review',
      {
        type: 'external_app_event',
        provider: 'googledrive',
        trigger_slug: 'GOOGLEDRIVE_FILE_CREATED_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Review new Google Drive file',
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
      ],
    ),
  },
  {
    template_key: 'google-drive-file-updated-review',
    is_new: true,
    workflows: ['content_artifacts', 'team_ops'],
    integration: 'google_drive',
    sort_order: 430,
    title: 'Google Drive File Updated Review',
    description: 'Creates a review task when a Google Drive file is updated.',
    badge: 'Needs account',
    body: draft(
      'Google Drive File Updated Review',
      {
        type: 'external_app_event',
        provider: 'googledrive',
        trigger_slug: 'GOOGLEDRIVE_FILE_UPDATED_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Review updated Google Drive file',
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
      ],
    ),
  },
  {
    template_key: 'google-drive-comment-follow-up',
    is_new: true,
    workflows: ['team_ops'],
    integration: 'google_drive',
    sort_order: 440,
    title: 'Google Drive Comment Follow-Up',
    description: 'Creates a follow-up task when someone comments on a Google Drive file.',
    badge: 'Needs account',
    body: draft(
      'Google Drive Comment Follow-Up',
      {
        type: 'external_app_event',
        provider: 'googledrive',
        trigger_slug: 'GOOGLEDRIVE_COMMENT_ADDED_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Follow up on Google Drive comment',
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
      ],
    ),
  },
  {
    template_key: 'google-sheets-new-row-lead',
    is_new: true,
    workflows: ['sales_cs', 'inbound_comms'],
    integration: 'google_sheets',
    sort_order: 450,
    title: 'Google Sheets New Row Lead',
    description:
      'Creates a task and sends Vibey to review a new Google Sheets row from a connected spreadsheet.',
    badge: 'Needs account',
    body: draft(
      'Google Sheets New Row Lead',
      {
        type: 'external_app_event',
        provider: 'googlesheets',
        trigger_slug: 'GOOGLESHEETS_NEW_ROWS_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Review new Google Sheets row',
          assignees: [{ type: 'agent', id: 'vibey' }],
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
        {
          type: 'send_to_agent',
          agent_key: 'vibey',
          target_item_ref: '{{steps.1.item_id}}',
          prompt_template:
            'Review this spreadsheet row payload and summarize the next action.\n\n{{task.description}}',
        },
      ],
    ),
  },
  {
    template_key: 'google-sheets-row-change-review',
    is_new: true,
    workflows: ['sales_cs', 'team_ops'],
    integration: 'google_sheets',
    sort_order: 460,
    title: 'Google Sheets Row Change Review',
    description: 'Creates a review task when a Google Sheets row changes.',
    badge: 'Needs account',
    body: draft(
      'Google Sheets Row Change Review',
      {
        type: 'external_app_event',
        provider: 'googlesheets',
        trigger_slug: 'GOOGLESHEETS_SPREADSHEET_ROW_CHANGED_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Review changed Google Sheets row',
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
      ],
    ),
  },
  {
    template_key: 'salesforce-new-lead-qualification',
    is_new: true,
    workflows: ['sales_cs'],
    integration: 'salesforce',
    sort_order: 490,
    title: 'Salesforce New Lead Qualification',
    description:
      'Creates a qualification task and asks Vibey to score a new Salesforce lead from the event payload.',
    badge: 'Needs account',
    body: draft(
      'Salesforce New Lead Qualification',
      {
        type: 'external_app_event',
        provider: 'salesforce',
        trigger_slug: 'SALESFORCE_NEW_LEAD_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Qualify new Salesforce lead',
          assignees: [{ type: 'agent', id: 'vibey' }],
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
        {
          type: 'send_to_agent',
          agent_key: 'vibey',
          target_item_ref: '{{steps.1.item_id}}',
          prompt_template:
            'Review this Salesforce lead payload and write a qualification summary plus recommended next step.\n\n{{task.description}}',
        },
      ],
    ),
  },
  {
    template_key: 'salesforce-opportunity-review',
    is_new: true,
    workflows: ['sales_cs'],
    integration: 'salesforce',
    sort_order: 500,
    title: 'Salesforce Opportunity Review',
    description: 'Creates a review task when a Salesforce opportunity is created or updated.',
    badge: 'Needs account',
    body: draft(
      'Salesforce Opportunity Review',
      {
        type: 'external_app_event',
        provider: 'salesforce',
        trigger_slug: 'SALESFORCE_NEW_OR_UPDATED_OPPORTUNITY_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Review Salesforce opportunity update',
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
      ],
    ),
  },
  {
    template_key: 'github-new-issue-triage',
    is_new: true,
    workflows: ['team_ops'],
    integration: 'github',
    sort_order: 510,
    title: 'GitHub New Issue Triage',
    description:
      'Creates a triage task and asks Vibey to classify a new GitHub issue from the event payload.',
    badge: 'Needs account',
    body: draft(
      'GitHub New Issue Triage',
      {
        type: 'external_app_event',
        provider: 'github',
        trigger_slug: 'GITHUB_ISSUE_CREATED_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Triage new GitHub issue',
          assignees: [{ type: 'agent', id: 'vibey' }],
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
        {
          type: 'send_to_agent',
          agent_key: 'vibey',
          target_item_ref: '{{steps.1.item_id}}',
          prompt_template:
            'Review this GitHub issue payload. Classify severity, affected area, and recommended owner.\n\n{{task.description}}',
        },
      ],
    ),
  },
  {
    template_key: 'github-deployment-state-review',
    is_new: true,
    workflows: ['team_ops'],
    integration: 'github',
    sort_order: 520,
    title: 'GitHub Deployment State Review',
    description: 'Creates a review task when a GitHub deployment state changes.',
    badge: 'Needs account',
    body: draft(
      'GitHub Deployment State Review',
      {
        type: 'external_app_event',
        provider: 'github',
        trigger_slug: 'GITHUB_DEPLOYMENT_STATE_CHANGED_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Review GitHub deployment state change',
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
      ],
    ),
  },
  {
    template_key: 'notion-page-added-review',
    is_new: true,
    workflows: ['content_artifacts', 'team_ops'],
    integration: 'notion',
    sort_order: 530,
    title: 'Notion Page Added Review',
    description: 'Creates a review task when a new page is added to a Notion database.',
    badge: 'Needs account',
    body: draft(
      'Notion Page Added Review',
      {
        type: 'external_app_event',
        provider: 'notion',
        trigger_slug: 'NOTION_PAGE_ADDED_TO_DATABASE',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Review new Notion database page',
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
      ],
    ),
  },
  {
    template_key: 'notion-page-updated-review',
    is_new: true,
    workflows: ['content_artifacts', 'team_ops'],
    integration: 'notion',
    sort_order: 540,
    title: 'Notion Page Updated Review',
    description: 'Creates a review task when a Notion page is updated.',
    badge: 'Needs account',
    body: draft(
      'Notion Page Updated Review',
      {
        type: 'external_app_event',
        provider: 'notion',
        trigger_slug: 'NOTION_PAGE_CONTENT_UPDATED',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Review updated Notion page',
          notes_template:
            'Provider: {{trigger.provider_label}}\nEvent: {{trigger.event_label}}\nTrigger: {{trigger.trigger_slug}}\n\nPayload:\n{{trigger.payload}}',
        },
      ],
    ),
  },
]
