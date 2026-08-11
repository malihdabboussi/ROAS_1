import {
  actionProducedContexts,
  actionRequiredContexts,
  contextsForTrigger,
  deriveContextsAfterActions,
  findFirstContextIssue,
  hasRequiredContexts,
  type AutomationContextKey,
} from '@/lib/flows/automation-context'
import {
  CONNECTED_APP_FLOW_TRIGGERS,
  getConnectedAppFlowTriggerBySlug,
  type ConnectedAppFlowProvider,
} from '@/lib/flows/connected-app-flow-triggers'
import type {
  AutomationAction,
  AutomationTrigger,
  FieldDef,
  FieldType,
} from '../../types/space-schema'
import type { AutomationCategorizedSection } from './AutomationCategorizedSelect'

export {
  actionProducedContexts,
  actionRequiredContexts,
  contextsForTrigger,
  deriveContextsAfterActions,
  findFirstContextIssue,
  hasRequiredContexts,
}

export type AutomationTokenKind =
  | 'email'
  | 'name'
  | 'title'
  | 'message'
  | 'date'
  | 'status'
  | 'priority'
  | 'phone'
  | 'tag'
  | 'id'

export type AutomationTokenSource =
  | 'gmail'
  | 'outlook'
  | 'email'
  | 'slack'
  | 'fathom'
  | 'form'
  | 'contact'
  | 'task'
  | 'artifact'
  | 'webhook'
  | 'social_research'
  | 'space'
  | 'mission'

export interface AutomationTemplateVar {
  token: string
  label: string
  detail: string
  kinds?: AutomationTokenKind[]
  source?: AutomationTokenSource
}

// IDs that have dedicated standalone triggers — never appear in "Custom field changes"
const RESERVED_FIELD_IDS = new Set([
  'title',
  'status',
  'priority',
  'assignee',
  'due_date',
  'start_date',
  'tags',
  'created_at',
  'updated_at',
])

// Field types that have dedicated standalone triggers or are not user-mutable
const RESERVED_FIELD_TYPES: ReadonlySet<FieldType> = new Set([
  'date',
  'assignee',
  'created_at',
  'updated_at',
  'mission',
])

/** Returns true when a field is a real custom field eligible for the field_changed trigger. */
export function isCustomAutomationField(field: FieldDef): boolean {
  if (field.system) return false
  if (RESERVED_FIELD_IDS.has(field.id)) return false
  if (RESERVED_FIELD_TYPES.has(field.type)) return false
  return true
}

// ─── Trigger Object (scope) ────────────────────────────────────────────────

export type TriggerObjectKey =
  | 'tasks'
  | 'subtasks'
  | 'all_tasks'
  | 'forms'
  | 'contacts'
  | 'artifacts'
  | 'webhooks'
  | 'schedule'
  | 'connected_apps'

export const TRIGGER_OBJECT_OPTIONS: Array<{ value: TriggerObjectKey; label: string }> = [
  { value: 'tasks', label: 'Tasks' },
  { value: 'subtasks', label: 'Subtasks' },
  { value: 'all_tasks', label: 'Tasks or subtasks' },
  { value: 'forms', label: 'Forms' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'artifacts', label: 'Artifacts' },
  { value: 'webhooks', label: 'Webhooks' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'connected_apps', label: 'Connected Apps' },
]

export const TASK_SHAPED_TRIGGER_TYPES = new Set([
  'task_created',
  'status_change',
  'priority_changed',
  'assignee_changed',
  'field_changed',
  'mission_completed',
  'mission_failed',
  'due_date_changed',
  'start_date_changed',
  'tag_added',
  'tag_removed',
])

/** Read the user-visible Object from a trigger value, including subtask scope. */
export function inferTriggerObject(trigger: AutomationTrigger): TriggerObjectKey {
  if (TASK_SHAPED_TRIGGER_TYPES.has(trigger.type)) {
    const scope = (trigger as { task_scope?: 'tasks' | 'subtasks' | 'all' }).task_scope
    if (scope === 'subtasks') return 'subtasks'
    if (scope === 'all') return 'all_tasks'
    return 'tasks'
  }
  switch (trigger.type) {
    case 'form_submitted':
      return 'forms'
    case 'contact_created':
    case 'contact_updated':
    case 'contact_tag_added':
    case 'contact_tag_removed':
    case 'contact_type_changed':
    case 'contact_source_changed':
      return 'contacts'
    case 'artifact_lifecycle':
      return 'artifacts'
    case 'webhook_received':
      return 'webhooks'
    case 'external_email_received':
    case 'external_slack_message_received':
    case 'external_fathom_recording_ready':
    case 'external_app_event':
      return 'connected_apps'
    case 'schedule':
      return 'schedule'
    default:
      return 'tasks'
  }
}

