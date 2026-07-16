import parser from 'cron-parser'
import { findFirstContextIssue } from './automation-context'
import {
  connectedAppFlowProviderMatchesSlug,
  getConnectedAppFlowTriggerBySlug,
} from './connected-app-flow-triggers'
import { scheduleToCron, type FlowAutomationSchedule } from './schedule-cron'

export type AutomationActionLike = {
  type: string
  title_template?: string
  agent_key?: string
  agent_tasks?: Array<{ agent_key?: string; prompt_template?: string }>
  prompt_template?: string
  assignees?: unknown[]
  assignee_id?: string
  status?: string
  priority?: string
  message_template?: string
  waiting_status?: string
  resume_on_status?: string
  reject_on_status?: string
  on_reject_goto_step_index?: number
  target_step_index?: number
  when?: string
  max_iterations?: number
  tool_slug?: string
  connected_account_id?: string
  to?: string
  subject_source?: string
  subject_template?: string
  body_template?: string
  channel_id?: string
  text_template?: string
  content_template?: string
  email_template?: string
  field_id?: string
  value_template?: string
  operator?: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty'
  value?: string
  then_step_index?: number
  else_step_index?: number
  tag?: string
  contact_id?: string
  artifact_kind?: string
  artifact_id?: string
  platform?: string
  sync_mode?: string
  min_outlier_score?: number
  limit?: number
  enrichments?: unknown[]
  brain_id?: string
  channel_urls?: string[]
}

export type AutomationTriggerLike = {
  type: string
  to?: string
  field_id?: string
  form_id?: string
  lifecycle_event?: string
  provider?: string
  trigger_slug?: string
  connected_account_id?: string
  trigger_config?: Record<string, unknown>
  webhook_endpoint_id?: string
  timezone?: string
  schedule?: FlowAutomationSchedule
}

export type PublishableAutomationLike = {
  name: string
  is_draft?: boolean
  trigger: AutomationTriggerLike
  actions: AutomationActionLike[]
}

const ITEMLESS_ALLOWED_ACTION_TYPES = new Set<string>([
  'create_task',
  'agent_suggest_tasks',
  'send_email',
  'send_slack_message',
  'send_channel_message',
  'create_artifact',
  'publish_artifact',
  'unpublish_artifact',
  'create_contact',
  'sync_social_research',
  'select_social_outliers',
  'enrich_social_research_items',
  'ingest_youtube_channel_to_agent_brain',
  'send_to_agent',
  'send_to_agents',
  'send_to_cursor',
  'meetings_precall_prep',
])

