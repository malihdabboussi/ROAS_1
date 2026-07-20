import type { TeamRosterEntry } from '@/features/org/services/org.service'
import type {
  AutomationAction,
  AutomationTrigger,
  FieldDef,
} from '@/features/spaces/types/space-schema'
import {
  getConnectedAppFlowProviderLabel,
  getConnectedAppFlowTriggerBySlug,
} from '@/lib/flows/connected-app-flow-triggers'
import { flowBuilderActionIndexToStepNumber } from '@/lib/flows/flow-builder-step-index.utils'

function statusLabel(fields: FieldDef[], id: string): string {
  if (!id) return '…'
  const opt = fields.find((f) => f.id === 'status')?.options?.find((o) => o.id === id)
  return opt?.label ?? id
}

function fieldName(fields: FieldDef[], id: string): string {
  if (!id) return '…'
  return fields.find((f) => f.id === id)?.name ?? id
}

function priorityLabel(fields: FieldDef[], id: string): string {
  if (!id) return 'Any priority'
  const opt = fields.find((f) => f.id === 'priority')?.options?.find((o) => o.id === id)
  return opt?.label ?? id
}

function emailProviderLabel(toolSlug?: string): string {
  if (toolSlug?.startsWith('OUTLOOK')) return 'Outlook'
  if (toolSlug?.startsWith('GMAIL')) return 'Gmail'
  return 'Email'
}

function assigneeLabel(roster: TeamRosterEntry[], type: 'human' | 'agent', id: string): string {
  if (!id) return '…'
  if (type === 'agent') {
    if (id === 'ads_manager') return 'Blaze'
    return roster.find((r) => r.kind === 'agent' && r.agent_key === id)?.display_name ?? id
  }
  return roster.find((r) => r.kind === 'human' && r.user_id === id)?.display_name ?? id
}

function humanGateAssigneeLabel(
  action: Extract<AutomationAction, { type: 'human_gate' }>,
  roster: TeamRosterEntry[],
): string {
  const assignees = action.assignees?.length
    ? action.assignees
    : action.assignee_type && action.assignee_id
      ? [{ type: action.assignee_type, id: action.assignee_id }]
      : []
  if (assignees.length === 0) return '…'
  return assignees.map((assignee) => assigneeLabel(roster, assignee.type, assignee.id)).join(', ')
}

function scopePrefix(scope?: 'tasks' | 'subtasks' | 'all'): string {
  if (scope === 'subtasks') return 'Subtask · '
  if (scope === 'all') return 'Any task · '
  return 'Task · '
}