/** Primary Object for a trigger type, ignoring scope. Used by cross-Object search. */
export function defaultObjectForTriggerType(triggerType: string): TriggerObjectKey {
  if (TASK_SHAPED_TRIGGER_TYPES.has(triggerType)) return 'tasks'
  if (triggerType === 'form_submitted') return 'forms'
  if (triggerType.startsWith('contact_')) return 'contacts'
  if (triggerType === 'artifact_lifecycle') return 'artifacts'
  if (triggerType === 'webhook_received') return 'webhooks'
  if (getConnectedAppFlowTriggerBySlug(triggerType)) return 'connected_apps'
  if (triggerType.startsWith('external_')) return 'connected_apps'
  if (triggerType === 'schedule') return 'schedule'
  return 'tasks'
}

function applyTaskScope<T extends AutomationTrigger>(trigger: T, object: TriggerObjectKey): T {
  if (!TASK_SHAPED_TRIGGER_TYPES.has(trigger.type)) return trigger
  if (object === 'subtasks') return { ...trigger, task_scope: 'subtasks' } as T
  if (object === 'all_tasks') {
    const next = { ...trigger } as T & { task_scope?: unknown }
    delete next.task_scope
    return next
  }
  return { ...trigger, task_scope: 'tasks' } as T
}

/** Build a fresh trigger value when the user picks a trigger type from the picker. */
export function defaultTriggerForType(
  triggerType: string,
  object: TriggerObjectKey,
): AutomationTrigger {
  const connectedAppTrigger = getConnectedAppFlowTriggerBySlug(triggerType)
  if (connectedAppTrigger) {
    return {
      type: 'external_app_event',
      provider: connectedAppTrigger.provider,
      trigger_slug: connectedAppTrigger.triggerSlug,
      connected_account_id: '',
    }
  }

  switch (triggerType) {
    case 'task_created':
      return applyTaskScope({ type: 'task_created' }, object)
    case 'status_change':
      return applyTaskScope({ type: 'status_change', to: '' }, object)
    case 'priority_changed':
      return applyTaskScope({ type: 'priority_changed', to: undefined }, object)
    case 'assignee_changed':
      return applyTaskScope({ type: 'assignee_changed' }, object)
    case 'field_changed':
      return applyTaskScope({ type: 'field_changed', field_id: '' }, object)
    case 'mission_completed':
      return applyTaskScope({ type: 'mission_completed' }, object)
    case 'mission_failed':
      return applyTaskScope({ type: 'mission_failed' }, object)
    case 'due_date_changed':
      return applyTaskScope({ type: 'due_date_changed' }, object)
    case 'start_date_changed':
      return applyTaskScope({ type: 'start_date_changed' }, object)
    case 'tag_added':
      return applyTaskScope({ type: 'tag_added' }, object)
    case 'tag_removed':
      return applyTaskScope({ type: 'tag_removed' }, object)
    case 'form_submitted':
      return { type: 'form_submitted', form_id: '' }
    case 'contact_created':
      return { type: 'contact_created' }
    case 'contact_updated':
      return { type: 'contact_updated' }
    case 'contact_tag_added':
      return { type: 'contact_tag_added' }
    case 'contact_tag_removed':
      return { type: 'contact_tag_removed' }
    case 'contact_type_changed':
      return { type: 'contact_type_changed' }
    case 'contact_source_changed':
      return { type: 'contact_source_changed' }
    case 'artifact_lifecycle':
      return { type: 'artifact_lifecycle', lifecycle_event: 'published' }
    case 'webhook_received':
      return { type: 'webhook_received', webhook_endpoint_id: '' }
    case 'external_email_received':
      return {
        type: 'external_email_received',
        provider: 'gmail',
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        connected_account_id: '',
      }
    case 'external_slack_message_received':
      return {
        type: 'external_slack_message_received',
        trigger_slug: 'SLACK_RECEIVE_DIRECT_MESSAGE',
        connected_account_id: '',
      }
    case 'external_fathom_recording_ready':
      return { type: 'external_fathom_recording_ready' }
    case 'external_app_event':
      return {
        type: 'external_app_event',
        provider: 'googlecalendar',
        trigger_slug: 'GOOGLECALENDAR_EVENT_STARTING_SOON_TRIGGER',
        connected_account_id: '',
      }
    case 'schedule':
      return {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'daily', time: '09:00' },
        timezone: detectDefaultTimezone(),
      }
    default:
      return { type: 'task_created' } as AutomationTrigger
  }
}

function detectDefaultTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && typeof tz === 'string') return tz
  } catch {
    // Browsers that don't expose the resolved zone fall through.
  }
  return 'UTC'
}

/** Build a default trigger value when the user switches the Object dropdown. */
export function defaultTriggerForObject(object: TriggerObjectKey): AutomationTrigger {
  switch (object) {
    case 'tasks':
    case 'subtasks':
    case 'all_tasks':
      return defaultTriggerForType('task_created', object)
    case 'forms':
      return { type: 'form_submitted', form_id: '' }
    case 'contacts':
      return { type: 'contact_created' }
    case 'artifacts':
      return { type: 'artifact_lifecycle', lifecycle_event: 'published' }
    case 'webhooks':
      return { type: 'webhook_received', webhook_endpoint_id: '' }
    case 'schedule':
      return {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'daily', time: '09:00' },
        timezone: detectDefaultTimezone(),
      }
    case 'connected_apps':
      return {
        type: 'external_email_received',
        provider: 'gmail',
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        connected_account_id: '',
      }
  }
}