export function validateConcreteAction(action: AutomationActionLike): string | null {
  switch (action.type) {
    case 'choose_action':
      return 'Choose an action for every step'
    case 'create_task':
      if (!action.title_template?.trim()) return 'Add a title for each task creation action'
      return null
    case 'send_to_agent':
      if (!action.agent_key?.trim()) return 'Pick an agent for each agent action'
      if (!action.prompt_template?.trim()) return 'Add a prompt for each agent action'
      return null
    case 'send_to_agents': {
      if (!action.prompt_template?.trim()) return 'Add a shared prompt for the agent batch'
      const tasks = action.agent_tasks ?? []
      if (tasks.length < 2) return 'Add at least two agents for each multi-agent action'
      const hasIncompleteAgent = tasks.some((task) => !task.agent_key?.trim())
      if (hasIncompleteAgent) return 'Pick every agent in each multi-agent action'
      return null
    }
    case 'add_brain_context_to_task':
      return null
    case 'agent_suggest_tasks':
      if (!action.agent_key?.trim()) return 'Pick an agent for each suggest-tasks action'
      return null
    case 'assign_to':
      if ((action.assignees?.length ?? 0) === 0 && !action.assignee_id?.trim()) {
        return 'Pick at least one assignee for each assign action'
      }
      return null
    case 'change_status':
      if (!action.status?.trim()) return 'Pick a status for each status action'
      return null
    case 'change_priority':
      if (!action.priority?.trim()) return 'Pick a priority for each priority action'
      return null
    case 'add_comment':
      if (!action.message_template?.trim()) return 'Add message text for each comment action'
      return null
    case 'human_gate':
      if ((action.assignees?.length ?? 0) === 0 && !action.assignee_id?.trim()) {
        return 'Pick a reviewer for each human gate'
      }
      if (!action.message_template?.trim()) return 'Add a review message for each human gate'
      return null
    case 'flow_loop':
      if (typeof action.target_step_index !== 'number') {
        return 'Pick a loop target step for each loop action'
      }
      return null
    case 'flow_branch':
      if (!action.field_id?.trim()) return 'Pick a field for each branch step'
      if (
        action.operator !== 'is_empty' &&
        action.operator !== 'is_not_empty' &&
        !action.value?.trim()
      ) {
        return 'Add a comparison value for each branch step'
      }
      if (typeof action.then_step_index !== 'number') {
        return 'Pick a then-step for each branch step'
      }
      return null
    case 'send_email':
      if (!action.tool_slug?.trim()) return 'Pick an email send tool'
      if (!action.connected_account_id?.trim()) return 'Choose a connected email account'
      if (!action.to?.trim()) return 'Add an email recipient'
      if (action.subject_source === 'artifact') {
        return null
      }
      if (!action.subject_template?.trim()) return 'Add an email subject'
      if (!action.body_template?.trim()) return 'Add email body text'
      return null
    case 'send_slack_message':
      if (!action.channel_id?.trim()) return 'Add a Slack channel ID'
      if (!action.text_template?.trim()) return 'Add Slack message text'
      return null
    case 'send_channel_message':
      if (!action.channel_id?.trim()) return 'Add a ROAS channel ID'
      if (!action.content_template?.trim()) return 'Add channel message text'
      return null
    case 'create_contact':
      if (!action.email_template?.trim()) return 'Add contact email'
      return null
    case 'update_contact_field':
      if (!action.field_id?.trim()) return 'Choose a contact field'
      if (!action.value_template?.trim()) return 'Add a contact field value'
      return null
    case 'add_contact_tag':
    case 'remove_contact_tag':
      if (!action.tag?.trim()) return 'Add a contact tag'
      return null
    case 'attach_note_to_contact':
      if (!action.content_template?.trim()) return 'Add contact note text'
      return null
    case 'link_item_to_contact':
      if (!action.contact_id?.trim()) return 'Add a contact ID'
      return null
    case 'create_artifact':
      if (!action.artifact_kind?.trim()) return 'Choose an artifact type'
      if (!action.title_template?.trim()) return 'Add an artifact title'
      return null
    case 'publish_artifact':
    case 'unpublish_artifact':
    case 'attach_artifact_to_item':
      if (!action.artifact_kind?.trim()) return 'Choose an artifact type'
      if (!action.artifact_id?.trim()) return 'Add an artifact ID'
      return null
    case 'ask_agent_to_improve_artifact':
      if (!action.artifact_kind?.trim()) return 'Choose an artifact type'
      if (!action.artifact_id?.trim()) return 'Add an artifact ID'
      if (!action.agent_key?.trim()) return 'Pick an agent'
      if (!action.prompt_template?.trim()) return 'Add an artifact improvement prompt'
      return null
    case 'create_subtask':
      if (!action.title_template?.trim()) return 'Add a title for each subtask action'
      return null
    case 'sync_social_research':
      if (!action.platform) return 'Choose a platform for social research sync'
      if (!action.sync_mode) return 'Choose a sync mode for social research'
      return null
    case 'select_social_outliers':
      if ((action.min_outlier_score ?? 0) <= 0) return 'Outlier score must be greater than 0'
      if ((action.limit ?? 0) < 1 || (action.limit ?? 0) > 50)
        return 'Limit must be between 1 and 50'
      return null
    case 'enrich_social_research_items':
      if (!action.enrichments?.length) return 'Choose at least one enrichment'
      return null
    case 'ingest_youtube_channel_to_agent_brain':
      if (!action.agent_key?.trim() && !action.brain_id?.trim()) return 'Choose an agent'
      if (!action.channel_urls?.some((url) => url.trim())) return 'Add at least one channel URL'
      return null
    case 'meetings_precall_prep':
      return null
    default:
      return 'Complete all actions before enabling'
  }
}

