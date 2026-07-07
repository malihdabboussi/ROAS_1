import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { GitHubModule } from '../../github.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_GITHUB_ROUTES = [
  'GET integrations/github/status -> status',
  'POST integrations/github/install -> install',
  'GET integrations/github/callback -> callback',
  'POST integrations/github/disconnect -> disconnect',
  'GET integrations/github/repos -> listRepos',
  'POST integrations/github/repos -> createRepo',
  'GET integrations/github/repos/:owner/:repo/contents -> getContents',
  'POST integrations/github/repos/:owner/:repo/branch -> createBranch',
  'POST integrations/github/repos/:owner/:repo/commit -> commitFiles',
  'POST integrations/github/repos/:owner/:repo/pr -> createPR',
  'GET integrations/github/repos/:owner/:repo/prs -> listPRs',
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
    EXPECTED_GITHUB_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('GitHub controller route order', () => {
  it('keeps the existing GitHub route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', GitHubModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_GITHUB_ROUTES)
  })
})