/** Apply the Object dropdown value to a trigger, preserving the trigger.type when possible. */
export function applyObjectToTrigger(
  trigger: AutomationTrigger,
  nextObject: TriggerObjectKey,
): AutomationTrigger {
  const currentObject = inferTriggerObject(trigger)
  if (currentObject === nextObject) return trigger
  const isCurrentTask = TASK_SHAPED_TRIGGER_TYPES.has(trigger.type)
  const isNextTask =
    nextObject === 'tasks' || nextObject === 'subtasks' || nextObject === 'all_tasks'
  if (isCurrentTask && isNextTask) {
    return applyTaskScope(trigger, nextObject)
  }
  return defaultTriggerForObject(nextObject)
}

// ─── Trigger sections per object ───────────────────────────────────────────

const TASK_TRIGGER_SECTIONS: AutomationCategorizedSection[] = [
  {
    heading: 'Popular',
    options: [
      { value: 'task_created', label: 'Task created' },
      { value: 'status_change', label: 'Status changes' },
      { value: 'assignee_changed', label: 'Assignee changes' },
    ],
  },
  {
    heading: 'Dates',
    options: [
      { value: 'due_date_changed', label: 'Due date changes' },
      { value: 'start_date_changed', label: 'Start date changes' },
    ],
  },
  {
    heading: 'Tags',
    options: [
      { value: 'tag_added', label: 'Tag added' },
      { value: 'tag_removed', label: 'Tag removed' },
    ],
  },
  {
    heading: 'Task management',
    options: [
      { value: 'priority_changed', label: 'Priority changes' },
      { value: 'field_changed', label: 'Custom field changes' },
    ],
  },
  {
    heading: 'AI / missions',
    options: [
      { value: 'mission_completed', label: 'Agent completes mission' },
      { value: 'mission_failed', label: 'Agent mission fails' },
    ],
  },
]

const FORMS_TRIGGER_SECTIONS: AutomationCategorizedSection[] = [
  {
    heading: 'Form activity',
    options: [{ value: 'form_submitted', label: 'Form submitted' }],
  },
]

const CONTACTS_TRIGGER_SECTIONS: AutomationCategorizedSection[] = [
  {
    heading: 'Contact activity',
    options: [
      { value: 'contact_created', label: 'Contact created' },
      { value: 'contact_updated', label: 'Contact updated' },
    ],
  },
  {
    heading: 'Tags',
    options: [
      { value: 'contact_tag_added', label: 'Tag added' },
      { value: 'contact_tag_removed', label: 'Tag removed' },
    ],
  },
  {
    heading: 'Classification',
    options: [
      { value: 'contact_type_changed', label: 'Contact type changed' },
      { value: 'contact_source_changed', label: 'Contact source changed' },
    ],
  },
]

const ARTIFACTS_TRIGGER_SECTIONS: AutomationCategorizedSection[] = [
  {
    heading: 'Lifecycle',
    options: [{ value: 'artifact_lifecycle', label: 'Artifact lifecycle event' }],
  },
]

const WEBHOOK_TRIGGER_SECTIONS: AutomationCategorizedSection[] = [
  {
    heading: 'Inbound',
    options: [{ value: 'webhook_received', label: 'Webhook received' }],
  },
]

const SCHEDULE_TRIGGER_SECTIONS: AutomationCategorizedSection[] = [
  {
    heading: 'Time-based',
    options: [{ value: 'schedule', label: 'On a schedule' }],
  },
]

function connectedAppOptionsForProviders(
  providers: ConnectedAppFlowProvider[],
): AutomationCategorizedSection['options'] {
  return CONNECTED_APP_FLOW_TRIGGERS.filter((entry) => providers.includes(entry.provider)).map(
    (entry) => ({
      value: entry.triggerSlug,
      label: `${entry.providerLabel}: ${entry.eventLabel}`,
    }),
  )
}

const CONNECTED_APPS_TRIGGER_SECTIONS: AutomationCategorizedSection[] = [
  {
    heading: 'Email',
    options: [{ value: 'external_email_received', label: 'Email received' }],
  },
  {
    heading: 'Slack',
    options: [{ value: 'external_slack_message_received', label: 'Slack message received' }],
  },
  {
    heading: 'Meetings',
    options: [{ value: 'external_fathom_recording_ready', label: 'Fathom recording ready' }],
  },
  {
    heading: 'Calendar',
    options: connectedAppOptionsForProviders(['googlecalendar']),
  },
  {
    heading: 'Files',
    options: connectedAppOptionsForProviders(['googledrive']),
  },
  {
    heading: 'Spreadsheets',
    options: connectedAppOptionsForProviders(['googlesheets']),
  },
  {
    heading: 'CRM',
    options: connectedAppOptionsForProviders(['salesforce']),
  },
  {
    heading: 'Developer',
    options: connectedAppOptionsForProviders(['github']),
  },
  {
    heading: 'Docs',
    options: connectedAppOptionsForProviders(['notion']),
  },
]

