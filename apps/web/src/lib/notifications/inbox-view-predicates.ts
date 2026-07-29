import type { InboxView, NotificationType, UserNotification } from './types'

export const SYSTEM_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'mission_completed',
  'deliverable_ready',
  'space_task_unassigned',
  'space_task_status_changed',
  'human_subtask_cancelled',
  'brain_import_succeeded',
  'brain_import_failed',
  'awareness_paused',
  'space_automation_disabled',
  'browser_session_expiring',
]

const SYSTEM_NOTIFICATION_TYPE_SET = new Set<NotificationType>(SYSTEM_NOTIFICATION_TYPES)

export function isSystemNotification(notification: UserNotification): boolean {
  return SYSTEM_NOTIFICATION_TYPE_SET.has(notification.type)
}

export function notificationInboxView(
  notification: UserNotification,
  now: Date = new Date(),
): Exclude<InboxView, 'all'> {
  if (notification.cleared_at) return 'cleared'
  if (
    notification.snoozed_until &&
    new Date(notification.snoozed_until).getTime() > now.getTime()
  ) {
    return 'later'
  }
  if (isSystemNotification(notification)) return 'system'
  return notification.inbox_bucket
}

export function notificationMatchesInboxView(
  notification: UserNotification,
  view: InboxView,
  now: Date = new Date(),
): boolean {
  return view === 'all' || notificationInboxView(notification, now) === view
}
