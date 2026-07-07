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

const EXPECTED_SPACE_AUTOMATION_ROUTES = [
  'GET spaces/:id/automations/flows -> listFlows',
  'GET spaces/:id/automations/flows/:automationId -> getFlow',
  'POST spaces/:id/automations/flows/drafts -> createFlowDraft',
  'PATCH spaces/:id/automations/flows/:automationId -> updateFlowDraft',
  'POST spaces/:id/automations/flows/validate -> validateFlowDraft',
  'POST spaces/:id/automations/flows/:automationId/publish -> publishFlow',
  'POST spaces/:id/automations/capabilities/search -> searchFlowCapabilities',
  'GET spaces/:id/automations/capabilities/:capabilityId -> getFlowCapability',
  'GET spaces/:id/automations -> list',
  'POST spaces/:id/automations -> create',
  'PATCH spaces/:id/automations/:automationId -> update',
  'DELETE spaces/:id/automations/:automationId -> remove',
  'GET spaces/:id/automations/connected-app-triggers -> listConnectedAppTriggers',
  'GET spaces/:id/automations/templates -> listTemplates',
  'POST spaces/:id/automations/templates/:templateKey/install -> installTemplate',
  'GET spaces/:id/automations/fathom-sources -> listFathomSources',
  'GET spaces/:id/automations/runs -> listRuns',
  'POST spaces/:id/automations/:automationId/test -> test',
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
    EXPECTED_SPACE_AUTOMATION_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Space automations controller route order', () => {
  it('keeps the existing space automation route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', SpacesModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_SPACE_AUTOMATION_ROUTES)
  })
})
