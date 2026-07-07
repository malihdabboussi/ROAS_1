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

const EXPECTED_CORTEX_MAX_ROUTES = [
  'GET brain/company/status -> getCompanyCortexStatus',
  'PATCH brain/company/settings -> updateCompanyCortexSettings',
  'GET brain/company/objects -> getCompanyCortexObjects',
  'GET brain/company/signals -> getCompanyCortexSignals',
  'PATCH brain/company/signals/:signalId -> updateCompanyCortexSignal',
  'GET brain/customer/status -> getCustomerBrainStatus',
  'POST brain/customer/memories/text -> addCustomerMemoryText',
  'POST brain/customer/memories/link -> addCustomerMemoryLink',
  'PATCH brain/customer/enabled -> setCustomerBrainEnabled',
  'GET brain/customer/view -> getCustomerBrainView',
  'PATCH brain/:brainId/image -> setBrainImage',
  'PATCH brain/:brainId/cortex-max -> toggleCortexMax',
  'POST brain/:brainId/cortex-max/crystallize -> crystallizeCortexMax',
  'GET brain/:brainId/narrative-pages -> getNarrativePages',
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
    EXPECTED_CORTEX_MAX_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Cortex Max controller route order', () => {
  it('keeps the existing cortex max route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', BrainModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_CORTEX_MAX_ROUTES)
  })
})
