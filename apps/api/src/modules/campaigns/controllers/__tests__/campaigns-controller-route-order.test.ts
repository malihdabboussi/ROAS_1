import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { CampaignsModule } from '../../campaigns.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_CAMPAIGNS_ROUTES = [
  'GET campaigns -> list',
  'GET campaigns/user-state -> listUserState',
  'PATCH campaigns/:id/user-state -> updateUserState',
  'GET campaigns/leaderboard -> campaignLeaderboard',
  'GET campaigns/assignments/by-agent/:agentKey -> listAgentCampaignAssignments',
  'GET campaigns/:id -> get',
  'POST campaigns -> create',
  'PATCH campaigns/:id -> update',
  'PATCH campaigns/:id/context -> updateContext',
  'POST campaigns/:id/generate-context -> generateCampaignContext',
  'DELETE campaigns/:id -> delete',
  'PATCH campaigns/:id/restore -> restore',
  'GET campaigns/:id/agents -> listCampaignAgents',
  'POST campaigns/:id/agents -> assignCampaignAgent',
  'DELETE campaigns/:id/agents/:agentKey -> unassignCampaignAgent',
  'GET campaigns/:id/analytics -> analytics',
  'GET campaigns/:id/email-analytics -> emailAnalytics',
  'GET campaigns/:id/ad-analytics -> adAnalytics',
  'GET campaigns/:id/social-connection-options -> socialConnectionOptions',
  'GET campaigns/:id/social-analytics -> socialAnalytics',
  'GET campaigns/:id/main-dashboard -> mainDashboardAnalytics',
  'GET campaigns/:id/reporting-widgets -> reportingWidgets',
  'GET campaigns/:id/knowledge/nodes -> listKnowledgeNodes',
  'POST campaigns/:id/knowledge/nodes/manual -> createManualKnowledgeNode',
  'POST campaigns/:id/knowledge/import-url -> importKnowledgeFromUrl',
  'POST campaigns/:id/knowledge/from-deliverable -> addKnowledgeFromDeliverable',
  'DELETE campaigns/:id/knowledge/nodes/:nodeId -> deleteKnowledgeNode',
  'GET campaigns/:id/knowledge/graph -> getKnowledgeGraph',
  'GET campaigns/:id/knowledge/search -> searchKnowledge',
  'POST campaigns/:id/knowledge/sync-assets -> syncKnowledgeFromAssets',
  'POST campaigns/:id/knowledge/organize -> organizeKnowledgeGraph',
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
    EXPECTED_CAMPAIGNS_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Campaigns controller route order', () => {
  it('keeps the existing campaign route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', CampaignsModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_CAMPAIGNS_ROUTES)
  })
})
