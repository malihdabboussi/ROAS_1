import type {
  SpaceTemplateAutomationSeed,
  SpaceTemplateSeed,
} from './space-template-catalog.types'
import {
  type StatusOpt,
  ASSIGNEE_FIELD,
  PRIORITY_FIELD,
  TITLE_FIELD,
  docBody,
  statusField,
  taskFields,
  viewCalendar,
  viewChannel,
  viewDocs,
  viewEmails,
  viewKanban,
  viewList,
  viewMissions,
  welcomeDocBody,
} from './space-template-catalog-builders'

/** Meetings fields: calls vs follow-up action items, attendees, recording, date. */
function meetingFields(statusOptions: StatusOpt[]) {
  return [
    TITLE_FIELD,
    statusField(statusOptions),
    {
      id: 'entry_type',
      name: 'Type',
      type: 'select',
      required: true,
      options: [
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
        { id: 'personal', label: 'Personal', color: 'emerald' },
        { id: 'team', label: 'Team', color: 'violet' },
      ],
    },
    PRIORITY_FIELD,
    {
      id: 'attendees',
      name: 'Attendees',
      type: 'multi_select',
      options: [],
      required: false,
    },
    {
      id: 'recording_url',
      name: 'Recording',
      type: 'url',
      required: false,
    },
    ASSIGNEE_FIELD,
    {
      id: 'source_call',
      name: 'Source call',
      type: 'text',
      required: false,
    },
    {
      id: 'call_date',
      name: 'Call Date',
      type: 'date',
      required: false,
    },
    {
      id: 'calendar_event_id',
      name: 'Calendar Event',
      type: 'text',
      required: false,
    },
    {
      id: 'prep_status',
      name: 'Prep Status',
      type: 'select',
      required: false,
      options: [
        { id: 'pending', label: 'Pending', color: 'slate' },
        { id: 'ready', label: 'Ready', color: 'emerald' },
        { id: 'failed', label: 'Failed', color: 'red' },
      ],
    },
    { id: 'due_date', name: 'Due Date', type: 'date', system: true },
  ]
}

/** CEO Command statuses — decision-only Today vs Waiting on someone else. */
export const CEO_HQ_STATUSES: StatusOpt[] = [
  { id: 'inbox', label: 'Inbox', color: 'slate', group: 'not_started' },
  { id: 'today', label: 'Today', color: 'amber', group: 'active' },
  { id: 'waiting', label: 'Waiting', color: 'violet', group: 'active' },
  { id: 'done', label: 'Done', color: 'emerald', group: 'closed' },
]

/**
 * Meetings action funnel — call lands → triage actions → follow through → done.
 * Keep `logged` id for existing rows; label is the triage step after processing.
 */
export const MEETING_STATUSES: StatusOpt[] = [
  { id: 'processing', label: 'Processing', color: 'cyan', group: 'active' },
  { id: 'logged', label: 'To action', color: 'slate', group: 'not_started' },
  { id: 'needs_follow_up', label: 'Following up', color: 'amber', group: 'active' },
  { id: 'waiting', label: 'Waiting', color: 'violet', group: 'active' },
  { id: 'closed', label: 'Done', color: 'emerald', group: 'closed' },
]

const DRAFT_ONLY_RULE =
  'CRITICAL RULE: Always draft replies and emails. Never send Slack messages, emails, or DMs. Leave drafts for human approval.'

export const CEO_MORNING_BRIEF_AUTOMATION: SpaceTemplateAutomationSeed = {
  name: 'Morning CEO Brief',
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
        'Daily CEO brief for this space. Cover Slack audit, calendar, Today priorities, and draft-only reply queue.',
    },
    {
      type: 'send_to_agent',
      agent_key: 'vibey',
      target_item_ref: '{{steps.1.item_id}}',
      output_type: 'none',
      prompt_template: [
        'You are running the morning CEO brief for this personal HQ space.',
        DRAFT_ONLY_RULE,
        '',
        'Do this:',
        '1. Slack audit — scan connected Slack. Pull must-reply items, risks, and FYIs.',
        '2. For every must-reply, DRAFT a Slack or email response (do not send). Attach drafts as email artifacts or comments.',
        '3. Build Today — at most 7 decision-owner items for the human. Move or suggest everything else to Waiting / teammate / agent.',
        '4. Calendar — what is on today and what prep is missing.',
        '5. Write a short brief on this task with: Priorities, Drafts ready for approval, Waiting >48h, Risks.',
        '',
        'Fired at: {{trigger.fired_at}}',
      ].join('\n'),
    },
  ],
  sort_order: 0,
}

