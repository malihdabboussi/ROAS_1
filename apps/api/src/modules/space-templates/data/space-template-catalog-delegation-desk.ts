import {
  ASSIGNEE_FIELD,
  docBody,
  DUE_DATE_FIELD,
  PRIORITY_FIELD,
  statusField,
  TITLE_FIELD,
  viewDocs,
  viewKanban,
  viewList,
  type StatusOpt,
} from './space-template-catalog-builders'
import type { SpaceTemplateAutomationSeed, SpaceTemplateSeed } from './space-template-catalog.types'

const DELEGATION_STATUSES: StatusOpt[] = [
  { id: 'inbox', label: 'Holding tank', color: 'slate', group: 'not_started' },
  { id: 'processing', label: 'Organizing', color: 'cyan', group: 'active' },
  { id: 'ready_review', label: 'Ready to delegate', color: 'violet', group: 'active' },
  { id: 'approved', label: 'Approved', color: 'blue', group: 'active' },
  { id: 'dispatched', label: 'Delegated', color: 'emerald', group: 'active' },
  { id: 'in_progress', label: 'In progress', color: 'cyan', group: 'active' },
  { id: 'done', label: 'Done', color: 'emerald', group: 'closed' },
  { id: 'blocked', label: 'Blocked', color: 'red', group: 'active' },
  { id: 'dismissed', label: 'Dismissed', color: 'slate', group: 'closed' },
]

const fields = [
  TITLE_FIELD,
  statusField(DELEGATION_STATUSES),
  {
    id: 'intake_type',
    name: 'Type',
    type: 'select',
    options: [
      { id: 'work_item', label: 'Work item', color: 'blue' },
      { id: 'work_group', label: 'Work group', color: 'violet' },
    ],
  },
  {
    id: 'dispatch_mode',
    name: 'Dispatch Mode',
    type: 'select',
    options: [
      { id: 'batch', label: 'Batch', color: 'blue' },
      { id: 'review', label: 'Review first', color: 'violet' },
      { id: 'urgent', label: 'Urgent', color: 'red' },
    ],
  },
  {
    id: 'destination',
    name: 'Destination',
    type: 'select',
    options: [
      { id: 'human', label: 'Team member', color: 'blue' },
      { id: 'agent', label: 'Agent', color: 'violet' },
      { id: 'roas_portal', label: 'The ROAS Portal', color: 'emerald' },
      { id: 'review', label: 'Needs review', color: 'amber' },
    ],
  },
  { id: 'client_campaign', name: 'Client / Campaign', type: 'text' },
  PRIORITY_FIELD,
  ASSIGNEE_FIELD,
  DUE_DATE_FIELD,
]

const processDelegationIntake: SpaceTemplateAutomationSeed = {
  name: 'Process delegation intake',
  trigger: { type: 'task_created', in_status: 'inbox', is_subtask: false },
  actions: [
    {
      type: 'send_to_agent',
      agent_key: 'delegator',
      output_type: 'none',
      prompt_template: [
        'Process this Delegation Desk intake using the delegation-desk skill.',
        'Do not assign raw intake directly to the team.',
        'Read the delegation metadata and every referenced source item before deciding.',
        'Turn the intake into clear work items. Use a parent work group with subtasks only when related items benefit from staying together.',
        'For urgent mode, dispatch in this run after the required identity, duplicate, and destination checks.',
        'For batch or review mode, leave prepared work items in Ready to delegate unless the intake explicitly authorizes dispatch.',
        'Record durable task, agent-delegation, or The ROAS Portal receipts before marking anything Delegated.',
      ].join('\n'),
    },
  ],
  sort_order: 0,
}

export const DELEGATION_DESK_TEMPLATES: SpaceTemplateSeed[] = [
  {
    slug: 'delegation-desk',
    title: 'Delegation Desk',
    description:
      'Private holding tank for commitments, action items, promises, and suggested work before it is assigned to the team.',
    icon: 'send-horizontal',
    icon_color: 'violet',
    category: 'tier1_universal',
    persona: 'ops',
    badge: 'New',
    featured: true,
    is_new: true,
    sort_order: 15,
    channel_name: null,
    channel_description: null,
    schema: {
      version: 1,
      icon: 'send-horizontal',
      delegation_desk: true,
      fields,
      views: [
        {
          ...viewList('Holding tank', 'inbox'),
          field_value_filters: { status: 'inbox' },
          visible_fields: ['title', 'dispatch_mode', 'priority', 'client_campaign', 'due_date'],
        },
        {
          ...viewList('Ready to delegate', 'review'),
          field_value_filters: { status: 'ready_review' },
          visible_fields: [
            'title',
            'destination',
            'assignee',
            'priority',
            'client_campaign',
            'due_date',
          ],
        },
        {
          ...viewList('Urgent', 'urgent'),
          field_value_filters: { dispatch_mode: 'urgent' },
          visible_fields: ['status', 'title', 'destination', 'assignee', 'due_date'],
        },
        viewKanban('Pipeline', 'pipeline'),
        {
          ...viewList('Delegated', 'dispatched'),
          field_value_filters: { status: 'dispatched' },
          visible_fields: ['title', 'destination', 'assignee', 'client_campaign', 'due_date'],
        },
        {
          ...viewList('Completed', 'completed'),
          field_value_filters: { status: 'done' },
          visible_fields: ['title', 'destination', 'assignee', 'client_campaign', 'due_date'],
        },
        viewDocs('Operating notes', 'operating-notes'),
      ],
    },
    items: [
      {
        kind: 'doc',
        title: 'Welcome — how to use the Delegation Desk',
        body: docBody([
          '# Delegation Desk',
          '',
          'Capture rough ideas here without turning each thought into a team assignment.',
          '',
          '## The workflow',
          '',
          '- Holding tank contains private, unassigned work captured from calls, chats, and selected tasks.',
          '- Delegator checks duplicates, researches context, and turns rough intake into clear work items.',
          '- Ready to delegate contains work that needs an owner or destination.',
          '- Related work can use a parent work group with individual subtasks.',
          '- Urgent intake can dispatch immediately after required checks.',
          '- Delegated work includes durable assignment or fulfillment receipts and remains tracked until Done.',
          '',
          '## Quality bar',
          '',
          '- One accountable owner per delegated work item.',
          '- State the outcome, why it matters, scope, and done-when criteria.',
          '- Preserve the original source without copying rough language into the team brief.',
          '- Update existing work instead of creating duplicates.',
        ]),
        sort_order: 0,
      },
    ],
    automations: [processDelegationIntake],
  },
]
