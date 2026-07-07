import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { OrgModule } from '../../org.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_ORG_ROUTES = [
  'POST org -> create',
  'GET org/my -> listMyOrgs',
  'GET org/:orgId -> getOrg',
  'PATCH org/:orgId -> updateOrg',
  'DELETE org/:orgId -> deleteOrg',
  'POST org/:orgId/restore -> restoreOrg',
  'GET org/:orgId/members -> listMembers',
  'PATCH org/:orgId/members/:memberId/role -> changeMemberRole',
  'DELETE org/:orgId/members/:memberId -> removeMember',
  'PATCH org/:orgId/members/:memberId/credit-limit -> updateCreditLimit',
  'POST org/:orgId/campaigns/transfer/preview -> transferPreview',
  'POST org/:orgId/campaigns/transfer -> transferCampaigns',
  'POST org/:orgId/agents/import -> importAgents',
  'POST org/:orgId/brains/share -> shareBrain',
  'DELETE org/:orgId/brains/:brainId/share -> unshareBrain',
  'GET org/:orgId/brains/shared -> listSharedBrains',
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
    EXPECTED_ORG_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Org controller route order', () => {
  it('keeps the existing org route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', OrgModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_ORG_ROUTES)
  })
})
