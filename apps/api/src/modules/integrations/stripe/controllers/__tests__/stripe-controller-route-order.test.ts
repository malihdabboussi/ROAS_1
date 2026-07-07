import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { StripeModule } from '../../stripe.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_STRIPE_ROUTES = [
  'GET integrations/stripe/status -> status',
  'POST integrations/stripe/connect -> connect',
  'GET integrations/stripe/callback -> callback',
  'POST integrations/stripe/disconnect -> disconnect',
  'POST integrations/stripe/products -> createProduct',
  'GET integrations/stripe/products -> listProducts',
  'POST integrations/stripe/prices -> createPrice',
  'GET integrations/stripe/prices -> listPrices',
  'POST integrations/stripe/payment-links -> createPaymentLink',
  'GET integrations/stripe/payment-links -> listPaymentLinks',
  'POST integrations/stripe/refunds -> createRefund',
  'GET integrations/stripe/charges -> listCharges',
  'GET integrations/stripe/customers -> listCustomers',
  'GET integrations/stripe/subscriptions -> listSubscriptions',
  'GET integrations/stripe/invoices -> listInvoices',
  'GET integrations/stripe/analytics/overview -> overview',
  'GET integrations/stripe/analytics/campaign-overview -> campaignOverview',
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
    EXPECTED_STRIPE_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Stripe controller route order', () => {
  it('keeps the existing stripe route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', StripeModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_STRIPE_ROUTES)
  })
})