export function summarizeAutomationTrigger(
  trigger: AutomationTrigger,
  fields: FieldDef[],
  roster: TeamRosterEntry[],
): { title: string; detail: string } {
  void roster
  switch (trigger.type) {
    case 'status_change': {
      const from = trigger.from ? statusLabel(fields, trigger.from) : 'Any status'
      const to = statusLabel(fields, trigger.to)
      return {
        title: `${scopePrefix(trigger.task_scope)}Status changes`,
        detail: `${from} → ${to}`,
      }
    }
    case 'task_created': {
      const st = trigger.in_status ? statusLabel(fields, trigger.in_status) : null
      return {
        title: `${scopePrefix(trigger.task_scope)}Task created`,
        detail: st ? `Initial status: ${st}` : 'Any initial status',
      }
    }
    case 'mission_completed':
      return {
        title: `${scopePrefix(trigger.task_scope)}Agent completes`,
        detail: 'Linked mission succeeds',
      }
    case 'mission_failed':
      return {
        title: `${scopePrefix(trigger.task_scope)}Agent fails`,
        detail: 'Linked mission errors',
      }
    case 'field_changed': {
      const fn = fieldName(fields, trigger.field_id)
      const f = fields.find((fl) => fl.id === trigger.field_id)
      const toLabel =
        trigger.to && f?.options?.length
          ? (f.options.find((o) => o.id === trigger.to)?.label ?? trigger.to)
          : trigger.to
      const tv = toLabel ? ` → ${toLabel}` : ''
      return {
        title: `${scopePrefix(trigger.task_scope)}Field changes`,
        detail: `${fn}${tv}`,
      }
    }
    case 'priority_changed': {
      const from = trigger.from ? priorityLabel(fields, trigger.from) : 'Any priority'
      const to = trigger.to ? priorityLabel(fields, trigger.to) : 'Any priority'
      return {
        title: `${scopePrefix(trigger.task_scope)}Priority changes`,
        detail: `${from} → ${to}`,
      }
    }
    case 'assignee_changed': {
      const title = `${scopePrefix(trigger.task_scope)}Assignee changes`
      if (trigger.assignee_type === 'unassigned') {
        return { title, detail: 'Becomes unassigned' }
      }
      if (trigger.assignee_type === 'human' || trigger.assignee_type === 'agent') {
        const assignee = trigger.assignee_id
          ? assigneeLabel(roster, trigger.assignee_type, trigger.assignee_id)
          : trigger.assignee_type === 'agent'
            ? 'Any agent'
            : 'Any person'
        return { title, detail: assignee }
      }
      return { title, detail: 'Any assignee' }
    }
    case 'due_date_changed':
      return {
        title: `${scopePrefix(trigger.task_scope)}Due date changes`,
        detail: `${trigger.from || 'Any'} → ${trigger.to || 'Any'}`,
      }
    case 'start_date_changed':
      return {
        title: `${scopePrefix(trigger.task_scope)}Start date changes`,
        detail: `${trigger.from || 'Any'} → ${trigger.to || 'Any'}`,
      }
    case 'tag_added': {
      const tagsField = fields.find((f) => f.id === 'tags')
      const tagLabel = trigger.tag
        ? (tagsField?.options?.find((o) => o.id === trigger.tag)?.label ?? trigger.tag)
        : 'Any tag'
      return {
        title: `${scopePrefix(trigger.task_scope)}Tag added`,
        detail: tagLabel,
      }
    }
    case 'tag_removed': {
      const tagsField = fields.find((f) => f.id === 'tags')
      const tagLabel = trigger.tag
        ? (tagsField?.options?.find((o) => o.id === trigger.tag)?.label ?? trigger.tag)
        : 'Any tag'
      return {
        title: `${scopePrefix(trigger.task_scope)}Tag removed`,
        detail: tagLabel,
      }
    }
    case 'form_submitted':
      return { title: 'Form submitted', detail: trigger.form_id || '…' }
    case 'contact_created':
      return { title: 'Contact created', detail: 'Any contact' }
    case 'contact_updated':
      return { title: 'Contact updated', detail: trigger.field_id || 'Any field' }
    case 'contact_tag_added':
      return { title: 'Contact tag added', detail: trigger.tag || 'Any tag' }
    case 'contact_tag_removed':
      return { title: 'Contact tag removed', detail: trigger.tag || 'Any tag' }
    case 'contact_type_changed':
      return { title: 'Contact type changed', detail: trigger.to || 'Any type' }
    case 'contact_source_changed':
      return { title: 'Contact source changed', detail: trigger.to || 'Any source' }
    case 'artifact_lifecycle':
      return {
        title: 'Artifact lifecycle',
        detail: [trigger.artifact_kind || 'Any artifact', trigger.lifecycle_event || '…']
          .filter(Boolean)
          .join(' · '),
      }
    case 'external_email_received': {
      const provider = trigger.provider === 'outlook' ? 'Outlook' : 'Gmail'
      const filters = [
        trigger.from_contains ? `from contains "${trigger.from_contains}"` : null,
        trigger.subject_contains ? `subject contains "${trigger.subject_contains}"` : null,
      ].filter(Boolean)
      return {
        title: `${provider} email received`,
        detail: filters.length ? filters.join(' · ') : 'Any inbound email',
      }
    }
    case 'external_slack_message_received': {
      const filters = [
        trigger.channel_id ? `channel ${trigger.channel_id}` : null,
        trigger.text_contains ? `text contains "${trigger.text_contains}"` : null,
      ].filter(Boolean)
      return {
        title: 'Slack message received',
        detail: filters.length ? filters.join(' · ') : 'Any Slack message',
      }
    }
    case 'external_fathom_recording_ready': {
      const filters = [
        trigger.title_contains ? `title contains "${trigger.title_contains}"` : null,
        trigger.recorded_by_contains
          ? `recorded by contains "${trigger.recorded_by_contains}"`
          : null,
      ].filter(Boolean)
      return {
        title: 'Fathom recording ready',
        detail: filters.length ? filters.join(' · ') : 'Any completed recording',
      }
    }
    case 'external_app_event': {
      const meta = trigger.trigger_slug
        ? getConnectedAppFlowTriggerBySlug(trigger.trigger_slug)
        : null
      const providerLabel =
        meta?.providerLabel ??
        (trigger.provider ? getConnectedAppFlowProviderLabel(trigger.provider) : 'Connected app')
      const eventLabel = meta?.eventLabel ?? trigger.trigger_slug ?? '…'
      return {
        title: `${providerLabel} event`,
        detail: eventLabel,
      }
    }
    case 'webhook_received':
      return {
        title: 'Webhook received',
        detail: trigger.webhook_endpoint_id
          ? `Endpoint ${trigger.webhook_endpoint_id}`
          : 'Select a webhook endpoint',
      }
    case 'choose_action':
      return { title: 'Select your trigger', detail: 'Choose a trigger' }
    default:
      return { title: 'When', detail: '—' }
  }
}