export const CEO_EOD_CLOSE_AUTOMATION: SpaceTemplateAutomationSeed = {
  name: 'End of Day Close',
  trigger: {
    type: 'schedule',
    schedule: { mode: 'preset', preset: 'daily', time: '17:30' },
    timezone: 'America/Los_Angeles',
  },
  actions: [
    {
      type: 'create_task',
      title_template: 'EOD close — {{trigger.fired_at}}',
      status: 'today',
      priority: 'medium',
      assignees: [{ type: 'agent', id: 'vibey' }],
      notes_template:
        'End-of-day close. What moved, what waits, what rolls to tomorrow, and any leftover draft replies.',
    },
    {
      type: 'send_to_agent',
      agent_key: 'vibey',
      target_item_ref: '{{steps.1.item_id}}',
      output_type: 'none',
      prompt_template: [
        'You are closing the CEO day for this personal HQ space.',
        DRAFT_ONLY_RULE,
        '',
        'Do this:',
        '1. What moved today vs what stalled.',
        '2. Waiting list — anything >48h that needs a nudge (draft the nudge, do not send).',
        '3. Roll unfinished Today items into a clear tomorrow list (keep Today decision-only).',
        '4. Any leftover Slack/email replies still needing a draft.',
        '5. Comment a short EOD summary on this task.',
        '',
        'Fired at: {{trigger.fired_at}}',
      ].join('\n'),
    },
  ],
  sort_order: 1,
}

export const MEETINGS_PRECALL_PREP_AUTOMATION: SpaceTemplateAutomationSeed = {
  name: 'Morning Pre-call Prep',
  trigger: {
    type: 'schedule',
    schedule: { mode: 'preset', preset: 'daily', time: '07:00' },
    timezone: 'America/Los_Angeles',
  },
  actions: [
    {
      type: 'meetings_precall_prep',
      refresh: true,
    },
  ],
  sort_order: 1,
}

export const MEETINGS_FATHOM_LOG_AUTOMATION: SpaceTemplateAutomationSeed = {
  name: 'Fathom Meeting Log',
  // Team Fathom account webhooks into the connected owner; do not filter by
  // recorded_by — Personal vs Team is tagged via call_kind (owner on call?).
  trigger: { type: 'external_fathom_recording_ready', source: { mode: 'self' } },
  actions: [
    {
      type: 'change_status',
      status: 'processing',
    },
    {
      type: 'send_to_agent',
      agent_key: 'vibey',
      output_type: 'document_artifact',
      completed_status: 'logged',
      prompt_template: [
        'Process this Fathom meeting on the EXISTING Meetings space task (do not create a duplicate).',
        DRAFT_ONLY_RULE,
        '',
        'Fathom title: {{trigger.title}}',
        'Recording URL: {{trigger.url}}',
        'Recorded by: {{trigger.recorded_by_email}}',
        'Calendar/primary attendee payload (often wrong): {{trigger.primary_attendee_name}} {{trigger.primary_attendee_email}}',
        'Attendees payload (often incomplete — Fathom may list only the host): {{trigger.attendees}}',
        '',
        'Summary:',
        '{{trigger.summary}}',
        '',
        'Transcript excerpt:',
        '{{trigger.transcript_text}}',
        '',
        'Action items from Fathom:',
        '{{trigger.action_items}}',
        '',
        'Required updates via update_task on THIS task:',
        '1) Title — ALWAYS set a purpose-first CEO label (4–10 words: who + real operating purpose). Never use Meeting:/Fathom/Impromptu/Untitled prefixes. Do not copy sensational summary headings (e.g. "Urgent Stripe Compliance") when the call was really a weekly client update or sales conversation.',
        '2) recording_url custom field — set to {{trigger.url}}',
        '3) call_date custom field — set to when the call happened (not due_date; due_date is for follow-up deadlines)',
        '4) Attendees — if the invitee list is only Dylan / the host, treat that as a Fathom bug. Infer real participants from transcript speakers and names mentioned. Still produce action items.',
        '5) Status — triage is handled by completed_status (To action), then follow-up suggestions move it to Following up.',
        '',
        'Then create a meeting log document covering: who, purpose, details/decisions, acronyms, commitments, transcript link.',
        'Do not turn this call row into action items — follow-up tasks are created next as separate Follow-up typed items.',
        'Finally suggest concrete follow-up tasks. Always draft outreach — never send.',
      ].join('\n'),
    },
    {
      type: 'agent_suggest_tasks',
      agent_key: 'vibey',
      max_suggestions: 10,
      instructions:
        'Suggest concrete follow-up action items (not another call row). Prefer Fathom action_items when present. For each task set: due_date (ISO when known), priority (low|medium|high|urgent — not everything medium), assignee_email when a clear owner email exists. Use transcript if attendees are host-only. Draft-only for outreach — never send.',
    },
    {
      type: 'change_status',
      status: 'needs_follow_up',
    },
  ],
  sort_order: 0,
}

