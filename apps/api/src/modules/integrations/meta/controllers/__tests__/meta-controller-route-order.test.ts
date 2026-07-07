import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { MetaModule } from '../../meta.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_META_ROUTES = [
  'GET integrations/meta/status -> status',
  'POST integrations/meta/connect -> connect',
  'GET integrations/meta/callback -> callback',
  'POST integrations/meta/disconnect -> disconnect',
  'GET integrations/meta/ad-accounts -> adAccounts',
  'GET integrations/meta/pages -> pages',
  'GET integrations/meta/ad-accounts/:adAccountId/pixels -> pixels',
  'GET integrations/meta/ad-accounts/:adAccountId/adimages -> adImages',
  'POST integrations/meta/ad-accounts/:adAccountId/pixels -> createPixel',
  'GET integrations/meta/ad-accounts/:adAccountId/customaudiences -> customAudiences',
  'POST integrations/meta/ad-accounts/:adAccountId/customaudiences -> createCustomAudience',
  'POST integrations/meta/ad-accounts/:adAccountId/customaudiences/lookalike -> createLookalikeAudience',
  'GET integrations/meta/ad-accounts/:adAccountId/customconversions -> customConversions',
  'POST integrations/meta/ad-accounts/:adAccountId/customconversions -> createCustomConversion',
  'GET integrations/meta/pages/:pageId/instagram-accounts -> instagramAccountsForPage',
  'GET integrations/meta/pages/:pageId -> page',
  'GET integrations/meta/search-countries -> searchCountries',
  'GET integrations/meta/search-locations -> searchLocations',
  'GET integrations/meta/search-interests -> searchInterests',
  'GET integrations/meta/insights -> insights',
  'PATCH integrations/meta/campaign-budget -> updateCampaignBudget',
  'PATCH integrations/meta/adset-budget -> updateAdSetBudget',
  'PATCH integrations/meta/campaign -> updateCampaign',
  'PATCH integrations/meta/adset -> updateAdSet',
  'POST integrations/meta/publish-ad -> publishAd',
  'POST integrations/meta/publish-campaign -> publishCampaign',
  'GET integrations/meta/ad-accounts/:adAccountId/campaigns -> listMetaCampaigns',
  'GET integrations/meta/meta-campaigns/:metaCampaignId/adsets -> listMetaAdSets',
  'GET integrations/meta/meta-adsets/:metaAdSetId/ads -> listMetaAds',
  'GET integrations/meta/ad-accounts/:adAccountId/hierarchy -> getMetaFullHierarchy',
  'POST integrations/meta/ad-accounts/:adAccountId/sync -> syncMetaAdAccount',
  'GET integrations/meta/webhook -> verifyWebhook',
  'POST integrations/meta/webhook -> handleWebhook',
  'POST integrations/meta/data-deletion -> dataDeletion',
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
    EXPECTED_META_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
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

describe('Meta controller route order', () => {
  it('keeps the existing Meta route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', MetaModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_META_ROUTES)
  })
})
