import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { SupabaseIntegrationModule } from '../../supabase-integration.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_SUPABASE_ROUTES = [
  'GET integrations/supabase/status -> status',
  'POST integrations/supabase/connect -> connect',
  'GET integrations/supabase/callback -> callback',
  'POST integrations/supabase/disconnect -> disconnect',
  'GET integrations/supabase/organizations -> listOrganizations',
  'GET integrations/supabase/projects -> listProjects',
  'POST integrations/supabase/provision -> provisionProject',
  'POST integrations/supabase/link-existing -> linkExistingProject',
  'GET integrations/supabase/auth/users -> listAuthUsers',
  'GET integrations/supabase/auth/users/:userId -> getAuthUser',
  'POST integrations/supabase/auth/users -> createAuthUser',
  'PATCH integrations/supabase/auth/users/:userId -> updateAuthUser',
  'DELETE integrations/supabase/auth/users/:userId -> deleteAuthUser',
  'GET integrations/supabase/auth/config -> getAuthConfig',
  'PATCH integrations/supabase/auth/config -> updateAuthConfig',
  'POST integrations/supabase/database/query -> runDatabaseQuery',
  'GET integrations/supabase/database/tables -> listTables',
  'GET integrations/supabase/database/tables/:table/rows -> fetchTableRows',
  'POST integrations/supabase/database/tables/:table/rows -> insertRow',
  'PATCH integrations/supabase/database/tables/:table/rows -> updateRow',
  'DELETE integrations/supabase/database/tables/:table/rows -> deleteRow',
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
    EXPECTED_SUPABASE_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Supabase controller route order', () => {
  it('keeps the existing Supabase route inventory and order', () => {
    const controllers = Reflect.getMetadata(
      'controllers',
      SupabaseIntegrationModule,
    ) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_SUPABASE_ROUTES)
  })
})
