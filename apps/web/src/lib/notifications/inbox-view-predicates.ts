import type { InboxView, UserNotification } from './types'

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
  return notification.inbox_bucket
}

export function notificationMatchesInboxView(
  notification: UserNotification,
  view: InboxView,
  now: Date = new Date(),
): boolean {
  return view === 'all' || notificationInboxView(notification, now) === view
}
