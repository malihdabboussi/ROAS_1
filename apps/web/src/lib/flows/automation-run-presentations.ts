import type { AutomationRun } from './automation-runs-api'

export function runStatusPresentation(
  status: AutomationRun['status'] | 'success' | 'partial' | 'failed',
): {
  label: string
  textClassName: string
} {
  switch (status) {
    case 'success':
      return { label: 'Success', textClassName: 'text-success' }
    case 'failed':
      return { label: 'Failed', textClassName: 'text-destructive' }
    case 'partial':
      return { label: 'Partial', textClassName: 'text-warning' }
  }
}

export function describeAutomationTriggerEvent(event: Record<string, unknown>): string {
  const type = event.type as string
  switch (type) {
    case 'status_change':
      return `Status: ${event.from ?? '?'} \u2192 ${event.to ?? '?'}`
    case 'task_created':
      return 'Task created'
    case 'mission_completed':
      return 'Agent completed'
    case 'mission_failed':
      return 'Agent failed'
    case 'field_changed':
      return `${event.field_id} changed`
    default:
      return type.replace(/_/g, ' ')
  }
}
