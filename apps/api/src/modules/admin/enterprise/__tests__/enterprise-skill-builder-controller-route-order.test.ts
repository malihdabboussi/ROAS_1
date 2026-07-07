import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { AdminEnterpriseModule } from '../../admin-enterprise.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_ENTERPRISE_SKILL_BUILDER_ROUTES = [
  'GET admin/enterprise/skill-builder/users/search -> searchUsers',
  'GET admin/enterprise/skill-builder/users/:userId/scopes -> listScopes',
  'GET admin/enterprise/skill-builder/agents -> listAgents',
  'GET admin/enterprise/skill-builder/agents/:agentKey/skills -> listSkills',
  'POST admin/enterprise/skill-builder/skills -> createSkill',
  'PATCH admin/enterprise/skill-builder/skills/:skillId -> updateSkill',
  'DELETE admin/enterprise/skill-builder/skills/:skillId -> deleteSkill',
  'POST admin/enterprise/skill-builder/skills/:skillKey/resources -> createSkillResource',
  'POST admin/enterprise/skill-builder/sync -> triggerSync',
  'GET admin/enterprise/skill-builder/sessions -> listSessions',
  'POST admin/enterprise/skill-builder/sessions -> createSession',
  'GET admin/enterprise/skill-builder/sessions/:sessionId/messages -> listMessages',
  'POST admin/enterprise/skill-builder/sessions/:sessionId/chat -> chat',
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
    EXPECTED_ENTERPRISE_SKILL_BUILDER_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Enterprise skill builder controller route order', () => {
  it('keeps the existing enterprise skill builder route inventory and order', () => {
    const controllers = Reflect.getMetadata(
      'controllers',
      AdminEnterpriseModule,
    ) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_ENTERPRISE_SKILL_BUILDER_ROUTES)
  })
})
