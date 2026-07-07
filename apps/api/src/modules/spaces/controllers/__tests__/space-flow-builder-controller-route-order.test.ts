import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { SpacesModule } from '../../spaces.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_SPACE_FLOW_BUILDER_ROUTES = [
  'GET spaces/:id/automations/flows/build-context -> getBuildContext',
  'POST spaces/:id/automations/flows/plans -> createPlan',
  'POST spaces/:id/automations/flows/build-sessions -> createBuildSession',
  'GET spaces/:id/automations/flows/build-sessions/latest -> getLatestBuildSession',
  'GET spaces/:id/automations/flows/build-sessions -> listBuildSessions',
  'GET spaces/:id/automations/flows/build-sessions/:sessionId -> getBuildSession',
  'POST spaces/:id/automations/flows/build-sessions/:sessionId/clarifications -> createClarifications',
  'POST spaces/:id/automations/flows/build-sessions/:sessionId/clarifications/answers -> answerBuildSessionClarifications',
  'GET spaces/:id/automations/flows/plans/latest -> getLatestPlan',
  'GET spaces/:id/automations/flows/plans/:sessionId -> getPlan',
  'PATCH spaces/:id/automations/flows/plans/:sessionId -> updatePlan',
  'POST spaces/:id/automations/flows/plans/:sessionId/clarifications -> answerPlanClarifications',
  'POST spaces/:id/automations/flows/plans/:sessionId/validate -> validatePlan',
  'POST spaces/:id/automations/flows/plans/:sessionId/compile -> compilePlan',
  'POST spaces/:id/automations/flows/plans/:sessionId/evaluations -> evaluatePlan',
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
    EXPECTED_SPACE_FLOW_BUILDER_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Space flow builder controller route order', () => {
  it('keeps the existing space flow builder route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', SpacesModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_SPACE_FLOW_BUILDER_ROUTES)
  })
})
