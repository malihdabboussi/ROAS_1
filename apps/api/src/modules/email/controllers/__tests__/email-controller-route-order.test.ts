import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { EmailModule } from '../../email.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_EMAIL_ROUTES = [
  'GET email/domains -> listDomains',
  'POST email/domains -> addDomain',
  'GET email/domains/:id -> getDomain',
  'POST email/domains/:id/verify -> verifyDomain',
  'POST email/domains/:id/default -> setDefaultDomain',
  'DELETE email/domains/:id -> deleteDomain',
  'POST email/domains/:id/reply-tracking/enable -> enableReplyTracking',
  'POST email/domains/:id/reply-tracking/disable -> disableReplyTracking',
  'POST email/domains/:id/reply-tracking/verify-mx -> verifyReplyTrackingMx',
  'GET email/domains/status/verified -> checkVerifiedStatus',
  'GET email/sender-identities -> listSenderIdentities',
  'POST email/sender-identities -> createSenderIdentity',
  'GET email/sender-identities/:id -> getSenderIdentity',
  'PATCH email/sender-identities/:id -> updateSenderIdentity',
  'DELETE email/sender-identities/:id -> deleteSenderIdentity',
  'POST email/sender-identities/:id/default -> setDefaultSenderIdentity',
  'POST email/sender-identities/:id/sync-status -> syncVerificationStatus',
  'POST email/sender-identities/sync -> syncFromSendGrid',
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
    EXPECTED_EMAIL_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Email controller route order', () => {
  it('keeps the existing domain and sender identity route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', EmailModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_EMAIL_ROUTES)
  })
})
