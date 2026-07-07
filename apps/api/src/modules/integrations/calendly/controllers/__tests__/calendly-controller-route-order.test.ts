import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { CalendlyModule } from '../../calendly.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_CALENDLY_ROUTES = [
  'GET integrations/calendly/status -> status',
  'POST integrations/calendly/connect -> connect',
  'GET integrations/calendly/callback -> callback',
  'POST integrations/calendly/disconnect -> disconnect',
  'GET integrations/calendly/event-types -> listEventTypes',
  'GET integrations/calendly/event-types/:uuid -> getEventType',
  'POST integrations/calendly/event-types -> createEventType',
  'PATCH integrations/calendly/event-types/:uuid -> updateEventType',
  'POST integrations/calendly/one-off-event-types -> createOneOffEventType',
  'GET integrations/calendly/scheduled-events -> listScheduledEvents',
  'POST integrations/calendly/scheduled-events -> createScheduledEvent',
  'POST integrations/calendly/scheduled-events/:uuid/cancel -> cancelScheduledEvent',
  'GET integrations/calendly/available-times -> listAvailableTimes',
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
    EXPECTED_CALENDLY_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Calendly controller route order', () => {
  it('keeps the existing calendly route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', CalendlyModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_CALENDLY_ROUTES)
  })
})
