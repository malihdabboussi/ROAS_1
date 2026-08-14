export type FlowCapabilityKind = 'trigger' | 'action'

export type FlowCapability = {
  id: string
  kind: FlowCapabilityKind
  type: string
  label: string
  category: string
  description: string
  requiredFields: string[]
  optionalFields: string[]
  compatibleTriggerTypes?: string[]
  example: Record<string, unknown>
}

export type FlowCapabilitySearchInput = {
  query?: string | null
  kind?: FlowCapabilityKind | null
  category?: string | null
  limit?: number | null
  cursor?: string | null
}

export type FlowCapabilitySearchResult = {
  results: FlowCapability[]
  total: number
  limit: number
  next_cursor: string | null
}

type ConnectedAppFlowTrigger = {
  provider: string
  providerLabel: string
  triggerSlug: string
  eventLabel: string
  requiredConfigKeys?: readonly string[]
}

const CONNECTED_APP_FLOW_TRIGGERS: readonly ConnectedAppFlowTrigger[] = [
  {
    provider: 'googlecalendar',
    providerLabel: 'Google Calendar',
    triggerSlug: 'GOOGLECALENDAR_EVENT_STARTING_SOON_TRIGGER',
    eventLabel: 'Event starting soon',
  },
  {
    provider: 'googlecalendar',
    providerLabel: 'Google Calendar',
    triggerSlug: 'GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER',
    eventLabel: 'Event created',
  },
  {
    provider: 'googledrive',
    providerLabel: 'Google Drive',
    triggerSlug: 'GOOGLEDRIVE_FILE_CREATED_TRIGGER',
    eventLabel: 'File created',
  },
  {
    provider: 'googledrive',
    providerLabel: 'Google Drive',
    triggerSlug: 'GOOGLEDRIVE_FILE_UPDATED_TRIGGER',
    eventLabel: 'File updated',
  },
  {
    provider: 'googledrive',
    providerLabel: 'Google Drive',
    triggerSlug: 'GOOGLEDRIVE_COMMENT_ADDED_TRIGGER',
    eventLabel: 'Comment added',
  },
  {
    provider: 'googlesheets',
    providerLabel: 'Google Sheets',
    triggerSlug: 'GOOGLESHEETS_NEW_ROWS_TRIGGER',
    eventLabel: 'New rows',
    requiredConfigKeys: ['spreadsheet_id'],
  },
  {
    provider: 'googlesheets',
    providerLabel: 'Google Sheets',
    triggerSlug: 'GOOGLESHEETS_SPREADSHEET_ROW_CHANGED_TRIGGER',
    eventLabel: 'Spreadsheet row changed',
    requiredConfigKeys: ['spreadsheet_id'],
  },
  {
    provider: 'salesforce',
    providerLabel: 'Salesforce',
    triggerSlug: 'SALESFORCE_NEW_LEAD_TRIGGER',
    eventLabel: 'New lead',
  },
  {
    provider: 'salesforce',
    providerLabel: 'Salesforce',
    triggerSlug: 'SALESFORCE_NEW_OR_UPDATED_OPPORTUNITY_TRIGGER',
    eventLabel: 'New or updated opportunity',
  },
  {
    provider: 'github',
    providerLabel: 'GitHub',
    triggerSlug: 'GITHUB_ISSUE_CREATED_TRIGGER',
    eventLabel: 'Issue created',
  },
  {
    provider: 'github',
    providerLabel: 'GitHub',
    triggerSlug: 'GITHUB_DEPLOYMENT_STATE_CHANGED_TRIGGER',
    eventLabel: 'Deployment state changed',
  },
  {
    provider: 'notion',
    providerLabel: 'Notion',
    triggerSlug: 'NOTION_PAGE_ADDED_TO_DATABASE',
    eventLabel: 'Page added to database',
    requiredConfigKeys: ['database_id'],
  },
  {
    provider: 'notion',
    providerLabel: 'Notion',
    triggerSlug: 'NOTION_PAGE_CONTENT_UPDATED',
    eventLabel: 'Page content updated',
  },
]