export function triggerSectionsForObject(object: TriggerObjectKey): AutomationCategorizedSection[] {
  switch (object) {
    case 'tasks':
    case 'subtasks':
    case 'all_tasks':
      return TASK_TRIGGER_SECTIONS
    case 'forms':
      return FORMS_TRIGGER_SECTIONS
    case 'contacts':
      return CONTACTS_TRIGGER_SECTIONS
    case 'artifacts':
      return ARTIFACTS_TRIGGER_SECTIONS
    case 'webhooks':
      return WEBHOOK_TRIGGER_SECTIONS
    case 'schedule':
      return SCHEDULE_TRIGGER_SECTIONS
    case 'connected_apps':
      return CONNECTED_APPS_TRIGGER_SECTIONS
  }
}

/** Flat list of all sections, prefixed with the Object name, used for cross-Object search. */
export const ALL_TRIGGER_SECTIONS_FOR_SEARCH: AutomationCategorizedSection[] = [
  ...TASK_TRIGGER_SECTIONS.map((s) => ({
    heading: `Tasks · ${s.heading}`,
    options: s.options,
  })),
  ...FORMS_TRIGGER_SECTIONS.map((s) => ({
    heading: `Forms · ${s.heading}`,
    options: s.options,
  })),
  ...CONTACTS_TRIGGER_SECTIONS.map((s) => ({
    heading: `Contacts · ${s.heading}`,
    options: s.options,
  })),
  ...ARTIFACTS_TRIGGER_SECTIONS.map((s) => ({
    heading: `Artifacts · ${s.heading}`,
    options: s.options,
  })),
  ...WEBHOOK_TRIGGER_SECTIONS.map((s) => ({
    heading: `Webhooks · ${s.heading}`,
    options: s.options,
  })),
  ...SCHEDULE_TRIGGER_SECTIONS.map((s) => ({
    heading: `Schedule · ${s.heading}`,
    options: s.options,
  })),
  ...CONNECTED_APPS_TRIGGER_SECTIONS.map((s) => ({
    heading: `Connected apps · ${s.heading}`,
    options: s.options,
  })),
]

// ─── Action sections ───────────────────────────────────────────────────────

export const ACTION_SECTIONS: AutomationCategorizedSection[] = [
  {
    heading: 'Change work',
    options: [
      { value: 'create_task', label: 'Create task' },
      { value: 'change_status', label: 'Change status' },
      { value: 'change_priority', label: 'Change priority' },
      { value: 'assign_to', label: 'Assign to' },
      { value: 'create_subtask', label: 'Create subtask' },
    ],
  },
  {
    heading: 'Communicate',
    options: [
      { value: 'add_comment', label: 'Add comment' },
      { value: 'send_email', label: 'Send email' },
      { value: 'send_slack_message', label: 'Send Slack message' },
      {
        value: 'request_slack_follow_up_confirm',
        label: 'Post-call Slack follow-up',
      },
      { value: 'observe_slack_team', label: 'Observe Slack team' },
      { value: 'send_channel_message', label: 'Send channel message' },
    ],
  },
  {
    heading: 'Run agent',
    options: [
      { value: 'agent_suggest_tasks', label: 'Have agent suggest tasks' },
      { value: 'send_to_agent', label: 'Run task with agent' },
      { value: 'send_to_agents', label: 'Run task with multiple agents' },
      { value: 'ask_agent_to_improve_artifact', label: 'Ask agent to improve artifact' },
    ],
  },
  {
    heading: 'Meetings',
    options: [{ value: 'meetings_precall_prep', label: 'Prep today’s calendar meetings' }],
  },
  {
    heading: 'Integrations',
    options: [{ value: 'send_to_cursor', label: 'Send to Cursor (write code & open PR)' }],
  },
  {
    heading: 'Brain',
    options: [
      { value: 'add_brain_context_to_task', label: 'Atlas adds brain context' },
      { value: 'ingest_youtube_channel_to_agent_brain', label: 'Train agent brain from YouTube' },
    ],
  },
  {
    heading: 'Manage contact',
    options: [
      { value: 'create_contact', label: 'Create contact' },
      { value: 'update_contact_field', label: 'Update contact field' },
      { value: 'add_contact_tag', label: 'Add contact tag' },
      { value: 'remove_contact_tag', label: 'Remove contact tag' },
      { value: 'attach_note_to_contact', label: 'Attach contact note' },
      { value: 'link_item_to_contact', label: 'Link item to contact' },
    ],
  },
  {
    heading: 'Manage artifact',
    options: [
      { value: 'create_artifact', label: 'Create artifact' },
      { value: 'publish_artifact', label: 'Publish artifact' },
      { value: 'unpublish_artifact', label: 'Unpublish artifact' },
      { value: 'attach_artifact_to_item', label: 'Attach artifact to item' },
    ],
  },
  {
    heading: 'Flow controls',
    options: [
      { value: 'human_gate', label: 'Human gate' },
      { value: 'flow_branch', label: 'Branch (if-then)' },
      { value: 'flow_loop', label: 'Loop' },
    ],
  },
  {
    heading: 'Research',
    options: [
      { value: 'sync_social_research', label: 'Sync social research' },
      { value: 'select_social_outliers', label: 'Find top outliers' },
      { value: 'enrich_social_research_items', label: 'Extract hook/transcript' },
    ],
  },
]

