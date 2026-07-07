import type { SpaceAutomationTemplateSeed } from './space-automation-template-catalog.types'
import { draft } from './space-automation-template-catalog-builders'

export const PHASE_TWO_AUTOMATION_TEMPLATES: SpaceAutomationTemplateSeed[] = [
  // --- Phase 2: 15 additional templates ---
  {
    template_key: 'daily-instagram-outliers-channel',
    featured: true,
    is_new: true,
    workflows: ['content_artifacts'],
    trigger_group: 'schedule',
    sort_order: 200,
    title: 'Daily Instagram Outliers Digest',
    description:
      'Every morning, sync Instagram research, pick top outliers, and post the digest to a channel.',
    badge: 'Needs channel',
    body: draft(
      'Daily Instagram Outliers Digest',
      {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'daily', time: '08:00' },
        timezone: 'UTC',
      },
      [
        { type: 'sync_social_research', platform: 'instagram', sync_mode: 'use_existing' },
        {
          type: 'select_social_outliers',
          platform: 'instagram',
          min_outlier_score: 2,
          limit: 5,
          since_days: 7,
        },
        {
          type: 'send_channel_message',
          channel_id: '',
          content_template: '**Instagram outliers**\n\n{{steps.2.digest}}',
        },
      ],
    ),
  },
  {
    template_key: 'weekly-tiktok-content-tasks',
    is_new: true,
    workflows: ['content_artifacts'],
    trigger_group: 'schedule',
    sort_order: 210,
    title: 'Weekly TikTok Content Tasks',
    description:
      'Syncs TikTok outliers weekly and asks Vibey to suggest content concepts from top performers.',
    badge: 'Ready',
    body: draft(
      'Weekly TikTok Content Tasks',
      {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'weekly', weekdays: [2], time: '09:00' },
        timezone: 'UTC',
      },
      [
        { type: 'sync_social_research', platform: 'tiktok', sync_mode: 'use_existing' },
        {
          type: 'select_social_outliers',
          platform: 'tiktok',
          min_outlier_score: 2,
          limit: 8,
          since_days: 14,
        },
        {
          type: 'create_task',
          title_template: 'TikTok content ideas from outliers',
          notes_template: '{{steps.2.digest}}',
        },
        {
          type: 'agent_suggest_tasks',
          agent_key: 'vibey',
          max_suggestions: 8,
          instructions:
            'Turn each TikTok outlier in the task notes into concrete content concepts the team can produce this week.',
        },
      ],
    ),
  },
  {
    template_key: 'nightly-social-enrich-digest',
    is_new: true,
    workflows: ['content_artifacts', 'team_ops'],
    trigger_group: 'schedule',
    sort_order: 220,
    title: 'Nightly Social Enrich Digest',
    description:
      'Nightly run that enriches top social outliers with hooks and transcripts, then posts a digest.',
    badge: 'Needs channel',
    body: draft(
      'Nightly Social Enrich Digest',
      {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'daily', time: '22:00' },
        timezone: 'UTC',
      },
      [
        { type: 'sync_social_research', platform: 'both', sync_mode: 'use_existing' },
        {
          type: 'select_social_outliers',
          platform: 'both',
          min_outlier_score: 2,
          limit: 5,
          since_days: 3,
        },
        {
          type: 'enrich_social_research_items',
          enrichments: ['hook', 'transcript'],
        },
        {
          type: 'send_channel_message',
          channel_id: '',
          content_template: '**Enriched social outliers**\n\n{{steps.3.digest}}',
        },
      ],
    ),
  },
  {
    template_key: 'weekly-outliers-to-artifact',
    is_new: true,
    workflows: ['content_artifacts'],
    trigger_group: 'schedule',
    sort_order: 230,
    title: 'Weekly Outliers To Artifact',
    description:
      'Creates a presentation artifact from weekly social outliers and asks an agent to improve it.',
    badge: 'Needs agent',
    body: draft(
      'Weekly Outliers To Artifact',
      {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'weekly', weekdays: [4], time: '10:00' },
        timezone: 'UTC',
      },
      [
        { type: 'sync_social_research', platform: 'both', sync_mode: 'use_existing' },
        {
          type: 'select_social_outliers',
          platform: 'both',
          min_outlier_score: 2,
          limit: 6,
          since_days: 14,
        },
        {
          type: 'create_artifact',
          artifact_kind: 'presentation',
          title_template: 'Social outlier concepts — {{trigger.fired_at}}',
        },
        {
          type: 'ask_agent_to_improve_artifact',
          artifact_kind: 'presentation',
          artifact_id: '{{steps.3.artifact_id}}',
          agent_key: 'vibey',
          prompt_template:
            'Turn the top social outliers into a concise creative brief with hooks, angles, and example scripts.\n\nOutliers:\n{{steps.2.digest}}',
        },
      ],
    ),
  },
  {
    template_key: 'mission-complete-announcement',
    is_new: true,
    workflows: ['team_ops'],
    trigger_group: 'tasks',
    sort_order: 240,
    title: 'Mission Complete Announcement',
    description: 'Posts a channel update when an agent mission completes on a task.',
    badge: 'Needs channel',
    body: draft('Mission Complete Announcement', { type: 'mission_completed' }, [
      {
        type: 'send_channel_message',
        channel_id: '',
        content_template:
          'Mission completed: **{{task.title}}**\nOwner: {{task.assignee}}\nStatus: {{task.status}}',
      },
    ]),
  },
  {
    template_key: 'mission-failed-escalation',
    is_new: true,
    workflows: ['team_ops'],
    trigger_group: 'tasks',
    sort_order: 250,
    title: 'Mission Failed Escalation',
    description:
      'When an agent mission fails, escalates the task with urgent priority and a review comment.',
    badge: 'Ready',
    body: draft('Mission Failed Escalation', { type: 'mission_failed' }, [
      {
        type: 'change_priority',
        priority: 'urgent',
      },
      {
        type: 'add_comment',
        message_template:
          'Agent mission failed on this task. Review the mission output and decide the next step.',
      },
      {
        type: 'send_channel_message',
        channel_id: '',
        content_template: 'Mission failed on **{{task.title}}** — needs human review.',
      },
    ]),
  },
  {
    template_key: 'daily-stale-task-nudge',
    is_new: true,
    workflows: ['team_ops'],
    trigger_group: 'schedule',
    sort_order: 260,
    title: 'Daily Stale Task Nudge',
    description:
      'Creates a daily review task where Vibey suggests unblockers for stale or stuck work.',
    badge: 'Ready',
    body: draft(
      'Daily Stale Task Nudge',
      {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'daily', time: '09:00' },
        timezone: 'UTC',
      },
      [
        {
          type: 'create_task',
          title_template: 'Review stale tasks in {{space.title}}',
          notes_template: 'Find tasks that look stuck or overdue and suggest concrete unblockers.',
        },
        {
          type: 'agent_suggest_tasks',
          agent_key: 'vibey',
          max_suggestions: 10,
          instructions:
            'Review this space for stale tasks, blockers, and overdue work. Suggest concrete next actions.',
        },
      ],
    ),
  },
  {
    template_key: 'outlook-inbound-email-task',
    is_new: true,
    workflows: ['inbound_comms'],
    integration: 'email',
    sort_order: 270,
    title: 'Outlook Inbound Email To Task',
    description: 'Turns a new Outlook email into a task with sender, subject, and body.',
    badge: 'Needs account',
    body: draft(
      'Outlook Inbound Email To Task',
      {
        type: 'external_email_received',
        provider: 'outlook',
        trigger_slug: 'OUTLOOK_MESSAGE_TRIGGER',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: '{{trigger.subject}}',
          notes_template: 'From: {{trigger.from}}\n\n{{trigger.body}}',
        },
      ],
    ),
  },
  {
    template_key: 'urgent-primary-email-alert',
    is_new: true,
    workflows: ['inbound_comms', 'sales_cs'],
    integration: 'email',
    sort_order: 280,
    title: 'Urgent Primary Inbox Alert',
    description:
      'Creates an urgent task and Slack-style channel alert when a primary inbox email matches urgent keywords.',
    badge: 'Needs account',
    body: draft(
      'Urgent Primary Inbox Alert',
      {
        type: 'external_email_received',
        provider: 'gmail',
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        connected_account_id: '',
        gmail_category: 'primary',
        subject_contains: 'urgent',
      },
      [
        {
          type: 'create_task',
          title_template: 'Urgent: {{trigger.subject}}',
          priority: 'urgent',
          notes_template: 'From: {{trigger.from}}\n\n{{trigger.body}}',
        },
        {
          type: 'send_channel_message',
          channel_id: '',
          content_template: 'Urgent primary email: {{trigger.subject}} from {{trigger.from}}',
        },
      ],
    ),
  },
  {
    template_key: 'gmail-promotions-triage',
    is_new: true,
    workflows: ['inbound_comms'],
    integration: 'email',
    sort_order: 290,
    title: 'Gmail Promotions Triage',
    description: 'Creates a low-priority triage task for each new Promotions inbox email.',
    badge: 'Needs account',
    body: draft(
      'Gmail Promotions Triage',
      {
        type: 'external_email_received',
        provider: 'gmail',
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        connected_account_id: '',
        gmail_category: 'promotions',
      },
      [
        {
          type: 'create_task',
          title_template: 'Triage promo: {{trigger.subject}}',
          priority: 'low',
          notes_template: 'From: {{trigger.from}}\n\n{{trigger.body}}',
        },
      ],
    ),
  },
  {
    template_key: 'slack-thread-reply-task',
    is_new: true,
    workflows: ['inbound_comms'],
    integration: 'slack',
    sort_order: 300,
    title: 'Slack Thread Reply To Task',
    description: 'Turns a Slack thread reply into a task and sends it to Vibey for follow-up.',
    badge: 'Needs Slack',
    body: draft(
      'Slack Thread Reply To Task',
      {
        type: 'external_slack_message_received',
        trigger_slug: 'SLACK_RECEIVE_THREAD_REPLY',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Slack thread: {{trigger.text}}',
          assignees: [{ type: 'agent', id: 'vibey' }],
          notes_template:
            'From: {{trigger.from}}\nChannel: {{trigger.channel_id}}\n\n{{trigger.text}}',
        },
        {
          type: 'send_to_agent',
          agent_key: 'vibey',
          target_item_ref: '{{steps.1.item_id}}',
          prompt_template:
            'Decide if this Slack thread reply needs a follow-up action.\n\n{{trigger.text}}',
        },
      ],
    ),
  },
  {
    template_key: 'blocked-tag-escalation',
    is_new: true,
    workflows: ['team_ops'],
    trigger_group: 'tasks',
    sort_order: 310,
    title: 'Blocked Tag Escalation',
    description: 'Escalates a task when a blocked tag is added and notifies the team channel.',
    badge: 'Needs channel',
    body: draft('Blocked Tag Escalation', { type: 'tag_added', tag: 'blocked' }, [
      {
        type: 'change_priority',
        priority: 'high',
      },
      {
        type: 'send_channel_message',
        channel_id: '',
        content_template: 'Blocked: **{{task.title}}** — {{task.assignee}}',
      },
    ]),
  },
  {
    template_key: 'due-date-change-alert',
    is_new: true,
    workflows: ['team_ops'],
    trigger_group: 'tasks',
    sort_order: 320,
    title: 'Due Date Change Alert',
    description: 'Adds a comment and channel alert when a task due date changes.',
    badge: 'Needs channel',
    body: draft('Due Date Change Alert', { type: 'due_date_changed' }, [
      {
        type: 'add_comment',
        message_template: 'Due date updated for this task. Review the new timeline.',
      },
      {
        type: 'send_channel_message',
        channel_id: '',
        content_template: 'Due date changed on **{{task.title}}**',
      },
    ]),
  },
  {
    template_key: 'customer-type-onboarding',
    is_new: true,
    workflows: ['sales_cs'],
    trigger_group: 'contacts',
    sort_order: 330,
    title: 'Customer Type Onboarding',
    description:
      'When a contact becomes a customer, creates an onboarding task and links it to the contact.',
    badge: 'Review type',
    body: draft('Customer Type Onboarding', { type: 'contact_type_changed', to: 'customer' }, [
      {
        type: 'create_task',
        title_template: 'Onboard contact {{trigger.contact_id}}',
        priority: 'high',
        notes_template: 'Contact type changed to customer. Run the onboarding checklist.',
      },
      {
        type: 'link_item_to_contact',
        contact_id: '{{trigger.contact_id}}',
      },
    ]),
  },
  {
    template_key: 'lead-form-agent-qualification',
    featured: true,
    is_new: true,
    workflows: ['sales_cs'],
    trigger_group: 'forms',
    sort_order: 340,
    title: 'Lead Form Agent Qualification',
    description:
      'Creates a contact and qualification task from a lead form, then runs Vibey to score the lead.',
    badge: 'Needs form',
    body: draft('Lead Form Agent Qualification', { type: 'form_submitted', form_id: '' }, [
      {
        type: 'create_contact',
        email_template: '{{trigger.answers.email}}',
        name_template: '{{trigger.answers.name}}',
        source: 'form',
      },
      {
        type: 'create_task',
        title_template: 'Qualify {{trigger.answers.name}}',
        assignees: [{ type: 'agent', id: 'vibey' }],
        priority: 'high',
        notes_template: 'Email: {{trigger.answers.email}}\n\nForm answers:\n{{trigger.answers}}',
      },
      {
        type: 'link_item_to_contact',
        contact_id: '{{steps.1.contact_id}}',
      },
      {
        type: 'send_to_agent',
        agent_key: 'vibey',
        target_item_ref: '{{steps.2.item_id}}',
        prompt_template:
          'Score this lead and draft a short qualification summary plus recommended next step.\n\n{{task.description}}',
      },
    ]),
  },
]