/** Returns the first missing/invalid required trigger field, or null if the trigger is complete enough to publish. */
export function validateTrigger(trigger: AutomationTriggerLike): string | null {
  switch (trigger.type) {
    case 'choose_action':
      return 'Select your trigger'
    case 'status_change':
      if (!trigger.to?.trim()) return 'Choose a target status'
      return null
    case 'field_changed':
      if (!trigger.field_id?.trim()) return 'Choose a field'
      return null
    case 'priority_changed':
      if (!trigger.to?.trim()) return 'Choose a target priority'
      return null
    case 'form_submitted':
      if (!trigger.form_id?.trim()) return 'Choose a form'
      return null
    case 'artifact_lifecycle':
      if (!trigger.lifecycle_event?.trim()) return 'Choose a lifecycle event'
      return null
    case 'external_email_received':
      if (!trigger.provider) return 'Choose an email provider'
      if (!trigger.trigger_slug) return 'Choose an email trigger'
      if (!trigger.connected_account_id?.trim()) return 'Choose a connected email account'
      return null
    case 'external_slack_message_received':
      if (!trigger.trigger_slug) return 'Choose a Slack trigger'
      if (!trigger.connected_account_id?.trim()) return 'Choose a connected Slack account'
      return null
    case 'external_app_event':
      if (!trigger.provider) return 'Choose an app'
      if (!trigger.trigger_slug) return 'Choose an event'
      if (!connectedAppFlowProviderMatchesSlug(trigger.provider, trigger.trigger_slug)) {
        return 'Choose an event for the selected app'
      }
      for (const key of getConnectedAppFlowTriggerBySlug(trigger.trigger_slug)
        ?.requiredConfigKeys ?? []) {
        const value = trigger.trigger_config?.[key]
        if (typeof value !== 'string' || value.trim() === '') {
          return `Add ${key.replace(/_/g, ' ')}`
        }
      }
      if (!trigger.connected_account_id?.trim()) return 'Choose a connected account'
      return null
    case 'webhook_received':
      if (!trigger.webhook_endpoint_id?.trim()) return 'Choose a webhook endpoint'
      return null
    case 'schedule': {
      if (!trigger.timezone?.trim()) return 'Choose a timezone'
      if (!trigger.schedule) return 'Pick a schedule'
      try {
        const cron = scheduleToCron(trigger.schedule)
        parser.parseExpression(cron, { tz: trigger.timezone })
      } catch (err) {
        return err instanceof Error ? err.message : 'Schedule is invalid'
      }
      return null
    }
    default:
      return null
  }
}

/** Blank builder state — trigger and/or actions still use choose_action placeholders. */
export function isFlowDraftPlaceholder(
  trigger: AutomationTriggerLike,
  actions: readonly AutomationActionLike[],
): boolean {
  if (trigger.type === 'choose_action') return true
  if (actions.length === 0) return true
  return actions.every((action) => action.type === 'choose_action')
}

/** Same rules as publishing: name, trigger, and concrete actions must be valid (no placeholders). */
export function checkRuleFieldsComplete(
  name: string,
  trigger: AutomationTriggerLike,
  actions: readonly AutomationActionLike[],
): { ok: true } | { ok: false; message: string } {
  if (!name.trim()) return { ok: false, message: 'Add a name before enabling' }

  if (trigger.type === 'choose_action') {
    return { ok: false, message: 'Select your trigger before enabling' }
  }

  if (actions.some((action) => action.type === 'choose_action')) {
    return { ok: false, message: 'Choose an action for every step before enabling' }
  }

  const concrete = actions.filter((action) => action.type !== 'choose_action')
  if (concrete.length < 1) {
    return { ok: false, message: 'Add at least one action before enabling' }
  }

  const triggerErr = validateTrigger(trigger)
  if (triggerErr) return { ok: false, message: `${triggerErr} for When` }

  for (const action of concrete) {
    const err = validateConcreteAction(action)
    if (err) return { ok: false, message: err }
  }

  if (trigger.type === 'schedule' || trigger.type === 'webhook_received') {
    for (const action of concrete) {
      if (!ITEMLESS_ALLOWED_ACTION_TYPES.has(action.type)) {
        return {
          ok: false,
          message: `Action "${action.type}" needs a source task`,
        }
      }
    }
  }

  const contextIssue = findFirstContextIssue(trigger, concrete)
  if (contextIssue) {
    return {
      ok: false,
      message: `Step ${contextIssue.index + 1} needs ${contextIssue.missing.join(', ')} context first`,
    }
  }

  return { ok: true }
}

/** Whether the automation may be turned on (published + fields complete). */
export function canEnableAutomation(
  automation: PublishableAutomationLike,
): { ok: true } | { ok: false; message: string } {
  if (automation.is_draft) {
    return { ok: false, message: 'Publish this draft before you can turn it on' }
  }
  return checkRuleFieldsComplete(automation.name, automation.trigger, automation.actions)
}
