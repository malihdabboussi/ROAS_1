import type { AutomationAction } from '@/features/spaces/types/space-schema'

export function emailProviderLabel(toolSlug?: string): string {
  if (toolSlug?.startsWith('OUTLOOK')) return 'Outlook'
  if (toolSlug?.startsWith('GMAIL')) return 'Gmail'
  return 'Email'
}

export function postCallMapSummary(
  action: Extract<AutomationAction, { type: 'request_slack_follow_up_confirm' }>,
  index: number,
): { title: string; detail: string } {
  return {
    title: `Step ${index + 1}: Post-call follow-up`,
    detail: `${action.delivery_mode ?? 'shadow'} · ${action.dm_email || 'admin review'}`,
  }
}
