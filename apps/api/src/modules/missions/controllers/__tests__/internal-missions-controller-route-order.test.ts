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

const EXPECTED_INTERNAL_MISSIONS_ROUTES = [
  'POST internal/missions/create -> create',
  'POST internal/missions/callback -> callback',
  'POST internal/missions/plan -> createPlan',
  'POST internal/missions/deliverable -> createDeliverable',
  'POST internal/missions/awareness/telegram-push -> telegramPush',
  'POST internal/missions/awareness/retry -> awarenessRetry',
  'POST internal/missions/awareness/comment -> awarenessComment',
  'POST internal/missions/awareness/reassign -> awarenessReassign',
  'POST internal/missions/awareness/nudge-subtask -> awarenessNudgeSubtask',
  'POST internal/missions/awareness/progress-notes -> awarenessProgressNotes',
  'POST internal/missions/manager/mission-fields -> managerAmendFields',
  'POST internal/missions/manager/append-subtasks -> managerAppendSubtasks',
  'POST internal/missions/manager/prepare-replan -> managerPrepareReplan',
  'POST internal/missions/manager/cancel-subtask -> managerCancelSubtask',
  'POST internal/missions/manager/edit-subtask -> managerEditSubtask',
  'POST internal/missions/manager/retry-subtask -> managerRetrySubtask',
  'POST internal/missions/awareness/append-subtasks -> awarenessAppendSubtasks',
  'POST internal/missions/awareness/cancel-subtask -> awarenessCancelSubtask',
  'POST internal/missions/awareness/edit-subtask -> awarenessEditSubtask',
  'POST internal/missions/awareness/retry-subtask -> awarenessRetrySubtask',
  'POST internal/missions/awareness/replan -> awarenessReplan',
  'POST internal/missions/awareness/pause -> awarenessPause',
  'POST internal/missions/awareness/amend -> awarenessAmend',
  'POST internal/missions/notification-push -> notificationPush',
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
    EXPECTED_INTERNAL_MISSIONS_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Internal missions controller route order', () => {
  it('keeps the existing internal missions route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', MissionsModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_INTERNAL_MISSIONS_ROUTES)
  })
})
