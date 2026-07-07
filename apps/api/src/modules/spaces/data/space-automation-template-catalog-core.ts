import type { SpaceAutomationTemplateSeed } from './space-automation-template-catalog.types'
import { draft } from './space-automation-template-catalog-builders'

export const CORE_AUTOMATION_TEMPLATES: SpaceAutomationTemplateSeed[] = [
  {
    template_key: 'fathom-call-follow-ups',
    featured: true,
    workflows: ['sales_cs', 'team_ops'],
    integration: 'fathom',
    sort_order: 10,
    title: 'Fathom Call Follow-Ups',
    description:
      'When a Fathom recording is ready, Vibey suggests concrete follow-up tasks for the call owner.',
    badge: 'Ready',
    body: {
      name: 'Fathom Call Follow-Ups',
      enabled: true,
      trigger: { type: 'external_fathom_recording_ready', source: { mode: 'self' } },
      actions: [
        {
          type: 'agent_suggest_tasks',
          agent_key: 'vibey',
          max_suggestions: 10,
          instructions:
            'Suggest concrete follow-up tasks from this Fathom meeting. Focus on tasks that need human review, approval, outreach, or execution.',
        },
      ],
    },
  },
  {
    template_key: 'fathom-call-recap-channel',
    workflows: ['sales_cs', 'team_ops'],
    integration: 'fathom',
    sort_order: 20,
    title: 'Fathom Call Recap To Channel',
    description:
      'Posts a concise meeting recap, action items, and meeting link into a Space channel.',
    badge: 'Needs channel',
    body: draft(
      'Fathom Call Recap To Channel',
      { type: 'external_fathom_recording_ready', source: { mode: 'self' } },
      [
        {
          type: 'send_channel_message',
          channel_id: '',
          content_template:
            '**Fathom recap:** {{trigger.title}}\n\n{{trigger.summary}}\n\nAction items:\n{{trigger.action_items}}\n\nRecording: {{trigger.url}}',
        },
      ],
    ),
  },
  {
    template_key: 'sales-call-crm-note',
    featured: true,
    workflows: ['sales_cs'],
    integration: 'fathom',
    sort_order: 30,
    title: 'Sales Call To CRM Note',
    description:
      'Creates a contact from the first non-recorder Fathom attendee and attaches the meeting recap as a CRM note.',
    badge: 'Review contact',
    body: draft(
      'Sales Call To CRM Note',
      { type: 'external_fathom_recording_ready', source: { mode: 'self' } },
      [
        {
          type: 'create_contact',
          email_template: '{{trigger.primary_attendee_email}}',
          name_template: '{{trigger.primary_attendee_name}}',
          source: 'fathom',
        },
        {
          type: 'attach_note_to_contact',
          contact_id: '{{steps.1.contact_id}}',
          content_template:
            'Meeting: {{trigger.title}}\n\nSummary:\n{{trigger.summary}}\n\nAction items:\n{{trigger.action_items}}\n\nRecording: {{trigger.url}}',
        },
      ],
    ),
  },
  {
    template_key: 'inbound-email-task',
    featured: true,
    workflows: ['inbound_comms'],
    integration: 'email',
    sort_order: 40,
    title: 'Inbound Email To Task',
    description:
      'Turns a new Gmail or Outlook email into a task with sender, CC, subject, and body.',
    badge: 'Needs account',
    body: draft(
      'Inbound Email To Task',
      {
        type: 'external_email_received',
        provider: 'gmail',
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: '{{trigger.subject}}',
          notes_template: 'From: {{trigger.from}}\nCC: {{trigger.cc}}\n\n{{trigger.body}}',
        },
      ],
    ),
  },
  {
    template_key: 'vip-email-alert',
    workflows: ['inbound_comms', 'sales_cs'],
    integration: 'email',
    sort_order: 50,
    title: 'VIP Email Alert',
    description: 'Flags emails from an important sender/domain and notifies the team channel.',
    badge: 'Needs account',
    body: draft(
      'VIP Email Alert',
      {
        type: 'external_email_received',
        provider: 'gmail',
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        connected_account_id: '',
        from_contains: '@customer.com',
      },
      [
        {
          type: 'create_task',
          title_template: 'VIP email: {{trigger.subject}}',
          priority: 'urgent',
          notes_template: 'From: {{trigger.from}}\n\n{{trigger.body}}',
        },
        {
          type: 'send_channel_message',
          channel_id: '',
          content_template: 'VIP email from {{trigger.from}}: {{trigger.subject}}',
        },
      ],
    ),
  },
  {
    template_key: 'slack-dm-task',
    workflows: ['inbound_comms'],
    integration: 'slack',
    sort_order: 60,
    title: 'Slack DM To Task',
    description: 'Turns a Slack direct message into a task so the team can track it.',
    badge: 'Needs Slack',
    body: draft(
      'Slack DM To Task',
      {
        type: 'external_slack_message_received',
        trigger_slug: 'SLACK_RECEIVE_DIRECT_MESSAGE',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Slack DM: {{trigger.text}}',
          notes_template:
            'From: {{trigger.from}}\nChannel: {{trigger.channel_id}}\n\n{{trigger.text}}',
        },
      ],
    ),
  },
  {
    template_key: 'slack-mention-agent',
    is_new: true,
    workflows: ['inbound_comms', 'team_ops'],
    integration: 'slack',
    sort_order: 70,
    title: 'Slack Channel Mention To Agent',
    description: 'Creates a task from a matching Slack message, then sends it to Vibey for triage.',
    badge: 'Needs Slack',
    body: draft(
      'Slack Channel Mention To Agent',
      {
        type: 'external_slack_message_received',
        trigger_slug: 'SLACK_CHANNEL_MESSAGE_RECEIVED',
        connected_account_id: '',
        text_contains: '@vibey',
      },
      [
        {
          type: 'create_task',
          title_template: 'Slack request: {{trigger.text}}',
          assignees: [{ type: 'agent', id: 'vibey' }],
          notes_template:
            'From: {{trigger.from}}\nChannel: {{trigger.channel_id}}\n\n{{trigger.text}}',
        },
        {
          type: 'send_to_agent',
          agent_key: 'vibey',
          target_item_ref: '{{steps.1.item_id}}',
          prompt_template:
            'Triage this Slack request and decide the next best action.\n\nMessage:\n{{trigger.text}}\n\nSender: {{trigger.from}}',
        },
      ],
    ),
  },
  {
    template_key: 'form-submission-contact',
    workflows: ['sales_cs'],
    trigger_group: 'forms',
    sort_order: 80,
    title: 'Form Submission To Contact',
    description: 'Creates a CRM contact from submitted form answers.',
    badge: 'Needs form',
    body: draft('Form Submission To Contact', { type: 'form_submitted', form_id: '' }, [
      {
        type: 'create_contact',
        email_template: '{{trigger.answers.email}}',
        name_template: '{{trigger.answers.name}}',
        source: 'form',
      },
    ]),
  },
  {
    template_key: 'form-submission-sales-task',
    featured: true,
    workflows: ['sales_cs'],
    trigger_group: 'forms',
    sort_order: 90,
    title: 'Form Submission To Sales Task',
    description: 'Creates a sales follow-up task whenever a lead form is submitted.',
    badge: 'Needs form',
    body: draft('Form Submission To Sales Task', { type: 'form_submitted', form_id: '' }, [
      {
        type: 'create_task',
        title_template: 'Follow up with {{trigger.answers.name}}',
        priority: 'high',
        notes_template:
          'Email: {{trigger.answers.email}}\n\nForm answers:\n{{trigger.answers}}\n\nFollow up while context is fresh.',
      },
    ]),
  },
  {
    template_key: 'new-contact-welcome-sequence',
    workflows: ['sales_cs'],
    trigger_group: 'contacts',
    sort_order: 100,
    title: 'New Contact Welcome Sequence',
    description: 'Starts a welcome workflow by tagging the contact and creating a review task.',
    badge: 'Review tag',
    body: draft('New Contact Welcome Sequence', { type: 'contact_created' }, [
      {
        type: 'add_contact_tag',
        contact_id: '{{trigger.contact_id}}',
        tag: 'welcome_pending',
      },
      {
        type: 'create_task',
        title_template: 'Review welcome next step for contact {{trigger.contact_id}}',
        notes_template:
          'A new contact was created. Review their source and decide whether to send the welcome sequence.',
      },
    ]),
  },
  {
    template_key: 'customer-tag-follow-up',
    workflows: ['sales_cs'],
    trigger_group: 'contacts',
    sort_order: 110,
    title: 'Customer Tag Follow-Up',
    description: 'Creates a follow-up task when a contact receives a specific tag.',
    badge: 'Needs tag',
    body: draft('Customer Tag Follow-Up', { type: 'contact_tag_added', tag: 'customer' }, [
      {
        type: 'create_task',
        title_template: 'Follow up with tagged contact {{trigger.contact_id}}',
        notes_template: 'Contact {{trigger.contact_id}} was tagged {{trigger.tag}}.',
      },
    ]),
  },
  {
    template_key: 'urgent-priority-channel',
    workflows: ['team_ops'],
    trigger_group: 'tasks',
    sort_order: 120,
    title: 'High Priority Task Notification',
    description: 'Notifies a channel when a task becomes urgent.',
    badge: 'Needs channel',
    body: draft('High Priority Task Notification', { type: 'priority_changed', to: 'urgent' }, [
      {
        type: 'send_channel_message',
        channel_id: '',
        content_template:
          'Urgent task: {{task.title}}\nOwner: {{task.assignee}}\nDue: {{task.due_date}}',
      },
    ]),
  },
  {
    template_key: 'done-next-step',
    featured: true,
    workflows: ['team_ops'],
    trigger_group: 'tasks',
    sort_order: 130,
    title: 'Task Done Creates Next Step',
    description: 'Adds a review/follow-up subtask when a task moves to Done.',
    badge: 'Ready',
    body: {
      name: 'Task Done Creates Next Step',
      enabled: false,
      trigger: { type: 'status_change', to: 'done' },
      actions: [
        {
          type: 'create_subtask',
          title_template: 'Review next step for {{task.title}}',
        },
      ],
    },
  },
  {
    template_key: 'task-created-brain-context',
    featured: true,
    is_new: true,
    workflows: ['team_ops'],
    trigger_group: 'brain',
    sort_order: 135,
    title: 'New Task Brain Context',
    description:
      'When a task is created, Atlas searches the relevant brains and adds useful context to the task description.',
    badge: 'Ready',
    body: {
      name: 'New Task Brain Context',
      enabled: false,
      trigger: { type: 'task_created' },
      actions: [{ type: 'add_brain_context_to_task' }],
    },
  },
  {
    template_key: 'artifact-published-announcement',
    is_new: true,
    workflows: ['content_artifacts'],
    trigger_group: 'artifacts',
    sort_order: 140,
    title: 'Artifact Published Announcement',
    description: 'Posts a team update when an artifact is published.',
    badge: 'Needs channel',
    body: draft(
      'Artifact Published Announcement',
      { type: 'artifact_lifecycle', lifecycle_event: 'published' },
      [
        {
          type: 'send_channel_message',
          channel_id: '',
          content_template:
            'Published {{trigger.artifact_kind}} artifact: {{trigger.artifact_id}}\nStatus: {{trigger.status}}',
        },
      ],
    ),
  },
  {
    template_key: 'weekly-social-outlier-digest',
    featured: true,
    is_new: true,
    workflows: ['content_artifacts', 'team_ops'],
    trigger_group: 'schedule',
    sort_order: 150,
    title: 'Weekly social outlier digest',
    description:
      'Syncs social research, picks top outliers, enriches hooks/transcripts, creates a digest task, and hands it to an agent.',
    badge: 'Ready',
    body: draft(
      'Weekly social outlier digest',
      {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'weekly', weekdays: [0], time: '09:00' },
        timezone: 'UTC',
      },
      [
        { type: 'sync_social_research', platform: 'both', sync_mode: 'use_existing' },
        {
          type: 'select_social_outliers',
          platform: 'both',
          min_outlier_score: 2,
          limit: 10,
          since_days: 30,
        },
        {
          type: 'enrich_social_research_items',
          enrichments: ['caption', 'hook', 'transcript'],
        },
        {
          type: 'create_task',
          title_template: 'Weekly social outlier digest',
          assignees: [{ type: 'agent', id: 'vibey' }],
          notes_template: '{{steps.3.digest}}',
        },
        {
          type: 'send_to_agent',
          agent_key: 'vibey',
          target_item_ref: '{{steps.4.item_id}}',
          prompt_template:
            'Use the social outliers in this task. Create the requested output from the hooks, captions, transcripts, and outlier scores.\n\n{{task.description}}',
        },
      ],
    ),
  },
  {
    template_key: 'weekly-space-digest',
    featured: true,
    is_new: true,
    workflows: ['team_ops'],
    trigger_group: 'schedule',
    sort_order: 160,
    title: 'Weekly Space Digest',
    description: 'Creates a weekly digest task for reviewing progress, blockers, and next actions.',
    badge: 'Ready',
    body: {
      name: 'Weekly Space Digest',
      enabled: false,
      trigger: {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'weekly', weekdays: [1], time: '09:00' },
        timezone: 'UTC',
      },
      actions: [
        {
          type: 'create_task',
          title_template: 'Weekly digest for {{space.title}}',
          notes_template:
            'Review this space for shipped work, blockers, overdue tasks, and next actions. Fired at {{trigger.fired_at}}.',
        },
      ],
    },
  },
]
