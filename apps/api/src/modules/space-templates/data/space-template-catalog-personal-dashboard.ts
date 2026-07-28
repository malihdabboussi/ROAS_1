import {
  ASSIGNEE_FIELD,
  docBody,
  PRIORITY_FIELD,
  statusField,
  TITLE_FIELD,
  viewDocs,
  viewEmails,
  viewKanban,
  viewList,
  viewMissions,
  welcomeDocBody,
  type StatusOpt,
} from './space-template-catalog-builders'
import type { SpaceTemplateAutomationSeed, SpaceTemplateSeed } from './space-template-catalog.types'

const PERSONAL_DASHBOARD_STATUSES: StatusOpt[] = [
  { id: 'inbox', label: 'Inbox', color: 'slate', group: 'not_started' },
  { id: 'today', label: 'Today', color: 'amber', group: 'active' },
  { id: 'processing', label: 'Processing', color: 'cyan', group: 'active' },
  { id: 'logged', label: 'To action', color: 'blue', group: 'not_started' },
  { id: 'needs_follow_up', label: 'Following up', color: 'orange', group: 'active' },
  { id: 'waiting', label: 'Waiting', color: 'violet', group: 'active' },
  { id: 'done', label: 'Done', color: 'emerald', group: 'closed' },
]

const DRAFT_ONLY_RULE =
  'CRITICAL RULE: Always draft replies and emails. Never send Slack messages, emails, or DMs. Leave drafts for human approval.'

const fields = [
  TITLE_FIELD,
  statusField(PERSONAL_DASHBOARD_STATUSES),
  {
    id: 'entry_type',
    name: 'Type',
    type: 'select',
    required: false,
    options: [
      { id: 'work', label: 'Work', color: 'slate' },
      { id: 'call', label: 'Call', color: 'blue' },
      { id: 'follow_up', label: 'Follow-up', color: 'amber' },
      { id: 'prep', label: 'Prep', color: 'emerald' },
    ],
  },
  {
    id: 'call_kind',
    name: 'Call Kind',
    type: 'select',
    required: false,
    options: [
      { id: 'private', label: 'Private', color: 'emerald' },
      { id: 'team', label: 'Team', color: 'violet' },
      { id: 'executive', label: 'Executive', color: 'amber' },
      { id: 'client', label: 'Client', color: 'cyan' },
      { id: 'partner', label: 'Partner', color: 'blue' },
      { id: 'sales', label: 'Sales', color: 'orange' },
    ],
  },
  PRIORITY_FIELD,
  { id: 'attendees', name: 'Attendees', type: 'multi_select', options: [] },
  { id: 'recording_url', name: 'Recording', type: 'url' },
  ASSIGNEE_FIELD,
  { id: 'source_call', name: 'Source call', type: 'text' },
  { id: 'call_date', name: 'Call Date', type: 'date' },
  { id: 'calendar_event_id', name: 'Calendar Event', type: 'text' },
  {
    id: 'prep_status',
    name: 'Prep Status',
    type: 'select',
    options: [
      { id: 'pending', label: 'Pending', color: 'slate' },
      { id: 'ready', label: 'Ready', color: 'emerald' },
      { id: 'failed', label: 'Failed', color: 'red' },
    ],
  },
  { id: 'due_date', name: 'Due Date', type: 'date', system: true },
]

