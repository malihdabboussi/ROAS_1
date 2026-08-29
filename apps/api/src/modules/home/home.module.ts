import { Module } from '@nestjs/common'
import { ChannelsModule } from '../channels/channels.module'
import { DmModule } from '../dm/dm.module'
import { ProgramsModule } from '../programs/programs.module'
import { HomeController } from './controllers/home.controller'
import { DailyRecommendationRepository } from './repositories/daily-recommendation.repository'
import { HomeCommunicationsRepository } from './repositories/home-communications.repository'
import { NextMovesRepository } from './repositories/next-moves.repository'
import { DailyRecommendationService } from './services/daily-recommendation.service'
import { HomeCommunicationsService } from './services/home-communications.service'
import { NextMovesService } from './services/next-moves.service'

@Module({
  imports: [ChannelsModule, DmModule, ProgramsModule],
  controllers: [HomeController],
  providers: [
    HomeCommunicationsService,
    HomeCommunicationsRepository,
    DailyRecommendationService,
    DailyRecommendationRepository,
    NextMovesService,
    NextMovesRepository,
  ],
})
export class HomeModule {}
