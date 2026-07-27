import type { UserNotification } from './types'

export type NotificationOpenTarget =
  | { type: 'mission'; missionId: string; orgId: string | null }
  | { type: 'space_task'; spaceId: string; itemId: string }
  | {
      type: 'mission_subtask'
      missionId: string
      subtaskId: string
      title: string
      orgId: string | null
    }
  | { type: 'external_url'; url: string }

const MISSION_DETAIL_TYPES = new Set<UserNotification['type']>([
  'mission_blocked',
  'mission_completed',
  'mission_failed',
  'deliverable_ready',
  'subtask_blocked',
  'plan_approval_required',
  'human_subtask_awaiting',
  'human_subtask_sla_escalated',
  'human_subtask_cancelled',
  'agent_message',
])

function actionUrlParts(actionUrl: string): {
  pathname: string
  params: URLSearchParams
} {
  const parsed = new URL(actionUrl, 'https://app.vibey.test')
  return { pathname: parsed.pathname, params: parsed.searchParams }
}

export function resolveNotificationOpenTarget(
  notification: UserNotification,
): NotificationOpenTarget | null {
  if (notification.type === 'brain_cross_suggestion') return null

  const actionUrl = notification.action_url?.trim() ?? ''
  const { pathname, params } = actionUrl
    ? actionUrlParts(actionUrl)
    : { pathname: '', params: new URLSearchParams() }
  const spaceId = params.get('space')
  const itemId = params.get('item')
  const missionId = notification.mission_id ?? params.get('mission')

  if (spaceId && itemId) {
    return { type: 'space_task', spaceId, itemId }
  }

  if (
    notification.mission_id &&
    params.get('tab') === 'your-turn' &&
    itemId &&
    notification.type.startsWith('human_subtask')
  ) {
    return {
      type: 'mission_subtask',
      missionId: notification.mission_id,
      subtaskId: itemId,
      title: notification.title,
      orgId: notification.org_id,
    }
  }

  if (
    missionId &&
    (MISSION_DETAIL_TYPES.has(notification.type) || pathname.includes('mission-control'))
  ) {
    return { type: 'mission', missionId, orgId: notification.org_id }
  }

  return actionUrl ? { type: 'external_url', url: actionUrl } : null
}

export function notificationDetailActionLabel(notification: UserNotification): string | null {
  const target = resolveNotificationOpenTarget(notification)
  if (target?.type === 'space_task') return 'Open task details'
  if (target?.type === 'mission_subtask') return 'Open subtask details'
  if (target?.type === 'mission') return 'Open mission details'
  return null
}

export function notificationSourceActionLabel(notification: UserNotification): string | null {
  if (!notification.action_url || notification.type === 'brain_cross_suggestion') return null
  const target = resolveNotificationOpenTarget(notification)
  if (target?.type === 'space_task') return 'View in Space'
  if (target?.type === 'mission' || target?.type === 'mission_subtask') {
    return 'View in Mission Control'
  }
  if (notification.type === 'human_dm_message') return 'Open conversation'
  if (notification.type === 'org_invitation') return 'Review invitation'
  if (notification.type.startsWith('brain_')) return 'Open Brain'
  return 'View source'
}