const TRIGGERS: FlowCapability[] = [
  capability(
    'trigger',
    'task_created',
    'Tasks',
    'Task created',
    'Runs when a task is created.',
    [],
    ['in_status', 'task_scope'],
    { type: 'task_created' },
  ),
  capability(
    'trigger',
    'status_change',
    'Tasks',
    'Status changed',
    'Runs when a task moves between statuses.',
    ['to'],
    ['from', 'task_scope'],
    { type: 'status_change', to: 'done' },
  ),
  capability(
    'trigger',
    'field_changed',
    'Tasks',
    'Field changed',
    'Runs when a custom task field changes.',
    ['field_id'],
    ['to', 'task_scope'],
    { type: 'field_changed', field_id: 'custom_field_id' },
  ),
  capability(
    'trigger',
    'priority_changed',
    'Tasks',
    'Priority changed',
    'Runs when task priority changes.',
    ['to'],
    ['from', 'task_scope'],
    { type: 'priority_changed', to: 'high' },
  ),
  capability(
    'trigger',
    'assignee_changed',
    'Tasks',
    'Assignee changed',
    'Runs when task ownership changes.',
    [],
    ['assignee_type', 'assignee_id', 'task_scope'],
    { type: 'assignee_changed' },
  ),
  capability(
    'trigger',
    'due_date_changed',
    'Tasks',
    'Due date changed',
    'Runs when a task due date changes.',
    [],
    ['from', 'to', 'task_scope'],
    { type: 'due_date_changed' },
  ),
  capability(
    'trigger',
    'start_date_changed',
    'Tasks',
    'Start date changed',
    'Runs when a task start date changes.',
    [],
    ['from', 'to', 'task_scope'],
    { type: 'start_date_changed' },
  ),
  capability(
    'trigger',
    'tag_added',
    'Tasks',
    'Tag added',
    'Runs when a tag is added to a task.',
    [],
    ['tag', 'task_scope'],
    { type: 'tag_added' },
  ),
  capability(
    'trigger',
    'tag_removed',
    'Tasks',
    'Tag removed',
    'Runs when a tag is removed from a task.',
    [],
    ['tag', 'task_scope'],
    { type: 'tag_removed' },
  ),
  capability(
    'trigger',
    'mission_completed',
    'Missions',
    'Mission completed',
    'Runs when a mission completes.',
    [],
    ['task_scope'],
    { type: 'mission_completed' },
  ),
  capability(
    'trigger',
    'mission_failed',
    'Missions',
    'Mission failed',
    'Runs when a mission fails.',
    [],
    ['task_scope'],
    { type: 'mission_failed' },
  ),
  capability(
    'trigger',
    'form_submitted',
    'Forms',
    'Form submitted',
    'Runs when a Space form is submitted.',
    ['form_id'],
    ['field_id', 'field_value'],
    { type: 'form_submitted', form_id: 'form_id' },
  ),
  capability(
    'trigger',
    'contact_created',
    'Contacts',
    'Contact created',
    'Runs when a contact is created.',
    [],
    [],
    { type: 'contact_created' },
  ),
  capability(
    'trigger',
    'contact_updated',
    'Contacts',
    'Contact updated',
    'Runs when a contact is updated.',
    [],
    ['field_id', 'to'],
    { type: 'contact_updated' },
  ),
  capability(
    'trigger',
    'contact_tag_added',
    'Contacts',
    'Contact tag added',
    'Runs when a contact tag is added.',
    [],
    ['tag'],
    { type: 'contact_tag_added' },
  ),
  capability(
    'trigger',
    'contact_tag_removed',
    'Contacts',
    'Contact tag removed',
    'Runs when a contact tag is removed.',
    [],
    ['tag'],
    { type: 'contact_tag_removed' },
  ),
  capability(
    'trigger',
    'contact_type_changed',
    'Contacts',
    'Contact type changed',
    'Runs when contact type changes.',
    [],
    ['to'],
    { type: 'contact_type_changed' },
  ),
  capability(
    'trigger',
    'contact_source_changed',
    'Contacts',
    'Contact source changed',
    'Runs when contact source changes.',
    [],
    ['to'],
    { type: 'contact_source_changed' },
  ),
  capability(
    'trigger',
    'artifact_lifecycle',
    'Artifacts',
    'Artifact lifecycle',
    'Runs when an artifact changes lifecycle state.',
    ['lifecycle_event'],
    ['artifact_kind', 'artifact_id', 'status'],
    { type: 'artifact_lifecycle', artifact_kind: 'document', lifecycle_event: 'published' },
  ),
  capability(
    'trigger',
    'external_email_received',
    'Connected Apps',
    'Email received',
    'Runs when connected email receives a message.',
    ['provider', 'trigger_slug', 'connected_account_id'],
    ['gmail_category', 'from_contains', 'subject_contains'],
    {
      type: 'external_email_received',
      provider: 'gmail',
      trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
      connected_account_id: 'connected_account_id',
    },
  ),
  capability(
    'trigger',
    'external_slack_message_received',
    'Connected Apps',
    'Slack message received',
    'Runs when Slack receives a matching message.',
    ['trigger_slug', 'connected_account_id'],
    ['channel_id', 'from_contains', 'text_contains'],
    {
      type: 'external_slack_message_received',
      trigger_slug: 'SLACK_CHANNEL_MESSAGE_RECEIVED',
      connected_account_id: 'connected_account_id',
      channel_id: 'C123',
    },
  ),
  capability(
    'trigger',
    'external_fathom_recording_ready',
    'Connected Apps',
    'Fathom recording ready',
    'Runs when a Fathom recording is ready.',
    [],
    ['title_contains', 'recorded_by_contains', 'source'],
    { type: 'external_fathom_recording_ready' },
  ),
  capability(
    'trigger',
    'schedule',
    'Schedule',
    'Schedule',
    'Runs on a schedule.',
    ['schedule', 'timezone'],
    [],
    { type: 'schedule', schedule: { kind: 'cron', expression: '0 9 * * 1' }, timezone: 'UTC' },
  ),
  capability(
    'trigger',
    'webhook_received',
    'Webhooks',
    'Webhook received',
    'Runs when a first-party Space webhook receives a signed JSON request.',
    ['webhook_endpoint_id'],
    [],
    { type: 'webhook_received', webhook_endpoint_id: 'webhook_endpoint_id' },
  ),
  ...CONNECTED_APP_FLOW_TRIGGERS.map((trigger) =>
    capability(
      'trigger',
      `external_app_event.${trigger.triggerSlug}`,
      'Connected Apps',
      `${trigger.providerLabel}: ${trigger.eventLabel}`,
      `Runs when ${trigger.eventLabel.toLowerCase()} happens in ${trigger.providerLabel}.`,
      ['provider', 'trigger_slug', 'connected_account_id'],
      ['trigger_config'],
      {
        type: 'external_app_event',
        provider: trigger.provider,
        trigger_slug: trigger.triggerSlug,
        connected_account_id: 'connected_account_id',
        ...(trigger.requiredConfigKeys
          ? {
              trigger_config: Object.fromEntries(
                trigger.requiredConfigKeys.map((key) => [key, `${key}_value`]),
              ),
            }
          : {}),
      },
    ),
  ),
]

