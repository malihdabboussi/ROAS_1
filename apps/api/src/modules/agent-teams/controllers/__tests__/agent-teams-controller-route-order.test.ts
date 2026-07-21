import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { AgentTeamsModule } from '../../agent-teams.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_AGENT_TEAMS_ROUTES = [
  'GET agent-teams -> list',
  'POST agent-teams -> create',
  'PATCH agent-teams/:teamId -> update',
  'DELETE agent-teams/:teamId -> remove',
  'GET agent-teams/:teamId/grants -> listGrants',
  'GET agent-teams/:teamId/overview -> overview',
  'GET agent-teams/:teamId/spending -> spending',
  'PUT agent-teams/:teamId/grants -> replaceGrants',
  'GET agent-teams/agents/:agentKey/policy -> getAgentPolicy',
  'PATCH agent-teams/agents/:agentKey/team -> setAgentTeam',
  'GET agent-teams/agents/:agentKey/overrides -> listAgentOverrides',
  'PUT agent-teams/agents/:agentKey/overrides -> replaceAgentOverrides',
  'POST agent-teams/agents/:agentKey/skill-overrides/:skillKey -> setSkillOverride',
  'DELETE agent-teams/agents/:agentKey/skill-overrides/:skillKey -> clearSkillOverride',
  'GET agent-teams/:teamId/external-members -> list',
  'PUT agent-teams/:teamId/external-members -> add',
  'DELETE agent-teams/:teamId/external-members/:personId -> remove',
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
    EXPECTED_AGENT_TEAMS_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Agent teams controller route order', () => {
  it('keeps the existing agent teams route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', AgentTeamsModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_AGENT_TEAMS_ROUTES)
  })
})
