import { describe, expect, it } from 'vitest'
import { ScrapeCreatorsModule } from '../../scrapecreators.module'
import { ScrapeCreatorsInstagramController } from '../scrapecreators-instagram.controller'
import { ScrapeCreatorsLinkedinRedditController } from '../scrapecreators-linkedin-reddit.controller'
import { ScrapeCreatorsThreadsController } from '../scrapecreators-threads.controller'
import { ScrapeCreatorsTwitterFacebookController } from '../scrapecreators-twitter-facebook.controller'
import { ScrapeCreatorsYoutubeController } from '../scrapecreators-youtube.controller'
import { ScrapeCreatorsController } from '../scrapecreators.controller'

function methodIndex(controller: Function, methodName: string): number {
  return Object.getOwnPropertyNames(controller.prototype).indexOf(methodName)
}

describe('ScrapeCreatorsController route groups', () => {
  it('keeps platform route groups registered on the controller', () => {
    const controllers = Reflect.getMetadata('controllers', ScrapeCreatorsModule) as Function[]
    expect(methodIndex(ScrapeCreatorsController, 'tiktokProfile')).toBeGreaterThan(-1)
    expect(methodIndex(ScrapeCreatorsInstagramController, 'instagramProfile')).toBeGreaterThan(-1)
    expect(methodIndex(ScrapeCreatorsYoutubeController, 'youtubeTranscript')).toBeGreaterThan(-1)
    expect(methodIndex(ScrapeCreatorsTwitterFacebookController, 'twitterProfile')).toBeGreaterThan(-1)
    expect(methodIndex(ScrapeCreatorsTwitterFacebookController, 'facebookProfile')).toBeGreaterThan(-1)
    expect(methodIndex(ScrapeCreatorsLinkedinRedditController, 'linkedinProfile')).toBeGreaterThan(-1)
    expect(methodIndex(ScrapeCreatorsLinkedinRedditController, 'redditSearch')).toBeGreaterThan(-1)
    expect(methodIndex(ScrapeCreatorsThreadsController, 'threadsProfile')).toBeGreaterThan(-1)
    expect(controllers).toContain(ScrapeCreatorsInstagramController)
    expect(controllers).toContain(ScrapeCreatorsYoutubeController)
    expect(controllers).toContain(ScrapeCreatorsThreadsController)
  })
})