export function sectionsForAvailableContexts(
  sections: AutomationCategorizedSection[],
  available: Set<AutomationContextKey>,
): AutomationCategorizedSection[] {
  return sections
    .map((section) => ({
      heading: section.heading,
      options: section.options.filter((option) => hasRequiredContexts(available, option.value)),
    }))
    .filter((section) => section.options.length > 0)
}

export function triggerTemplateVars(trigger: AutomationTrigger): AutomationTemplateVar[] {
  switch (trigger.type) {
    case 'external_email_received': {
      const source: AutomationTokenSource = trigger.provider === 'outlook' ? 'outlook' : 'gmail'
      return [
        {
          token: 'trigger.email',
          label: 'Email sender email',
          detail: 'Email address from the inbound email',
          kinds: ['email', 'message'],
          source,
        },
        {
          token: 'trigger.name',
          label: 'Email sender name',
          detail: 'Name parsed from the inbound email sender',
          kinds: ['name', 'message'],
          source,
        },
        {
          token: 'trigger.subject',
          label: 'Email subject',
          detail: 'Subject from the inbound email',
          kinds: ['title', 'message'],
          source,
        },
        {
          token: 'trigger.from',
          label: 'Email from',
          detail: 'Full sender value from the inbound email',
          kinds: ['message'],
          source,
        },
        {
          token: 'trigger.body',
          label: 'Email body',
          detail: 'Body text from the inbound email',
          kinds: ['message'],
          source,
        },
        {
          token: 'trigger.cc',
          label: 'Email CC',
          detail: 'CC recipients from the inbound email',
          kinds: ['email', 'message'],
          source,
        },
      ]
    }
    case 'external_slack_message_received':
      return [
        {
          token: 'trigger.text',
          label: 'Slack text',
          detail: 'Text from the incoming Slack message',
          kinds: ['title', 'message'],
          source: 'slack',
        },
        {
          token: 'trigger.from',
          label: 'Slack sender',
          detail: 'Sender from the Slack message',
          kinds: ['name', 'message'],
          source: 'slack',
        },
        {
          token: 'trigger.channel_id',
          label: 'Slack channel',
          detail: 'Channel where the message arrived',
          kinds: ['id'],
          source: 'slack',
        },
      ]
    case 'external_fathom_recording_ready':
      return [
        {
          token: 'trigger.title',
          label: 'Fathom title',
          detail: 'Meeting title from the Fathom recording',
          kinds: ['title', 'message'],
          source: 'fathom',
        },
        {
          token: 'trigger.primary_attendee_email',
          label: 'Fathom attendee email',
          detail: 'First attendee email that is not the recorder',
          kinds: ['email', 'message'],
          source: 'fathom',
        },
        {
          token: 'trigger.primary_attendee_name',
          label: 'Fathom attendee name',
          detail: 'First attendee name that is not the recorder',
          kinds: ['name', 'message'],
          source: 'fathom',
        },
      ]
    case 'external_app_event':
      return [
        {
          token: 'trigger.provider',
          label: 'App provider',
          detail: 'Composio toolkit slug for the connected app',
          kinds: ['id'],
        },
        {
          token: 'trigger.provider_label',
          label: 'App name',
          detail: 'Human-readable provider label',
          kinds: ['title', 'message'],
        },
        {
          token: 'trigger.trigger_slug',
          label: 'Trigger slug',
          detail: 'Composio trigger slug that fired',
          kinds: ['id'],
        },
        {
          token: 'trigger.event_label',
          label: 'Event label',
          detail: 'Human-readable event label',
          kinds: ['title', 'message'],
        },
        {
          token: 'trigger.connected_account_id',
          label: 'Connected account',
          detail: 'Composio connected account id',
          kinds: ['id'],
        },
        {
          token: 'trigger.payload',
          label: 'Event payload',
          detail: 'Raw JSON payload from the connected app event',
          kinds: ['message'],
        },
      ]
    case 'webhook_received':
      return [
        {
          token: 'trigger.payload',
          label: 'Webhook payload',
          detail: 'Full JSON body received by the webhook',
          kinds: ['message'],
          source: 'webhook',
        },
        {
          token: 'trigger.fields.customer_email',
          label: 'Mapped field',
          detail: 'Named field mapped from the webhook payload',
          kinds: ['email', 'message'],
          source: 'webhook',
        },
        {
          token: 'trigger.webhook.event_id',
          label: 'Webhook event ID',
          detail: 'Recorded event ID for this webhook delivery',
          kinds: ['id'],
          source: 'webhook',
        },
        {
          token: 'trigger.webhook.received_at',
          label: 'Webhook received time',
          detail: 'ISO timestamp for when the webhook was received',
          kinds: ['date'],
          source: 'webhook',
        },
      ]
    case 'form_submitted':
      return [
        {
          token: 'trigger.answers.email',
          label: 'Form email',
          detail: 'Email answer from the submitted form',
          kinds: ['email', 'message'],
          source: 'form',
        },
        {
          token: 'trigger.answers.name',
          label: 'Form name',
          detail: 'Name answer from the submitted form',
          kinds: ['name', 'message'],
          source: 'form',
        },
      ]
    case 'contact_created':
    case 'contact_updated':
    case 'contact_tag_added':
    case 'contact_tag_removed':
    case 'contact_type_changed':
    case 'contact_source_changed':
      return [
        {
          token: 'trigger.contact_id',
          label: 'Trigger contact ID',
          detail: 'Contact that caused this flow',
          kinds: ['id'],
          source: 'contact',
        },
      ]
    case 'schedule':
      return [
        {
          token: 'trigger.fired_at',
          label: 'Fire timestamp',
          detail: 'ISO timestamp of when the schedule fired',
          kinds: ['date'],
        },
      ]
    default:
      return []
  }
}

