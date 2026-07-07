import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { FanbasisModule } from '../../fanbasis.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_FANBASIS_ROUTES = [
  'GET integrations/fanbasis/status -> status',
  'POST integrations/fanbasis/connect -> connect',
  'POST integrations/fanbasis/disconnect -> disconnect',
  'GET integrations/fanbasis/products -> listProducts',
  'POST integrations/fanbasis/checkout-sessions -> createCheckoutSession',
  'GET integrations/fanbasis/checkout-sessions/:id -> getCheckoutSession',
  'DELETE integrations/fanbasis/checkout-sessions/:id -> deleteCheckoutSession',
  'POST integrations/fanbasis/checkout-sessions/embedded -> createEmbeddedCheckoutSession',
  'GET integrations/fanbasis/transactions -> getTransactions',
  'GET integrations/fanbasis/transactions/:transactionId -> getTransaction',
  'GET integrations/fanbasis/checkout-sessions/:id/transactions -> getCheckoutSessionTransactions',
  'POST integrations/fanbasis/checkout-sessions/transactions/:transactionId/refund -> refundTransaction',
  'GET integrations/fanbasis/checkout-sessions/:productId/subscriptions -> getProductSubscriptions',
  'GET integrations/fanbasis/checkout-sessions/:id/session-subscriptions -> getCheckoutSessionSubscriptions',
  'DELETE integrations/fanbasis/checkout-sessions/:sessionId/subscriptions/:subscriptionId -> cancelSubscription',
  'POST integrations/fanbasis/checkout-sessions/:sessionId/extend-subscription -> extendSubscription',
  'POST integrations/fanbasis/webhook-subscriptions -> createWebhookSubscription',
  'GET integrations/fanbasis/webhook-subscriptions -> getWebhookSubscriptions',
  'DELETE integrations/fanbasis/webhook-subscriptions/:id -> deleteWebhookSubscription',
  'POST integrations/fanbasis/webhook-subscriptions/:id/test -> testWebhookSubscription',
  'GET integrations/fanbasis/customers -> getCustomers',
  'POST integrations/fanbasis/customers/:customerId/charge -> chargeCustomer',
  'GET integrations/fanbasis/customers/:customerId/payment-methods -> getCustomerPaymentMethods',
  'GET integrations/fanbasis/subscribers -> getSubscribers',
  'GET integrations/fanbasis/discount-codes -> listDiscountCodes',
  'POST integrations/fanbasis/discount-codes -> createDiscountCode',
  'GET integrations/fanbasis/discount-codes/:id -> getDiscountCode',
  'PUT integrations/fanbasis/discount-codes/:id -> updateDiscountCode',
  'DELETE integrations/fanbasis/discount-codes/:id -> deleteDiscountCode',
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
    EXPECTED_FANBASIS_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Fanbasis controller route order', () => {
  it('keeps the existing fanbasis route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', FanbasisModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_FANBASIS_ROUTES)
  })
})