const ACTIONS: FlowCapability[] = [
  capability(
    'action',
    'create_task',
    'Tasks',
    'Create task',
    'Creates a task in the Space.',
    ['title_template'],
    [
      'status',
      'assignees',
      'assignee_type',
      'assignee_id',
      'priority',
      'notes_template',
      'field_values',
      'continuation',
    ],
    { type: 'create_task', title_template: 'Follow up' },
  ),
  capability(
    'action',
    'send_to_agent',
    'Agents',
    'Send to agent',
    'Asks one agent to handle the event. Use output_type when the agent should create a durable artifact, and completed_status when the task should move after the agent run completes.',
    ['agent_key', 'prompt_template'],
    [
      'agent_collaboration',
      'output_type',
      'completed_status',
      'continuation',
      'target_item_ref',
      'extended_brain_knowledge',
      'inject_fields',
      'priority',
    ],
    {
      type: 'send_to_agent',
      agent_key: 'vibey',
      prompt_template: 'Create a concise strategy brief for {{task.title}}.',
      agent_collaboration: 'allowed',
      output_type: 'document_artifact',
      continuation: 'after_task_completes',
      completed_status: 'in_review',
    },
  ),
  capability(
    'action',
    'send_to_agents',
    'Agents',
    'Run task with multiple agents',
    'Runs several agents in parallel on the same task.',
    ['prompt_template', 'agent_tasks'],
    [
      'inject_fields',
      'target_item_ref',
      'extended_brain_knowledge',
      'agent_collaboration',
      'priority',
      'continuation',
      'completed_status',
    ],
    {
      type: 'send_to_agents',
      prompt_template: 'Review this from your specialty.',
      agent_tasks: [{ agent_key: 'vibey' }, { agent_key: 'copywriter' }],
      agent_collaboration: 'disabled',
    },
  ),
  capability(
    'action',
    'send_to_cursor',
    'Integrations',
    'Send to Cursor',
    'Creates a development request for connected project work.',
    ['repo_url', 'prompt_template'],
    [
      'connection_id',
      'base_branch',
      'branch_name',
      'model_id',
      'inject_fields',
      'target_item_ref',
      'priority',
      'continuation',
      'completed_status',
    ],
    {
      type: 'send_to_cursor',
      repo_url: 'https://github.com/acme/repo',
      prompt_template: 'Investigate this issue',
    },
  ),
  capability(
    'action',
    'add_brain_context_to_task',
    'Brain',
    'Add Brain context to task',
    'Adds retrieved Brain context to the triggering task.',
    [],
    ['target_item_ref', 'query_template', 'continuation'],
    { type: 'add_brain_context_to_task', query_template: '{{task.title}}' },
  ),
  capability(
    'action',
    'agent_suggest_tasks',
    'Agents',
    'Agent suggests tasks',
    'Asks an agent to suggest follow-up tasks.',
    [],
    ['agent_key', 'max_suggestions', 'instructions', 'extended_brain_knowledge', 'continuation'],
    { type: 'agent_suggest_tasks', agent_key: 'vibey', instructions: 'Suggest next steps' },
  ),
  capability(
    'action',
    'assign_to',
    'Tasks',
    'Assign to',
    'Assigns the triggering task.',
    [],
    ['assignees', 'assignee_type', 'assignee_id', 'target_item_ref', 'continuation'],
    { type: 'assign_to', assignee_type: 'unassigned' },
  ),
  capability(
    'action',
    'change_status',
    'Tasks',
    'Change status',
    'Changes the triggering task status.',
    ['status'],
    ['target_item_ref', 'continuation'],
    { type: 'change_status', status: 'done' },
  ),
  capability(
    'action',
    'change_priority',
    'Tasks',
    'Change priority',
    'Changes the triggering task priority.',
    ['priority'],
    ['target_item_ref', 'continuation'],
    { type: 'change_priority', priority: 'high' },
  ),
  capability(
    'action',
    'add_comment',
    'Tasks',
    'Add comment',
    'Adds a comment to the triggering task.',
    ['message_template'],
    ['target_item_ref', 'continuation'],
    { type: 'add_comment', message_template: 'Automation note' },
  ),
  capability(
    'action',
    'human_gate',
    'Flow controls',
    'Human gate',
    'Pauses the flow until a human moves the task to an approval status.',
    ['assignees', 'waiting_status', 'resume_on_status', 'reject_on_status', 'message_template'],
    [
      'target_item_ref',
      'assignee_type',
      'assignee_id',
      'on_reject_goto_step_index',
      'continuation',
    ],
    {
      type: 'human_gate',
      waiting_status: 'in_review',
      resume_on_status: 'done',
      reject_on_status: 'needs_revision',
      message_template: 'Review and move to Done to continue.',
    },
  ),
  capability(
    'action',
    'flow_loop',
    'Flow controls',
    'Loop',
    'Jumps back to an earlier step for revision cycles.',
    ['target_step_index'],
    ['when', 'max_iterations', 'continuation'],
    {
      type: 'flow_loop',
      target_step_index: 0,
      when: 'on_reject',
      max_iterations: 3,
    },
  ),
  capability(
    'action',
    'flow_branch',
    'Flow controls',
    'Branch',
    'Routes to different steps based on a task field condition.',
    ['field_id', 'then_step_index'],
    ['operator', 'value', 'else_step_index', 'continuation'],
    {
      type: 'flow_branch',
      field_id: 'status',
      operator: 'equals',
      value: 'done',
      then_step_index: 0,
    },
  ),
  capability(
    'action',
    'send_email',
    'Communication',
    'Send email',
    'Sends an email through a connected account.',
    ['tool_slug', 'connected_account_id', 'to'],
    ['subject_template', 'body_template', 'subject_source', 'email_artifact_id', 'continuation'],
    {
      type: 'send_email',
      tool_slug: 'gmail',
      connected_account_id: 'connected_account_id',
      to: '{{contact.email}}',
      subject_template: 'Update',
      body_template: 'Hello',
    },
  ),
  capability(
    'action',
    'send_slack_message',
    'Communication',
    'Send Slack message',
    'Sends a Slack message.',
    ['channel_id', 'text_template'],
    ['thread_ts', 'continuation'],
    { type: 'send_slack_message', channel_id: 'C123', text_template: 'New update' },
  ),
  capability(
    'action',
    'request_slack_follow_up_confirm',
    'Communication',
    'Post-call Slack follow-up',
    'Processes a completed call into reviewable account-manager drafts. Shadow stores them in Conversations without sending; Active sends only to eligible internal recipients.',
    ['delivery_mode'],
    [
      'meeting_scope',
      'channel_delivery',
      'destination_channel_id',
      'dm_email',
      'confirm_reaction',
      'suggestion_ids',
      'continuation',
    ],
    {
      type: 'request_slack_follow_up_confirm',
      meeting_scope: 'client',
      delivery_mode: 'shadow',
      channel_delivery: 'disabled',
      destination_channel_id: 'C0BN7P2BWRM',
      dm_email: 'dylan@dylanvanas.com',
      confirm_reaction: 'white_check_mark',
    },
  ),
  capability(
    'action',
    'observe_slack_team',
    'Communication',
    'Observe Slack team',
    'Analyzes every non-Ignored sender in selected Slack channels for proactive work. person_ids restricts Active delivery, Person Brain compounding, and personal-moment outreach.',
    ['loop_kind', 'delivery_mode'],
    [
      'channel_ids',
      'person_ids',
      'lookback_minutes',
      'daily_limit',
      'quiet_hours',
      'instructions',
      'continuation',
    ],
    {
      type: 'observe_slack_team',
      loop_kind: 'all',
      delivery_mode: 'shadow',
      lookback_minutes: 60,
      daily_limit: 10,
    },
  ),
  capability(
    'action',
    'send_channel_message',
    'Communication',
    'Send channel message',
    'Sends a message to a Space channel.',
    ['channel_id', 'content_template'],
    ['continuation'],
    { type: 'send_channel_message', channel_id: 'channel_id', content_template: 'New update' },
  ),
  capability(
    'action',
    'create_contact',
    'Contacts',
    'Create contact',
    'Creates a contact.',
    ['email_template'],
    ['name_template', 'source', 'field_values', 'continuation'],
    { type: 'create_contact', email_template: '{{email.from}}' },
  ),
  capability(
    'action',
    'update_contact_field',
    'Contacts',
    'Update contact field',
    'Updates one contact field.',
    ['field_id', 'value_template'],
    ['contact_id', 'continuation'],
    { type: 'update_contact_field', field_id: 'status', value_template: 'Warm' },
  ),
  capability(
    'action',
    'add_contact_tag',
    'Contacts',
    'Add contact tag',
    'Adds a tag to a contact.',
    ['tag'],
    ['contact_id', 'continuation'],
    { type: 'add_contact_tag', tag: 'tag_name' },
  ),
  capability(
    'action',
    'remove_contact_tag',
    'Contacts',
    'Remove contact tag',
    'Removes a tag from a contact.',
    ['tag'],
    ['contact_id', 'continuation'],
    { type: 'remove_contact_tag', tag: 'tag_name' },
  ),
  capability(
    'action',
    'attach_note_to_contact',
    'Contacts',
    'Attach note to contact',
    'Adds a note to a contact.',
    ['content_template'],
    ['contact_id', 'continuation'],
    { type: 'attach_note_to_contact', content_template: 'Meeting summary' },
  ),
  capability(
    'action',
    'link_item_to_contact',
    'Contacts',
    'Link item to contact',
    'Links the current item to a contact.',
    ['contact_id'],
    ['continuation'],
    { type: 'link_item_to_contact', contact_id: 'contact_id' },
  ),
  capability(
    'action',
    'create_artifact',
    'Artifacts',
    'Create artifact',
    'Creates a platform artifact.',
    ['artifact_kind', 'title_template'],
    ['campaign_id', 'continuation'],
    { type: 'create_artifact', artifact_kind: 'document', title_template: 'Summary' },
  ),
  capability(
    'action',
    'publish_artifact',
    'Artifacts',
    'Publish artifact',
    'Publishes an artifact.',
    ['artifact_kind', 'artifact_id'],
    ['target_item_ref', 'continuation'],
    { type: 'publish_artifact', artifact_kind: 'document', artifact_id: 'artifact_id' },
  ),
  capability(
    'action',
    'unpublish_artifact',
    'Artifacts',
    'Unpublish artifact',
    'Unpublishes an artifact.',
    ['artifact_kind', 'artifact_id'],
    ['continuation'],
    { type: 'unpublish_artifact', artifact_kind: 'document', artifact_id: 'artifact_id' },
  ),
  capability(
    'action',
    'ask_agent_to_improve_artifact',
    'Artifacts',
    'Improve artifact',
    'Asks an agent to improve an artifact.',
    ['artifact_kind', 'artifact_id', 'agent_key', 'prompt_template'],
    ['continuation'],
    {
      type: 'ask_agent_to_improve_artifact',
      artifact_kind: 'document',
      agent_key: 'vibey',
      artifact_id: 'artifact_id',
      prompt_template: 'Improve clarity',
    },
  ),
  capability(
    'action',
    'attach_artifact_to_item',
    'Artifacts',
    'Attach artifact to item',
    'Attaches an artifact to the triggering item.',
    ['artifact_kind', 'artifact_id'],
    ['continuation'],
    { type: 'attach_artifact_to_item', artifact_kind: 'document', artifact_id: 'artifact_id' },
  ),
  capability(
    'action',
    'create_subtask',
    'Tasks',
    'Create subtask',
    'Creates a subtask under the triggering task.',
    ['title_template'],
    ['assignees', 'assignee_type', 'assignee_id', 'target_item_ref', 'continuation'],
    { type: 'create_subtask', title_template: 'Review' },
  ),
  capability(
    'action',
    'sync_social_research',
    'Social Research',
    'Sync social research',
    'Starts social research sync.',
    [],
    ['platform', 'sync_mode', 'continuation'],
    { type: 'sync_social_research', platform: 'instagram' },
  ),
  capability(
    'action',
    'select_social_outliers',
    'Social Research',
    'Select social outliers',
    'Selects outliers from synced social research.',
    [],
    ['platform', 'min_outlier_score', 'limit', 'since_days', 'source_step', 'continuation'],
    { type: 'select_social_outliers', platform: 'instagram', limit: 10 },
  ),
  capability(
    'action',
    'enrich_social_research_items',
    'Social Research',
    'Enrich social research items',
    'Enriches selected social research rows.',
    [],
    ['enrichments', 'source_step', 'continuation'],
    { type: 'enrich_social_research_items', enrichments: ['caption'] },
  ),
  capability(
    'action',
    'ingest_youtube_channel_to_agent_brain',
    'Brain',
    'Ingest YouTube channel to agent brain',
    'Fetches recent long-form YouTube channel videos and queues Atlas brain-import jobs for an agent brain.',
    ['channel_urls'],
    [
      'agent_key',
      'brain_id',
      'since_days',
      'max_videos_per_channel',
      'include_shorts',
      'domain',
      'continuation',
    ],
    {
      type: 'ingest_youtube_channel_to_agent_brain',
      agent_key: 'vibey',
      channel_urls: ['https://youtube.com/@channel'],
      since_days: 7,
      include_shorts: false,
    },
  ),
]

