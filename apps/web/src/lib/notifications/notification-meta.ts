export const NOTIFICATION_LABELS: Record<string, string> = {
  mission_blocked: 'Blocked',
  mission_completed: 'Completed',
  mission_failed: 'Failed',
  deliverable_ready: 'Deliverable',
  subtask_blocked: 'Subtask Blocked',
  plan_approval_required: 'Plan Approval',
  agent_message: 'Agent Message',
  human_dm_message: 'Direct Message',
  org_invitation: 'Org Invite',
  brain_cross_suggestion: 'Brain Suggestion',
  brain_import_succeeded: 'Brain Complete',
  brain_import_failed: 'Brain Failed',
  awareness_paused: 'Credits',
  space_task_comment: 'Task Comment',
  space_task_mention: 'Task Mention',
  space_task_assigned: 'Task Assigned',
  space_task_unassigned: 'Task Unassigned',
  space_task_status_changed: 'Task Status',
  space_automation_disabled: 'Flow Disabled',
  human_subtask_awaiting: 'Subtask Awaiting',
  human_subtask_sla_escalated: 'Subtask Escalated',
  human_subtask_cancelled: 'Subtask Cancelled',
}

export const NOTIFICATION_DOT_CLASS: Record<string, string> = {
  mission_blocked: 'indicator-dot-glass-orange',
  mission_completed: 'indicator-dot-glass-green',
  mission_failed: 'indicator-dot-glass-red',
  deliverable_ready: 'indicator-dot-glass-blue',
  subtask_blocked: 'indicator-dot-glass-orange',
  plan_approval_required: 'indicator-dot-glass-blue',
  agent_message: 'indicator-dot-glass-green',
  human_dm_message: 'indicator-dot-glass-green',
  org_invitation: 'indicator-dot-glass-green',
  brain_cross_suggestion: 'indicator-dot-glass-blue',
  brain_import_succeeded: 'indicator-dot-glass-green',
  brain_import_failed: 'indicator-dot-glass-red',
  awareness_paused: 'indicator-dot-glass-red',
  space_task_comment: 'indicator-dot-glass-blue',
  space_task_mention: 'indicator-dot-glass-blue',
  space_task_assigned: 'indicator-dot-glass-green',
  space_task_unassigned: 'indicator-dot-glass-orange',
  space_task_status_changed: 'indicator-dot-glass-blue',
  space_automation_disabled: 'indicator-dot-glass-orange',
  human_subtask_awaiting: 'indicator-dot-glass-orange',
  human_subtask_sla_escalated: 'indicator-dot-glass-red',
  human_subtask_cancelled: 'indicator-dot-glass-muted',
}

type NotificationRetryMetadata = {
  metadata?: {
    retry_action?: unknown
    brain_import_job_id?: unknown
  } | null
}

function formatUnknownNotificationType(type: string): string {
  return type
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_LABELS[type] ?? formatUnknownNotificationType(String(type))
}

export function notificationDotClass(type: string): string {
  return NOTIFICATION_DOT_CLASS[type] ?? 'indicator-dot-glass-muted'
}

/** Keep hard line breaks within paragraphs; preserve blank-line paragraph splits. */
export function notificationMarkdownSource(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .split(/\n\n+/)
    .map((block) => block.replace(/\n/g, '  \n'))
    .join('\n\n')
}

export function notificationRetryJobId(notification: NotificationRetryMetadata): string | null {
  const metadata = notification.metadata
  if (!metadata || metadata.retry_action !== 'brain_import_job_retry') return null
  const jobId = metadata.brain_import_job_id
  return typeof jobId === 'string' && jobId.trim() ? jobId : null
}
