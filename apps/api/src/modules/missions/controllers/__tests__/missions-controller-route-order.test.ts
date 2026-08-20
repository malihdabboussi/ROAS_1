import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { MissionsModule } from '../../missions.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_MISSIONS_ROUTES = [
  'GET missions -> list',
  'GET missions/notifications -> list',
  'GET missions/notifications/counts -> counts',
  'GET missions/notifications/unread-count -> unreadCount',
  'POST missions/notifications/read-all -> markAllRead',
  'POST missions/notifications/clear-all -> clearAll',
  'DELETE missions/notifications/read -> deleteRead',
  'POST missions/notifications/:notificationId/bucket -> moveBucket',
  'POST missions/notifications/:notificationId/snooze -> snooze',
  'POST missions/notifications/:notificationId/unsnooze -> unsnooze',
  'POST missions/notifications/:notificationId/clear -> clear',
  'POST missions/notifications/:notificationId/unclear -> unclear',
  'PATCH missions/notifications/:notificationId/read -> markRead',
  'POST missions/notifications/:notificationId/unread -> markUnread',
  'DELETE missions/notifications/:notificationId -> remove',
  'PATCH missions/profile/settings -> updateProfileSettings',
  'GET missions/profile/settings -> getProfileSettings',
  'PATCH missions/awareness-toggle -> toggleAwareness',
  'PATCH missions/auto-approve-toggle -> toggleAutoApprovePlans',
  'PATCH missions/bulk -> bulkUpdate',
  'GET missions/deliverables/batch -> getDeliverablesBatch',
  'PATCH missions/deliverables/:deliverableId -> updateDeliverable',
  'GET missions/:id -> getById',
  'GET missions/:id/plan -> getPlan',
  'GET missions/:id/deliverables -> getDeliverables',
  'POST missions/:id/deliverables/export-google-doc -> exportDeliverablesGoogleDoc',
  'GET missions/:id/logs -> getLogs',
  'GET missions/:id/access-requests -> listAccessRequests',
  'POST missions -> create',
  'POST missions/:id/comment -> addComment',
  'POST missions/:id/attachments -> uploadAttachment',
  'POST missions/:id/approve-plan -> approvePlan',
  'POST missions/:id/reject-plan -> rejectPlan',
  'POST missions/:id/retry -> retry',
  'POST missions/:id/extend -> extend',
  'DELETE missions/:id -> trash',
  'PATCH missions/:id -> updateMission',
  'POST missions/:id/access-requests/approve -> approve',
  'POST missions/:id/access-requests/deny -> deny',
  'PATCH missions/:id/status -> updateStatus',
  'GET missions/:id/subtasks -> listSubtasks',
  'PATCH missions/:id/subtasks/:subtaskId -> updateSubtask',
  'POST missions/:id/subtasks/:subtaskId/retry -> retrySubtask',
  'POST missions/:id/subtasks/:subtaskId/complete-human -> completeHumanSubtask',
  'POST missions/:id/subtasks/:subtaskId/bounce-to-agent -> bounceSubtaskToAgent',
  'POST missions/:id/subtasks/:subtaskId/reassign-human -> reassignHumanSubtask',
  'POST missions/:id/subtasks/:subtaskId/block-human -> blockHumanSubtask',
  'POST missions/:id/rate -> rateMission',
]

function asPath(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

function joinRoute(controllerPath: string, methodPath: string): string {
  return [controllerPath, methodPath]
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')
}

function collectRoutes(controllers: ControllerType[]): string[] {
  const expectedPaths = new Set(
    EXPECTED_MISSIONS_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
  )

  return controllers.flatMap((controller) => {
    const controllerPath = asPath(Reflect.getMetadata(PATH_METADATA, controller))
    if (controllerPath === null) return []

    return Object.getOwnPropertyNames(controller.prototype)
      .filter((methodName) => methodName !== 'constructor')
      .map((methodName) => {
        const handler = controller.prototype[methodName]
        if (typeof handler !== 'function') return null

        const methodPath = asPath(Reflect.getMetadata(PATH_METADATA, handler))
        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler)
        if (methodPath === null || requestMethod === undefined) return null

        const route = `${METHOD_NAMES[requestMethod]} ${joinRoute(controllerPath, methodPath)}`
        if (!expectedPaths.has(route)) return null
        return `${route} -> ${methodName}`
      })
      .filter((route): route is string => route !== null)
  })
}

describe('Missions controller route order', () => {
  it('keeps the existing missions route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', MissionsModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_MISSIONS_ROUTES)
  })
})