export const FLOW_CAPABILITY_CATALOG = [...TRIGGERS, ...ACTIONS] as const

function capability(
  kind: FlowCapabilityKind,
  type: string,
  category: string,
  label: string,
  description: string,
  requiredFields: string[],
  optionalFields: string[],
  example: Record<string, unknown>,
): FlowCapability {
  return {
    id: `${kind}.${type}`,
    kind,
    type: type.startsWith('external_app_event.') ? 'external_app_event' : type,
    category,
    label,
    description,
    requiredFields,
    optionalFields,
    example,
  }
}

function normalizeLimit(limit: number | null | undefined): number {
  if (!Number.isFinite(limit)) return 20
  return Math.min(Math.max(Math.trunc(Number(limit)), 1), 50)
}

function normalizeCursor(cursor: string | null | undefined): number {
  const parsed = Number(cursor ?? 0)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(Math.trunc(parsed), 0)
}

export function searchFlowCapabilities(
  input: FlowCapabilitySearchInput = {},
): FlowCapabilitySearchResult {
  const query = String(input.query ?? '')
    .trim()
    .toLowerCase()
  const category = String(input.category ?? '')
    .trim()
    .toLowerCase()
  const limit = normalizeLimit(input.limit)
  const offset = normalizeCursor(input.cursor)
  const filtered = FLOW_CAPABILITY_CATALOG.filter((capability) => {
    if (input.kind && capability.kind !== input.kind) return false
    if (category && capability.category.toLowerCase() !== category) return false
    if (!query) return true
    const haystack = [
      capability.id,
      capability.type,
      capability.label,
      capability.category,
      capability.description,
      capability.requiredFields.join(' '),
      capability.optionalFields.join(' '),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
  const results = filtered.slice(offset, offset + limit)
  const nextOffset = offset + results.length
  return {
    results,
    total: filtered.length,
    limit,
    next_cursor: nextOffset < filtered.length ? String(nextOffset) : null,
  }
}

export function getFlowCapability(capabilityId: string): FlowCapability | null {
  return FLOW_CAPABILITY_CATALOG.find((capability) => capability.id === capabilityId) ?? null
}
