import { describe, expect, it } from 'vitest'
import { SpacesModule } from '../../spaces.module'
import { SocialResearchController } from '../social-research.controller'
import { SocialResearchTopicSearchesController } from '../social-research-topic-searches.controller'

function methodIndex(controller: { prototype: object }, methodName: string): number {
  return Object.getOwnPropertyNames(controller.prototype).indexOf(methodName)
}

describe('SocialResearchController route order', () => {
  it('keeps saved topic-search routes before platform topic-search routes', () => {
    const controllers = Reflect.getMetadata('controllers', SpacesModule) as unknown[]

    expect(controllers.indexOf(SocialResearchTopicSearchesController)).toBeGreaterThan(-1)
    expect(controllers.indexOf(SocialResearchController)).toBeGreaterThan(-1)
    expect(controllers.indexOf(SocialResearchTopicSearchesController)).toBeLessThan(
      controllers.indexOf(SocialResearchController),
    )
    expect(
      methodIndex(SocialResearchTopicSearchesController, 'createSavedTopicSearch'),
    ).toBeGreaterThan(-1)
    expect(
      methodIndex(SocialResearchTopicSearchesController, 'refreshSavedTopicSearch'),
    ).toBeGreaterThan(-1)
    expect(methodIndex(SocialResearchController, 'topicSearchPosts')).toBeGreaterThan(-1)
  })
})
