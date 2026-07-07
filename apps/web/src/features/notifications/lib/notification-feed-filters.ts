import type { UnifiedFeedItem } from '../hooks/use-notifications-feed'
import { notificationTypeLabel } from './notification-meta'

export type NotificationFeedStatusFilter = 'all' | 'unread' | 'read'

export type NotificationFeedTypeFilter = 'all' | 'awareness' | string

export type NotificationFeedFilters = {
  status: NotificationFeedStatusFilter
  type: NotificationFeedTypeFilter
}

export const DEFAULT_NOTIFICATION_FEED_FILTERS: NotificationFeedFilters = {
  status: 'all',
  type: 'all',
}

export function notificationFeedTypeLabel(type: NotificationFeedTypeFilter): string {
  if (type === 'all') return 'All types'
  if (type === 'awareness') return 'Awareness'
  return notificationTypeLabel(type)
}

export function notificationFeedFilterSummary(filters: NotificationFeedFilters): string {
  const parts: string[] = []
  if (filters.status === 'unread') parts.push('Unread')
  else if (filters.status === 'read') parts.push('Read')
  if (filters.type !== 'all') parts.push(notificationFeedTypeLabel(filters.type))
  return parts.length > 0 ? parts.join(' · ') : 'All'
}

export function filterNotificationFeedItems(
  items: UnifiedFeedItem[],
  filters: NotificationFeedFilters,
): UnifiedFeedItem[] {
  return items.filter((item) => {
    if (filters.status === 'unread' && item.data.read_at !== null) return false
    if (filters.status === 'read' && item.data.read_at === null) return false
    if (filters.type === 'all') return true
    if (filters.type === 'awareness') return item.kind === 'awareness'
    return item.kind === 'notification' && item.data.type === filters.type
  })
}

export function listNotificationFeedTypeOptions(
  items: UnifiedFeedItem[],
): { id: NotificationFeedTypeFilter; label: string }[] {
  const typeIds = new Set<string>()
  for (const item of items) {
    if (item.kind === 'awareness') typeIds.add('awareness')
    else typeIds.add(item.data.type)
  }
  return Array.from(typeIds)
    .sort((a, b) => notificationFeedTypeLabel(a).localeCompare(notificationFeedTypeLabel(b)))
    .map((id) => ({
      id,
      label: notificationFeedTypeLabel(id),
    }))
}
