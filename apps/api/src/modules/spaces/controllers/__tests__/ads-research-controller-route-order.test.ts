import { describe, expect, it } from 'vitest'
import { SpacesModule } from '../../spaces.module'
import { AdsResearchController } from '../ads-research.controller'
import { AdsResearchSavedSearchesController } from '../ads-research-saved-searches.controller'

function methodIndex(controller: { prototype: object }, methodName: string): number {
  return Object.getOwnPropertyNames(controller.prototype).indexOf(methodName)
}

describe('AdsResearchController route order', () => {
  it('keeps saved-search routes before platform search routes', () => {
    const controllers = Reflect.getMetadata('controllers', SpacesModule) as unknown[]

    expect(controllers.indexOf(AdsResearchSavedSearchesController)).toBeGreaterThan(-1)
    expect(controllers.indexOf(AdsResearchController)).toBeGreaterThan(-1)
    expect(controllers.indexOf(AdsResearchSavedSearchesController)).toBeLessThan(
      controllers.indexOf(AdsResearchController),
    )
    expect(methodIndex(AdsResearchSavedSearchesController, 'createSavedSearch')).toBeGreaterThan(
      -1,
    )
    expect(methodIndex(AdsResearchSavedSearchesController, 'refreshSavedSearch')).toBeGreaterThan(
      -1,
    )
    expect(methodIndex(AdsResearchController, 'searchAds')).toBeGreaterThan(-1)
  })
})