function appendStepOutputVars(
  vars: AutomationTemplateVar[],
  step: number,
  action: AutomationAction,
): void {
  switch (action.type) {
    case 'send_to_agent':
    case 'send_to_agents':
      vars.push({
        token: `steps.${step}.output`,
        label: `Step ${step} agent output`,
        detail: 'Agent response from this step when the run completes',
        kinds: ['message'],
        source: 'mission',
      })
      return
    case 'send_to_cursor':
      vars.push({
        token: `steps.${step}.output`,
        label: `Step ${step} Cursor output`,
        detail: 'Cursor agent result from this step',
        kinds: ['message'],
        source: 'artifact',
      })
      return
    case 'create_artifact':
      vars.push({
        token: `steps.${step}.output`,
        label: `Step ${step} artifact content`,
        detail: 'Generated content from this artifact step',
        kinds: ['message'],
        source: 'artifact',
      })
      return
    default:
      return
  }
}

export function stepTemplateVars(
  actions: AutomationAction[],
  beforeIndex: number,
): AutomationTemplateVar[] {
  const vars: AutomationTemplateVar[] = []
  for (let i = 0; i < beforeIndex; i++) {
    const step = i + 1
    const action = actions[i]
    if (!action || action.type === 'choose_action') continue
    if (action.type === 'create_contact') {
      vars.push(
        {
          token: `steps.${step}.contact_id`,
          label: `Step ${step} contact`,
          detail: 'Contact ID created in this step',
          kinds: ['id'],
          source: 'contact',
        },
        {
          token: `steps.${step}.email`,
          label: `Step ${step} contact email`,
          detail: 'Email from the contact created in this step',
          kinds: ['email', 'message'],
          source: 'contact',
        },
        {
          token: `steps.${step}.name`,
          label: `Step ${step} contact name`,
          detail: 'Name from the contact created in this step',
          kinds: ['name', 'message'],
          source: 'contact',
        },
      )
    }
    if (action.type === 'create_task') {
      vars.push(
        {
          token: `steps.${step}.item_id`,
          label: `Step ${step} task`,
          detail: 'Task ID created in this step',
          kinds: ['id'],
          source: 'task',
        },
        {
          token: `steps.${step}.title`,
          label: `Step ${step} task title`,
          detail: 'Title of the task created in this step',
          kinds: ['title', 'message'],
          source: 'task',
        },
      )
    }
    if (action.type === 'create_artifact') {
      vars.push(
        {
          token: `steps.${step}.artifact_id`,
          label: `Step ${step} artifact`,
          detail: 'Artifact ID created in this step',
          kinds: ['id'],
          source: 'artifact',
        },
        {
          token: `steps.${step}.title`,
          label: `Step ${step} artifact title`,
          detail: 'Title of the artifact created in this step',
          kinds: ['title', 'message'],
          source: 'artifact',
        },
      )
    }
    if (action.type === 'sync_social_research') {
      vars.push(
        {
          token: `steps.${step}.synced_count`,
          label: `Step ${step} synced count`,
          detail: 'Accounts or items counted during sync',
          source: 'social_research',
        },
        {
          token: `steps.${step}.created_count`,
          label: `Step ${step} created count`,
          detail: 'New social research items created',
          source: 'social_research',
        },
        {
          token: `steps.${step}.updated_count`,
          label: `Step ${step} updated count`,
          detail: 'Existing social research items updated',
          source: 'social_research',
        },
        {
          token: `steps.${step}.handles`,
          label: `Step ${step} handles`,
          detail: 'Tracked handles synced',
          source: 'social_research',
        },
      )
    }
    if (action.type === 'select_social_outliers') {
      vars.push(
        {
          token: `steps.${step}.outlier_count`,
          label: `Step ${step} outlier count`,
          detail: 'Number of outliers selected',
          source: 'social_research',
        },
        {
          token: `steps.${step}.selected_item_ids`,
          label: `Step ${step} selected item IDs`,
          detail: 'Space item IDs for selected outliers',
          kinds: ['id'],
          source: 'social_research',
        },
        {
          token: `steps.${step}.digest`,
          label: `Step ${step} digest`,
          detail: 'Markdown digest of selected outliers',
          kinds: ['message'],
          source: 'social_research',
        },
      )
    }
    if (action.type === 'enrich_social_research_items') {
      vars.push(
        {
          token: `steps.${step}.enriched_count`,
          label: `Step ${step} enriched count`,
          detail: 'Number of items enriched',
          source: 'social_research',
        },
        {
          token: `steps.${step}.digest`,
          label: `Step ${step} digest`,
          detail: 'Markdown digest after enrichment',
          kinds: ['message'],
          source: 'social_research',
        },
      )
    }
    if (action.type === 'ingest_youtube_channel_to_agent_brain') {
      vars.push(
        {
          token: `steps.${step}.queued_count`,
          label: `Step ${step} queued imports`,
          detail: 'Number of Atlas brain-import jobs queued',
          source: 'social_research',
        },
        {
          token: `steps.${step}.digest`,
          label: `Step ${step} digest`,
          detail: 'Markdown list of YouTube videos queued for ingestion',
          kinds: ['message'],
          source: 'social_research',
        },
      )
    }
    appendStepOutputVars(vars, step, action)
  }
  return vars
}

