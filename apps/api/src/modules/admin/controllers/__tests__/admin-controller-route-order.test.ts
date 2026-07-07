import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { AdminModule } from '../../admin.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_ADMIN_ROUTES = [
  'GET admin/check -> check',
  'GET admin/machine-pool-status -> getMachinePoolStatus',
  'POST admin/machine-pool/replenish -> replenishMachinePool',
  'GET admin/dashboard -> getDashboard',
  'GET admin/users -> getUsers',
  'GET admin/users/:id/dashboard -> getUserDashboard',
  'GET admin/orgs -> getOrgs',
  'GET admin/orgs/:id/dashboard -> getOrgDashboard',
  'GET admin/finances -> getFinances',
  'GET admin/operations -> getOperations',
  'GET admin/errors -> getErrors',
  'GET admin/traces -> getAgentTraces',
  'GET admin/traces/:id -> getAgentTraceById',
  'PATCH admin/errors/:id/resolve -> resolveError',
  'GET admin/mission-reliability -> getMissionReliability',
  'GET admin/instruction-governance -> getInstructionGovernance',
  'POST admin/instruction-governance/repair -> repairInstructionGovernance',
  'GET admin/waitlist -> getWaitlist',
  'POST admin/waitlist/:id/invite -> sendWaitlistInvite',
  'GET admin/invite-codes -> listInviteCodes',
  'POST admin/invite-codes -> createInviteCode',
  'PATCH admin/invite-codes/:id/revoke -> revokeInviteCode',
  'DELETE admin/invite-codes/:id -> deleteInviteCode',
  'GET admin/platform-email -> getPlatformEmail',
  'POST admin/platform-email/domain -> setPlatformEmailDomain',
  'POST admin/platform-email/verify-domain -> verifyPlatformEmailDomain',
  'POST admin/platform-email/sender -> setPlatformEmailSender',
  'POST admin/platform-email/sync-sender -> syncPlatformEmailSender',
  'GET admin/machines -> getMachineStats',
  'GET admin/unit-economics -> getUnitEconomics',
  'GET admin/billing-health -> getBillingHealth',
  'POST admin/billing-health/:id/resolve -> resolveBillingHealthItem',
  'POST admin/billing-health/reconcile -> reconcileBillingHealth',
  'POST admin/purge-orphan-agent-brains -> purgeOrphanAgentBrains',
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
    EXPECTED_ADMIN_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Admin controller route order', () => {
  it('keeps the existing admin route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', AdminModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_ADMIN_ROUTES)
  })
})
