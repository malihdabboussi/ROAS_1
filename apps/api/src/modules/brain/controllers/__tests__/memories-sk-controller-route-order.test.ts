import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { BrainModule } from '../../brain.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_MEMORIES_SK_ROUTES = [
  'POST brain/remember -> remember',
  'POST brain/search -> search',
  'POST brain/remember-link -> rememberLink',
  'POST brain/process/conversation -> processConversation',
  'GET brain/brains -> listBrains',
  'GET brain/stats -> stats',
  'GET brain/health -> health',
  'GET brain/health/batch -> healthBatch',
  'GET brain/memories/:id -> getDetail',
  'PATCH brain/memories/:id -> update',
  'DELETE brain/memories/:id -> delete',
  'POST brain/memories/:id/connect -> connect',
  'DELETE brain/connections/:id -> deleteConnection',
  'POST brain/nodes/transfer -> transferNode',
  'POST brain/sk/extract-text -> extractText',
  'POST brain/sk/ingest -> ingest',
  'POST brain/sk/ingest-link -> ingestLink',
  'GET brain/sk/sources -> getSources',
  'GET brain/sk/search -> search',
  'GET brain/sk/gaps -> getGaps',
  'GET brain/sk/stats -> getStats',
  'DELETE brain/sk/entries/:id -> deleteEntry',
  'DELETE brain/sk/sources/:id -> deleteSource',
  'PATCH brain/sk/mastery -> updateMastery',
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
    EXPECTED_MEMORIES_SK_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Memories and SK controller route order', () => {
  it('keeps the existing memories and SK route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', BrainModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_MEMORIES_SK_ROUTES)
  })
})
