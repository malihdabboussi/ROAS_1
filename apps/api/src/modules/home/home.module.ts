import { Module } from '@nestjs/common'
import { ChannelsModule } from '../channels/channels.module'
import { DmModule } from '../dm/dm.module'
import { HomeController } from './controllers/home.controller'
import { DailyRecommendationRepository } from './repositories/daily-recommendation.repository'
import { HomeCommunicationsRepository } from './repositories/home-communications.repository'
import { DailyRecommendationService } from './services/daily-recommendation.service'
import { HomeCommunicationsService } from './services/home-communications.service'

@Module({
  imports: [ChannelsModule, DmModule],
  controllers: [HomeController],
  providers: [
    HomeCommunicationsService,
    HomeCommunicationsRepository,
    DailyRecommendationService,
    DailyRecommendationRepository,
  ],
})
export class HomeModule {}
