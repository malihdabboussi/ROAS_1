import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import type { InboxTriageCounts, InboxView, UserNotification } from './types'

export async function fetchNotifications(opts?: {
  limit?: number
  unreadOnly?: boolean
  view?: InboxView
  types?: string[]
}): Promise<UserNotification[]> {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.unreadOnly) params.set('unread_only', 'true')
  if (opts?.view) params.set('view', opts.view)
  if (opts?.types?.length) params.set('types', opts.types.join(','))
  return backendGet<UserNotification[]>(`/api/missions/notifications?${params.toString()}`)
}

export async function fetchInboxTriageCounts(): Promise<InboxTriageCounts> {
  return backendGet('/api/missions/notifications/counts')
}

export async function moveNotificationBucket(
  notificationId: string,
  bucket: 'primary' | 'other',
): Promise<{ ok: boolean }> {
  return backendPost(`/api/missions/notifications/${notificationId}/bucket`, { bucket })
}

export async function snoozeNotification(
  notificationId: string,
  until: string,
): Promise<{ ok: boolean }> {
  return backendPost(`/api/missions/notifications/${notificationId}/snooze`, { until })
}

export async function unsnoozeNotification(notificationId: string): Promise<{ ok: boolean }> {
  return backendPost(`/api/missions/notifications/${notificationId}/unsnooze`, {})
}

export async function clearNotification(notificationId: string): Promise<{ ok: boolean }> {
  return backendPost(`/api/missions/notifications/${notificationId}/clear`, {})
}

export async function unclearNotification(notificationId: string): Promise<{ ok: boolean }> {
  return backendPost(`/api/missions/notifications/${notificationId}/unclear`, {})
}

export async function markNotificationUnread(notificationId: string): Promise<{ ok: boolean }> {
  return backendPost(`/api/missions/notifications/${notificationId}/unread`, {})
}

export async function clearNotificationView(
  view: Exclude<InboxView, 'all'>,
): Promise<{ ok: boolean }> {
  return backendPost('/api/missions/notifications/clear-all', { view })
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const response = await backendGet<{ count: number }>('/api/missions/notifications/unread-count')
  return response.count
}

export async function markNotificationsReadAll(): Promise<{ ok: boolean }> {
  return backendPost<{ ok: boolean }>('/api/missions/notifications/read-all', {})
}

export async function markNotificationRead(notificationId: string): Promise<{ ok: boolean }> {
  return backendPatch<{ ok: boolean }>(`/api/missions/notifications/${notificationId}/read`, {})
}

export async function deleteNotification(notificationId: string): Promise<{ ok: boolean }> {
  return backendDelete<{ ok: boolean }>(`/api/missions/notifications/${notificationId}`)
}

export async function deleteReadNotifications(): Promise<{ deleted: number }> {
  return backendDelete<{ deleted: number }>('/api/missions/notifications/read')
}