export function summarizeAutomationAction(
  action: AutomationAction,
  fields: FieldDef[],
  roster: TeamRosterEntry[],
): { title: string; detail: string } {
  switch (action.type) {
    case 'create_task':
      return {
        title: 'Create task',
        detail: action.title_template?.trim() || 'Task from trigger',
      }
    case 'send_to_agent': {
      const name = assigneeLabel(roster, 'agent', action.agent_key)
      return {
        title: 'Run agent',
        detail: action.extended_brain_knowledge ? `${name} · extended brain knowledge` : name,
      }
    }
    case 'send_to_agents': {
      const agentNames = action.agent_tasks
        .map((task) => assigneeLabel(roster, 'agent', task.agent_key))
        .filter(Boolean)
      return {
        title: 'Run agents',
        detail: [
          agentNames.length > 0 ? agentNames.join(', ') : 'Select agents',
          action.agent_collaboration === 'disabled' ? 'no agent collaboration' : null,
          action.extended_brain_knowledge ? 'extended brain knowledge' : null,
        ]
          .filter(Boolean)
          .join(' · '),
      }
    }
    case 'add_brain_context_to_task':
      return {
        title: 'Add brain context',
        detail: 'Atlas appends relevant brain knowledge',
      }
    case 'agent_suggest_tasks': {
      const name = assigneeLabel(roster, 'agent', action.agent_key ?? 'vibey')
      return {
        title: 'Suggest tasks',
        detail: `${name} · up to ${action.max_suggestions ?? 10}${
          action.extended_brain_knowledge ? ' · extended brain knowledge' : ''
        }`,
      }
    }
    case 'assign_to': {
      const assignees = action.assignees?.length
        ? action.assignees
        : action.assignee_type && action.assignee_id
          ? [{ type: action.assignee_type, id: action.assignee_id }]
          : []
      const names = assignees.map((assignee) => assigneeLabel(roster, assignee.type, assignee.id))
      return {
        title: 'Assign',
        detail: names.length > 0 ? names.join(', ') : 'Select assignees',
      }
    }
    case 'change_status':
      return {
        title: 'Change status',
        detail: `Set status to ${statusLabel(fields, action.status)}`,
      }
    case 'change_priority':
      return {
        title: 'Change priority',
        detail: action.priority ? priorityLabel(fields, action.priority) : '…',
      }
    case 'add_comment': {
      const message = action.message_template?.trim()
      return {
        title: 'Add comment',
        detail: message ? `Adds comment: "${message}"` : 'Empty comment message',
      }
    }
    case 'human_gate':
      return {
        title: 'Human gate',
        detail: [
          `Review · assigned to ${humanGateAssigneeLabel(action, roster)}`,
          action.waiting_status
            ? `wait ${statusLabel(fields, action.waiting_status)}`
            : 'wait in review',
          action.resume_on_status
            ? `approve ${statusLabel(fields, action.resume_on_status)}`
            : 'approve done',
          action.reject_on_status
            ? `reject ${statusLabel(fields, action.reject_on_status)}`
            : 'reject needs revision',
        ].join(' · '),
      }
    case 'flow_loop':
      return {
        title: 'Loop',
        detail: [
          `Back to step ${flowBuilderActionIndexToStepNumber(action.target_step_index ?? 0)}`,
          action.when === 'always' ? 'always' : 'on reject',
          `max ${action.max_iterations ?? 3}`,
        ].join(' · '),
      }
    case 'flow_branch': {
      const operatorLabel = (action.operator ?? 'equals').replace(/_/g, ' ')
      const fieldLabel = fieldName(fields, action.field_id?.trim() || '')
      const valueLabel = action.value?.trim()
      const conditionLabel =
        action.operator === 'is_empty' || action.operator === 'is_not_empty'
          ? `${fieldLabel} ${operatorLabel}`
          : `${fieldLabel} ${operatorLabel} ${valueLabel || '…'}`
      const thenStep = flowBuilderActionIndexToStepNumber(action.then_step_index ?? 0)
      const elseStep =
        typeof action.else_step_index === 'number'
          ? flowBuilderActionIndexToStepNumber(action.else_step_index)
          : null
      return {
        title: 'Branch',
        detail: elseStep
          ? `If ${conditionLabel} → step ${thenStep} · else → step ${elseStep}`
          : `If ${conditionLabel} → step ${thenStep}`,
      }
    }
    case 'send_email':
      return {
        title: 'Send email',
        detail: [
          emailProviderLabel(action.tool_slug),
          action.subject_source === 'artifact' ? 'From email artifact' : 'Manual content',
          action.to || '…',
        ].join(' · '),
      }
    case 'send_slack_message':
      return { title: 'Send Slack message', detail: action.channel_id || '…' }
    case 'request_slack_follow_up_confirm':
      return {
        title: 'DM follow-ups for Slack confirm',
        detail: action.dm_email || 'admin DM',
      }
    case 'send_channel_message':
      return { title: 'Send channel message', detail: action.channel_id || '…' }
    case 'choose_action':
      return { title: 'Choose action', detail: 'Choose an action…' }
    default:
      return { title: 'Action', detail: action.type.replace(/_/g, ' ') }
  }
}

