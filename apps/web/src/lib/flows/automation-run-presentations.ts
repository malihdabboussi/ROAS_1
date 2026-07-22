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

export function describeAutomationRunOutcome(
  actions: Record<string, unknown>[],
): { label: string; detail: string } | null {
  const observation = actions.find((action) => action.type === 'observe_slack_team')
  if (!observation) return null
  const result =
    observation.result && typeof observation.result === 'object'
      ? (observation.result as Record<string, unknown>)
      : {}
  if (result.skipped === true) {
    const reason = String(result.skipped_reason ?? 'skipped').replaceAll('_', ' ')
    return {
      label: 'Skipped',
      detail: reason.charAt(0).toUpperCase() + reason.slice(1),
    }
  }
  const messages = Number(result.messages_observed ?? 0)
  const signals = Number(result.signals_detected ?? 0)
  const proposed = Number(result.proposed ?? 0)
  const tokens = Number(result.model_total_tokens ?? 0)
  const cost = Number(result.provider_cost_usd ?? 0)
  const label = proposed > 0 ? `Proposed ${proposed}` : messages > 0 ? 'Analyzed' : 'No activity'
  const detail = [
    `${messages} messages`,
    `${signals} signals`,
    tokens > 0 ? `${tokens.toLocaleString()} tokens` : null,
    cost > 0 ? `$${cost.toFixed(4)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return { label, detail }
}