const views = [
  {
    ...viewList('Today', 'today'),
    field_value_filters: { status: 'today' },
  },
  viewKanban('Priorities', 'priorities'),
  {
    id: 'agenda',
    type: 'calendar',
    name: 'Agenda',
    calendar_config: {
      date_field: 'call_date',
      default_zoom: 'week',
      week_start: 1,
      show_task_list: false,
      time_format: '12h',
      sources: [
        { id: 'space_items', type: 'space_items', visible: true, color: 'blue' },
        { id: 'google_calendar', type: 'google_calendar', visible: true, color: 'green' },
        { id: 'outlook', type: 'outlook', visible: true, color: 'blue' },
      ],
    },
  },
  {
    id: 'all-meetings',
    type: 'list',
    name: 'All Meetings',
    field_value_filters: { entry_type: 'call' },
    sort: [{ field: 'call_date', dir: 'desc' }],
    visible_fields: [
      'status',
      'title',
      'call_kind',
      'attendees',
      'call_date',
      'recording_url',
      'priority',
    ],
    column_widths: {
      status: 140,
      title: 360,
      call_kind: 110,
      attendees: 360,
      call_date: 170,
      recording_url: 220,
      priority: 110,
    },
    date_display_formats: { call_date: 'date_time' },
  },
  {
    id: 'prep',
    type: 'list',
    name: 'Prep',
    field_value_filters: { entry_type: 'prep' },
    sort: [{ field: 'call_date', dir: 'desc' }],
    visible_fields: ['status', 'title', 'prep_status', 'attendees', 'call_date', 'priority'],
  },
  {
    id: 'follow-ups',
    type: 'kanban',
    name: 'Follow-ups',
    group_by: 'status',
    field_value_filters: { entry_type: 'follow_up' },
    visible_fields: ['title', 'source_call', 'attendees', 'priority', 'assignee', 'due_date'],
    show_closed_tasks: true,
  },
  {
    id: 'action-items',
    type: 'list',
    name: 'Action items',
    field_value_filters: { entry_type: 'follow_up' },
    visible_fields: [
      'status',
      'title',
      'source_call',
      'attendees',
      'priority',
      'assignee',
      'due_date',
    ],
    show_closed_tasks: true,
  },
  viewEmails('Drafts', 'drafts'),
  viewDocs('Meeting Logs', 'meeting-logs'),
  viewDocs('Notes', 'notes'),
  {
    id: 'people',
    type: 'contacts',
    name: 'People',
    contacts_config: { scope: 'campaign', sort_by: 'name', sort_dir: 'asc', status_filter: 'all' },
  },
  viewMissions(),
]

const morningBrief: SpaceTemplateAutomationSeed = {
  name: 'Morning Brief',
  trigger: {
    type: 'schedule',
    schedule: { mode: 'preset', preset: 'daily', time: '07:30' },
    timezone: 'America/Los_Angeles',
  },
  actions: [
    {
      type: 'create_task',
      title_template: 'Morning brief — {{trigger.fired_at}}',
      status: 'today',
      priority: 'high',
      assignees: [{ type: 'agent', id: 'vibey' }],
      notes_template:
        'Daily personal brief covering messages, calendar, priorities, risks, and draft-only replies.',
    },
    {
      type: 'send_to_agent',
      agent_key: 'vibey',
      target_item_ref: '{{steps.1.item_id}}',
      output_type: 'none',
      prompt_template: [
        'Build the owner’s morning brief for this private Personal Dashboard.',
        DRAFT_ONLY_RULE,
        'Review connected messages and today’s calendar. Identify must-reply items, risks, and missing preparation.',
        'Keep Today to at most seven important owner actions. Move everything else to Waiting or suggest delegation.',
        'Attach draft responses and finish with Priorities, Drafts, Waiting over 48 hours, and Risks.',
      ].join('\n'),
    },
  ],
  sort_order: 0,
}

const endOfDayClose: SpaceTemplateAutomationSeed = {
  name: 'End of Day Close',
  trigger: {
    type: 'schedule',
    schedule: { mode: 'preset', preset: 'daily', time: '17:30' },
    timezone: 'America/Los_Angeles',
  },
  actions: [
    {
      type: 'create_task',
      title_template: 'End-of-day close — {{trigger.fired_at}}',
      status: 'today',
      priority: 'medium',
      assignees: [{ type: 'agent', id: 'vibey' }],
      notes_template: 'What moved, what is waiting, and what should roll into tomorrow.',
    },
    {
      type: 'send_to_agent',
      agent_key: 'vibey',
      target_item_ref: '{{steps.1.item_id}}',
      output_type: 'none',
      prompt_template: [
        'Close the owner’s day in this private Personal Dashboard.',
        DRAFT_ONLY_RULE,
        'Summarize what moved and stalled, draft any needed nudges, and build a short tomorrow list.',
      ].join('\n'),
    },
  ],
  sort_order: 1,
}