export const CEO_SPACE_TEMPLATES: SpaceTemplateSeed[] = [
  {
    slug: 'ceo-hq',
    title: 'CEO HQ',
    description:
      'Personal command center — Today, priorities, calendar, draft replies, and morning/EOD loops. Always draft, never send.',
    icon: 'crown',
    icon_color: 'amber',
    category: 'tier1_universal',
    persona: 'founder',
    badge: 'New',
    featured: true,
    is_new: true,
    sort_order: 5,
    channel_name: 'ceo-hq',
    channel_description: 'Daily brief and EOD close with Vibey.',
    schema: {
      version: 1,
      icon: 'crown',
      fields: taskFields(CEO_HQ_STATUSES),
      views: [
        viewList('Today', 'today'),
        viewKanban('Priorities', 'priorities'),
        viewCalendar('Calendar', 'calendar'),
        viewMissions(),
        viewEmails('Drafts', 'drafts'),
        viewDocs('Notes', 'notes'),
        viewChannel('#ceo-hq'),
      ],
    },
    items: [
      {
        kind: 'doc',
        title: 'Welcome — how to run CEO HQ',
        body: welcomeDocBody('CEO HQ', [
          '**Today (List)** — only decisions you must make today (cap ~7)',
          '**Priorities (Board)** — Inbox → Today → Waiting → Done',
          '**Calendar** — deadlines and prep tied to due dates',
          '**Missions** — multi-step agent work (Slack audit, deep prep)',
          '**Drafts (Emails)** — Slack/email replies waiting for your approval — never auto-sent',
          '**Notes** — operating rules, acronyms, decision log',
          '**Channel** — morning brief + EOD close with Vibey',
        ]),
        sort_order: 0,
      },
      {
        kind: 'doc',
        title: 'Operating rules — always draft',
        body: docBody([
          '## Draft-only rule',
          '',
          'Vibey and every agent in this space **draft** Slack replies and emails.',
          'Nothing goes out until you approve.',
          '',
          '## Today rule',
          '',
          'If it is not a decision, relationship, money, hire/fire, or unblock — it should not sit on Today.',
          'Delegate, park on Waiting, or give it to an agent.',
          '',
          '## Morning loop',
          '',
          '- Slack audit',
          '- Calendar scan',
          '- Draft replies queued in Drafts',
          '- Today list locked',
          '',
          '## End-of-day close',
          '',
          '- What moved',
          '- Waiting nudges (drafted)',
          '- Tomorrow pre-built',
        ]),
        sort_order: 1,
      },
      {
        kind: 'task',
        title: 'Connect Slack on your personal account',
        status: 'inbox',
        priority: 'high',
        description:
          'CEO HQ Slack audit runs on personal account. Map Vibey to the channels you care about, then enable the Morning CEO Brief flow.',
        sort_order: 2,
      },
      {
        kind: 'task',
        title: 'Enable Morning CEO Brief + EOD Close flows',
        status: 'inbox',
        priority: 'high',
        description:
          'Automations install as drafts. Open Flows, set timezone if needed, then publish Morning CEO Brief and End of Day Close.',
        sort_order: 3,
      },
      {
        kind: 'task',
        title: 'Pin this space and set it as your daily driver',
        status: 'today',
        priority: 'medium',
        description: 'Right-click in the sidebar to pin. Use Meetings space for Fathom call logs.',
        sort_order: 4,
      },
    ],
    automations: [CEO_MORNING_BRIEF_AUTOMATION, CEO_EOD_CLOSE_AUTOMATION],
  },
  {
    slug: 'meetings',
    title: 'Meetings',
    description:
      'Every call in one place — who, details, acronyms, transcript link, and follow-ups from Fathom.',
    icon: 'video',
    icon_color: 'blue',
    category: 'tier1_universal',
    persona: 'founder',
    badge: 'Needs Fathom',
    featured: true,
    is_new: true,
    sort_order: 6,
    channel_name: null,
    channel_description: null,
    schema: {
      version: 1,
      icon: 'video',
      fields: meetingFields(MEETING_STATUSES),
      views: [
        {
          id: 'all-meetings',
          type: 'list',
          name: 'All Meetings',
          field_value_filters: { entry_type: 'call' },
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
          date_display_formats: {
            call_date: 'date_time',
          },
        },
        {
          id: 'prep',
          type: 'list',
          name: 'Prep',
          field_value_filters: { entry_type: 'prep' },
          visible_fields: [
            'status',
            'title',
            'prep_status',
            'attendees',
            'call_date',
            'priority',
          ],
          column_widths: {
            status: 140,
            title: 360,
            prep_status: 110,
            attendees: 280,
            call_date: 170,
            priority: 110,
          },
          date_display_formats: {
            call_date: 'date_time',
          },
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
          group_by: 'status',
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
          column_widths: {
            status: 140,
            title: 360,
            source_call: 220,
            attendees: 200,
            priority: 110,
            assignee: 160,
            due_date: 120,
          },
          date_display_formats: {
            due_date: 'date',
          },
          show_closed_tasks: true,
        },
        {
          id: 'calendar',
          type: 'calendar',
          name: 'Calendar',
          calendar_config: { date_field: 'call_date' },
        },
        viewDocs('Meeting Logs', 'meeting-logs'),
        {
          id: 'people',
          type: 'contacts',
          name: 'People',
          contacts_config: {
            scope: 'campaign',
            sort_by: 'name',
            sort_dir: 'asc',
            status_filter: 'all',
          },
        },
        viewMissions(),
      ],
    },
    items: [
      {
        kind: 'doc',
        title: 'Welcome — how to use Meetings',
        body: welcomeDocBody('Meetings', [
          '**All Meetings (List)** — calls only: Status, Name, Attendees, Call Date, Recording',
          '**Prep (List)** — pre-call briefs for today’s calendar (morning + Prep today on Home Agenda)',
          '**Follow-ups (Board) / Action items (List)** — follow-up tasks only (never call rows). Due Date = when the action is due',
          '**Source call** — every follow-up links back to the meeting it came from (click to open that call)',
          '**Call Date vs Due Date** — Call Date is when the meeting happened; Due Date is the deadline on an action item',
          '**Status (auto on calls)** — Processing → To action → Following up after suggestions. Waiting/Done you set when follow-through stalls or finishes',
          '**Type** — Call vs Follow-up vs Prep (keeps views clean)',
          '**Attendees** — tags from invitees OR transcript speakers',
          '**Recording** — Fathom call / transcript link on the call row',
          '**Meeting Logs (Docs)** — write-ups per call (purpose, decisions, acronyms, commitments)',
          '**People** — CRM contacts created from Fathom attendees with emails (campaign-scoped)',
          '**Missions** — deeper agent work spun from a call',
        ]),
        sort_order: 0,
      },
      {
        kind: 'doc',
        title: 'Meeting log template',
        body: docBody([
          '## Meeting',
          '',
          '- Title',
          '- Date',
          '- Who was there',
          '- Transcript / Fathom link',
          '',
          '## Purpose',
          '',
          '- Why this call existed',
          '',
          '## Details',
          '',
          '- What was discussed',
          '- Decisions made',
          '',
          '## Acronyms / jargon',
          '',
          '- TERM — plain-English meaning',
          '',
          '## Commitments',
          '',
          '- Owner — action — due date',
          '',
          '## Open questions',
          '',
          '- What still needs an answer',
        ]),
        sort_order: 1,
      },
      {
        kind: 'task',
        title: 'Connect Fathom on your personal account',
        status: 'logged',
        priority: 'high',
        description:
          'Enable the Fathom Meeting Log flow after connect. New recordings create a call row, a log doc, and follow-up action items.',
        custom_data: { entry_type: 'follow_up' },
        sort_order: 2,
      },
      {
        kind: 'task',
        title: 'Backfill last week of calls once',
        status: 'needs_follow_up',
        priority: 'medium',
        description:
          'Pull recent Fathom meetings into this space so All Meetings, Follow-ups, Logs, and People are not empty on day one.',
        custom_data: { entry_type: 'follow_up' },
        sort_order: 3,
      },
    ],
    automations: [MEETINGS_FATHOM_LOG_AUTOMATION, MEETINGS_PRECALL_PREP_AUTOMATION],
  },
]