export interface TemplateVarMenuGroup {
  id: string
  label: string
  source?: AutomationTokenSource
  items: AutomationTemplateVar[]
}

function actionTypeLabel(type: string): string {
  for (const section of ACTION_SECTIONS) {
    const option = section.options.find((entry) => entry.value === type)
    if (option) return option.label
  }
  return type.replace(/_/g, ' ')
}

function findTriggerOptionLabel(type: string): string {
  for (const section of ALL_TRIGGER_SECTIONS_FOR_SEARCH) {
    const option = section.options.find((entry) => entry.value === type)
    if (option) return option.label
  }
  return type.replace(/_/g, ' ')
}

function triggerMenuLabel(trigger: AutomationTrigger): string {
  const label = findTriggerOptionLabel(trigger.type)
  if (TASK_SHAPED_TRIGGER_TYPES.has(trigger.type)) {
    const taskScope = (trigger as { task_scope?: 'tasks' | 'subtasks' | 'all' }).task_scope
    const scope = taskScope === 'subtasks' ? 'Subtask' : taskScope === 'all' ? 'Any task' : 'Task'
    return `${scope} · ${label}`
  }
  if (trigger.type === 'external_email_received') return `Email · ${label}`
  if (trigger.type === 'external_slack_message_received') return `Slack · ${label}`
  if (trigger.type === 'external_fathom_recording_ready') return `Fathom · ${label}`
  if (trigger.type === 'form_submitted') return `Form · ${label}`
  if (trigger.type === 'external_app_event') return `App · ${label}`
  if (trigger.type === 'schedule') return `Schedule · ${label}`
  return label
}

export function buildTemplateVarMenuGroups(input: {
  trigger: AutomationTrigger
  actions: AutomationAction[]
  beforeIndex: number
  internalVars?: AutomationTemplateVar[]
}): TemplateVarMenuGroup[] {
  const groups: TemplateVarMenuGroup[] = []
  const triggerItems = triggerTemplateVars(input.trigger)
  if (triggerItems.length > 0) {
    groups.push({
      id: 'trigger',
      label: triggerMenuLabel(input.trigger),
      source: triggerItems[0]?.source,
      items: triggerItems,
    })
  }

  const stepVars = stepTemplateVars(input.actions, input.beforeIndex)
  for (let i = 0; i < input.beforeIndex; i++) {
    const step = i + 1
    const action = input.actions[i]
    if (!action || action.type === 'choose_action') continue
    const items = stepVars.filter((entry) => entry.token.startsWith(`steps.${step}.`))
    if (items.length === 0) continue
    groups.push({
      id: `step-${step}`,
      label: `${step}. ${actionTypeLabel(action.type)}`,
      source: items[0]?.source,
      items,
    })
  }

  const internalItems = input.internalVars ?? []
  if (internalItems.length > 0) {
    groups.push({
      id: 'current-task',
      label: 'Current task',
      source: 'task',
      items: internalItems,
    })
  }

  return groups
}

export function contactReferenceOptions(
  trigger: AutomationTrigger,
  actions: AutomationAction[],
  beforeIndex: number,
): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = []
  if (contextsForTrigger(trigger).has('contact')) {
    out.push({ value: '', label: 'Trigger contact' })
  }
  for (let i = 0; i < beforeIndex; i++) {
    if (actions[i]?.type === 'create_contact') {
      out.push({ value: `{{steps.${i + 1}.contact_id}}`, label: `Contact from step ${i + 1}` })
    }
  }
  return out
}