export function getFlowBuilderStepLabel(input: {
  selection: { kind: 'trigger' } | { kind: 'action'; index: number }
  trigger: AutomationTrigger
  actions: AutomationAction[]
  fields: FieldDef[]
  roster: TeamRosterEntry[]
  planTriggerTitle?: string
}): string {
  if (input.selection.kind === 'trigger') {
    if (input.planTriggerTitle) return input.planTriggerTitle
    if (input.trigger.type === 'choose_action') return 'Select your trigger'
    return summarizeAutomationTrigger(input.trigger, input.fields, input.roster).title
  }

  const action = input.actions[input.selection.index]
  if (!action || action.type === 'choose_action') return 'Choose action'
  return summarizeAutomationAction(action, input.fields, input.roster).title
}

export function getFlowBuilderStepSummary(input: {
  selection: { kind: 'trigger' } | { kind: 'action'; index: number }
  trigger: AutomationTrigger
  actions: AutomationAction[]
  fields: FieldDef[]
  roster: TeamRosterEntry[]
  fallback?: string
}): string {
  if (input.selection.kind === 'trigger') {
    if (input.trigger.type === 'choose_action') {
      return input.fallback ?? 'Select your trigger'
    }
    if (input.trigger.type === 'status_change') {
      const from = input.trigger.from ? statusLabel(input.fields, input.trigger.from) : 'any status'
      const to = statusLabel(input.fields, input.trigger.to)
      return `Changes status from ${from} to ${to}`
    }
    if (input.trigger.type === 'webhook_received') {
      return input.trigger.webhook_endpoint_id
        ? `When webhook endpoint receives a request`
        : 'Select a webhook endpoint to listen for requests'
    }
    const summary = summarizeAutomationTrigger(input.trigger, input.fields, input.roster)
    if (summary.detail && summary.detail !== '—') {
      return summary.detail
    }
    return input.fallback ?? summary.detail
  }

  const action = input.actions[input.selection.index]
  if (!action) return input.fallback ?? '—'
  const summary = summarizeAutomationAction(action, input.fields, input.roster)
  if (summary.detail && summary.detail !== '—') {
    return summary.detail
  }
  return input.fallback ?? summary.detail
}
