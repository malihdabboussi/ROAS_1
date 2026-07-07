import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingModule } from '../../billing/billing.module'
import { ScrapeCreatorsInstagramController } from './controllers/scrapecreators-instagram.controller'
import { ScrapeCreatorsLinkedinRedditController } from './controllers/scrapecreators-linkedin-reddit.controller'
import { ScrapeCreatorsThreadsController } from './controllers/scrapecreators-threads.controller'
import { ScrapeCreatorsTiktokDiscoveryController } from './controllers/scrapecreators-tiktok-discovery.controller'
import { ScrapeCreatorsTwitterFacebookController } from './controllers/scrapecreators-twitter-facebook.controller'
import { ScrapeCreatorsYoutubeController } from './controllers/scrapecreators-youtube.controller'
import { ScrapeCreatorsController } from './controllers/scrapecreators.controller'
import { ScrapeCreatorsActionService } from './services/scrapecreators-action.service'
import { ScrapeCreatorsApiService } from './services/scrapecreators-api.service'

@Module({
  imports: [ConfigModule, BillingModule],
  controllers: [
    ScrapeCreatorsController,
    ScrapeCreatorsTiktokDiscoveryController,
    ScrapeCreatorsInstagramController,
    ScrapeCreatorsYoutubeController,
    ScrapeCreatorsTwitterFacebookController,
    ScrapeCreatorsLinkedinRedditController,
    ScrapeCreatorsThreadsController,
  ],
  providers: [ScrapeCreatorsApiService, ScrapeCreatorsActionService],
  exports: [ScrapeCreatorsApiService],
})
export class ScrapeCreatorsModule {}
