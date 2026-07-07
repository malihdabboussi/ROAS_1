import type { UserNotification } from '@/features/mission-control/types'

export type HomeNotificationOpenTarget =
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

const MISSION_MODAL_TYPES = new Set<UserNotification['type']>([
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

function parseActionUrl(actionUrl: string): URLSearchParams {
  const qIndex = actionUrl.indexOf('?')
  const query = qIndex >= 0 ? actionUrl.slice(qIndex + 1) : ''
  return new URLSearchParams(query)
}

function actionPathname(actionUrl: string): string {
  const qIndex = actionUrl.indexOf('?')
  return qIndex >= 0 ? actionUrl.slice(0, qIndex) : actionUrl
}

/** Resolve how a notification should open on the home dashboard (modal vs leave home). */
export function resolveHomeNotificationOpenTarget(
  notification: UserNotification,
): HomeNotificationOpenTarget | null {
  if (notification.type === 'brain_cross_suggestion') return null

  const actionUrl = notification.action_url?.trim() ?? ''
  const params = actionUrl ? parseActionUrl(actionUrl) : new URLSearchParams()
  const pathname = actionUrl ? actionPathname(actionUrl) : ''
  const spaceId = params.get('space')
  const itemId = params.get('item')
  const missionFromUrl = params.get('mission')
  const missionId = notification.mission_id ?? missionFromUrl

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
    (MISSION_MODAL_TYPES.has(notification.type) || pathname.includes('mission-control'))
  ) {
    return { type: 'mission', missionId, orgId: notification.org_id }
  }

  if (actionUrl) {
    return { type: 'external_url', url: actionUrl }
  }

  return null
}