const fathomMeetingLog: SpaceTemplateAutomationSeed = {
  name: 'Fathom Meeting Log',
  trigger: { type: 'external_fathom_recording_ready', source: { mode: 'self' } },
  actions: [
    { type: 'change_status', status: 'processing' },
    { type: 'change_status', status: 'needs_follow_up' },
  ],
  sort_order: 2,
}

const morningPrecallPrep: SpaceTemplateAutomationSeed = {
  name: 'Morning Pre-call Prep',
  trigger: {
    type: 'schedule',
    schedule: { mode: 'preset', preset: 'daily', time: '07:00' },
    timezone: 'America/Los_Angeles',
  },
  actions: [{ type: 'meetings_precall_prep', refresh: true }],
  sort_order: 3,
}

export const PERSONAL_DASHBOARD_TEMPLATES: SpaceTemplateSeed[] = [
  {
    slug: 'personal-dashboard',
    title: 'Personal Dashboard',
    description:
      'A private daily workspace for priorities, meetings, calendar, people, notes, and approval-ready drafts.',
    icon: 'layout-dashboard',
    icon_color: 'blue',
    category: 'tier1_universal',
    persona: null,
    badge: 'Private',
    featured: true,
    is_new: true,
    sort_order: 5,
    channel_name: null,
    channel_description: null,
    schema: { version: 1, icon: 'layout-dashboard', personal_dashboard: true, fields, views },
    items: [
      {
        kind: 'doc',
        title: 'Welcome — your Personal Dashboard',
        body: welcomeDocBody('Personal Dashboard', [
          '**Today** — the few actions that need your attention now',
          '**Priorities** — Inbox → Today → Waiting → Done',
          '**Agenda** — your Space items plus connected Google or Outlook calendars',
          '**Meetings** — Fathom recordings, preparation, logs, and follow-ups',
          '**Drafts** — replies waiting for your approval; automations never send',
          '**Notes, People, and Missions** — your private working context',
        ]),
        sort_order: 0,
      },
      {
        kind: 'doc',
        title: 'Privacy and connected accounts',
        body: docBody([
          '## Private by design',
          'This dashboard belongs only to you. Organization administrators and teammates cannot open or share it.',
          '## Connected accounts',
          'The layout is ready in advance, but email, calendar, Slack, and Fathom authorization stays under your own account.',
          'Connect only the services you want. Your organization cannot authorize a personal account on your behalf.',
          '## Approval rule',
          'Automations are installed as drafts and communication is draft-only until you approve it.',
        ]),
        sort_order: 1,
      },
      {
        kind: 'task',
        title: 'Connect your email and calendar',
        status: 'inbox',
        priority: 'high',
        description:
          'Connect Gmail or Outlook and your calendar from your own integration settings.',
        custom_data: { entry_type: 'work' },
        sort_order: 2,
      },
      {
        kind: 'task',
        title: 'Connect Slack and Fathom if you use them',
        status: 'inbox',
        priority: 'medium',
        description:
          'Authorize personal connections, then review and publish only the flows you want.',
        custom_data: { entry_type: 'work' },
        sort_order: 3,
      },
      {
        kind: 'task',
        title: 'Review your draft automations',
        status: 'today',
        priority: 'medium',
        description: 'Set your timezone and publish the daily or meeting flows that fit your role.',
        custom_data: { entry_type: 'work' },
        sort_order: 4,
      },
    ],
    automations: [morningBrief, endOfDayClose, fathomMeetingLog, morningPrecallPrep],
  },
]
