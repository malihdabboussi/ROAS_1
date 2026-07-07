import type {
  FlowAutomationStatusSummary,
  FlowAutomationTriggerSummary,
} from '../types/flow-automation.types'

export type FlowStatusKey = 'draft' | 'published' | 'paused'

const TRIGGER_LABELS: Record<string, string> = {
  status_change: 'Status change',
  task_created: 'Task created',
  mission_completed: 'Agent completes',
  mission_failed: 'Agent fails',
  field_changed: 'Field changed',
  priority_changed: 'Priority changed',
  assignee_changed: 'Assignee changed',
  due_date_changed: 'Due date changed',
  start_date_changed: 'Start date changed',
  tag_added: 'Tag added',
  tag_removed: 'Tag removed',
  form_submitted: 'Form submitted',
  contact_created: 'Contact created',
  contact_updated: 'Contact updated',
  contact_tag_added: 'Contact tag added',
  schedule: 'On a schedule',
  webhook_received: 'Webhook received',
  choose_action: 'Select trigger',
}

function triggerTypeLabel(type: string): string {
  return TRIGGER_LABELS[type] ?? type.replace(/_/g, ' ')
}

export function countDisplayFlowActions(actions: ReadonlyArray<{ type?: string }>): number {
  return actions.filter((action) => action.type && action.type !== 'choose_action').length
}

export function describeFlowTrigger(trigger: FlowAutomationTriggerSummary): string {
  switch (trigger.type) {
    case 'status_change':
      return `When status → ${trigger.to || '…'}${trigger.from ? ` (from ${trigger.from})` : ''}`
    case 'task_created':
      return trigger.in_status ? `When task created in ${trigger.in_status}` : 'When task created'
    case 'mission_completed':
      return 'When agent completes'
    case 'mission_failed':
      return 'When agent fails'
    case 'field_changed':
      return `When ${trigger.field_id || '…'} changes${trigger.to ? ` to ${trigger.to}` : ''}`
    case 'priority_changed':
      return trigger.to
        ? `When priority → ${trigger.to}${trigger.from ? ` (from ${trigger.from})` : ''}`
        : 'When priority changes'
    case 'assignee_changed':
      if (trigger.assignee_type === 'unassigned') return 'When assignee becomes unassigned'
      if (trigger.assignee_type === 'agent') return 'When assigned to agent'
      if (trigger.assignee_type === 'human') return 'When assigned to person'
      return 'When assignee changes'
    case 'due_date_changed':
      return trigger.to ? `When due date → ${trigger.to}` : 'When due date changes'
    case 'start_date_changed':
      return trigger.to ? `When start date → ${trigger.to}` : 'When start date changes'
    case 'tag_added':
      return trigger.tag ? `When tag added: ${trigger.tag}` : 'When tag added'
    case 'tag_removed':
      return trigger.tag ? `When tag removed: ${trigger.tag}` : 'When tag removed'
    case 'form_submitted':
      return 'When form is submitted'
    case 'contact_created':
      return 'When contact is created'
    case 'contact_updated':
      return trigger.field_id
        ? `When contact field ${trigger.field_id} updates`
        : 'When contact is updated'
    case 'contact_tag_added':
      return trigger.tag ? `When contact tag added: ${trigger.tag}` : 'When contact tag added'
    case 'schedule':
      return 'On a schedule'
    case 'webhook_received':
      return 'When webhook is received'
    case 'choose_action':
      return 'Select your trigger'
    default:
      return triggerTypeLabel(trigger.type)
  }
}

export function flowStatusKey(flow: FlowAutomationStatusSummary): FlowStatusKey {
  if (flow.is_draft) return 'draft'
  if (flow.enabled) return 'published'
  return 'paused'
}

export function flowStatusLabel(flow: FlowAutomationStatusSummary): string {
  if (flow.is_draft) return 'Draft'
  return flow.enabled ? 'Published' : 'Paused'
}