export function defaultAction(type: string): AutomationAction | null {
  switch (type) {
    case 'create_task':
      return { type: 'create_task', title_template: '', status: undefined, priority: undefined }
    case 'send_to_agent':
      return {
        type: 'send_to_agent',
        agent_key: '',
        prompt_template: '',
        inject_fields: [],
        output_type: 'none',
        extended_brain_knowledge: false,
        agent_collaboration: 'allowed',
      }
    case 'send_to_agents':
      return {
        type: 'send_to_agents',
        prompt_template: '',
        agent_tasks: [{ agent_key: '' }, { agent_key: '' }],
        inject_fields: [],
        extended_brain_knowledge: false,
        agent_collaboration: 'disabled',
      }
    case 'send_to_cursor':
      return {
        type: 'send_to_cursor',
        repo_url: '',
        base_branch: 'main',
        prompt_template: '{{task.title}}\n\n{{task.description}}',
        model_id: 'composer-2',
        inject_fields: [],
        completed_status: undefined,
      }
    case 'add_brain_context_to_task':
      return { type: 'add_brain_context_to_task' }
    case 'agent_suggest_tasks':
      return {
        type: 'agent_suggest_tasks',
        agent_key: 'vibey',
        max_suggestions: 10,
        instructions: '',
        extended_brain_knowledge: false,
      }
    case 'assign_to':
      return { type: 'assign_to', assignees: [] }
    case 'change_status':
      return { type: 'change_status', status: '' }
    case 'change_priority':
      return { type: 'change_priority', priority: undefined }
    case 'add_comment':
      return { type: 'add_comment', message_template: '' }
    case 'human_gate':
      return {
        type: 'human_gate',
        waiting_status: 'in_review',
        resume_on_status: 'done',
        reject_on_status: 'needs_revision',
        message_template: 'Review and approve to continue. Move this task to Done when ready.',
      }
    case 'flow_branch':
      return {
        type: 'flow_branch',
        field_id: 'status',
        operator: 'equals',
        value: '',
        then_step_index: 0,
      }
    case 'flow_loop':
      return {
        type: 'flow_loop',
        target_step_index: 0,
        when: 'on_reject',
        max_iterations: 3,
      }
    case 'send_email':
      return {
        type: 'send_email',
        tool_slug: 'GMAIL_SEND_EMAIL',
        connected_account_id: '',
        to: '',
        subject_template: '',
        body_template: '',
        subject_source: 'manual',
      }
    case 'send_slack_message':
      return { type: 'send_slack_message', channel_id: '', text_template: '' }
    case 'request_slack_follow_up_confirm':
      return {
        type: 'request_slack_follow_up_confirm',
        delivery_mode: 'shadow',
        dm_email: 'dylan@dylanvanas.com',
        confirm_reaction: 'white_check_mark',
      }
    case 'observe_slack_team':
      return {
        type: 'observe_slack_team',
        loop_kind: 'all',
        delivery_mode: 'shadow',
        channel_ids: [],
        person_ids: [],
        lookback_minutes: 60,
        daily_limit: 40,
      }
    case 'send_channel_message':
      return { type: 'send_channel_message', channel_id: '', content_template: '' }
    case 'create_contact':
      return { type: 'create_contact', email_template: '', name_template: '', source: 'automation' }
    case 'update_contact_field':
      return { type: 'update_contact_field', contact_id: '', field_id: '', value_template: '' }
    case 'add_contact_tag':
      return { type: 'add_contact_tag', contact_id: '', tag: '' }
    case 'remove_contact_tag':
      return { type: 'remove_contact_tag', contact_id: '', tag: '' }
    case 'attach_note_to_contact':
      return { type: 'attach_note_to_contact', contact_id: '', content_template: '' }
    case 'link_item_to_contact':
      return { type: 'link_item_to_contact', contact_id: '' }
    case 'create_artifact':
      return { type: 'create_artifact', artifact_kind: 'presentation', title_template: '' }
    case 'publish_artifact':
      return { type: 'publish_artifact', artifact_kind: 'presentation', artifact_id: '' }
    case 'unpublish_artifact':
      return { type: 'unpublish_artifact', artifact_kind: 'presentation', artifact_id: '' }
    case 'ask_agent_to_improve_artifact':
      return {
        type: 'ask_agent_to_improve_artifact',
        artifact_kind: 'presentation',
        artifact_id: '',
        agent_key: '',
        prompt_template: '',
      }
    case 'attach_artifact_to_item':
      return { type: 'attach_artifact_to_item', artifact_kind: 'presentation', artifact_id: '' }
    case 'create_subtask':
      return { type: 'create_subtask', title_template: '' }
    case 'sync_social_research':
      return { type: 'sync_social_research', platform: 'all', sync_mode: 'use_existing' }
    case 'select_social_outliers':
      return {
        type: 'select_social_outliers',
        platform: 'all',
        min_outlier_score: 2,
        limit: 10,
        since_days: 30,
      }
    case 'enrich_social_research_items':
      return {
        type: 'enrich_social_research_items',
        enrichments: ['caption', 'hook', 'transcript'],
      }
    case 'ingest_youtube_channel_to_agent_brain':
      return {
        type: 'ingest_youtube_channel_to_agent_brain',
        agent_key: '',
        channel_urls: [''],
        since_days: 7,
        max_videos_per_channel: 25,
        include_shorts: false,
        domain: 'strategy',
      }
    case 'meetings_precall_prep':
      return {
        type: 'meetings_precall_prep',
        refresh: true,
      }
    default:
      return null
  }
}
