import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BrainModule } from '../../brain/brain.module'
import { FirefliesController } from './controllers/fireflies.controller'
import { FirefliesIntegration } from './integrations/fireflies.integration'
import { FirefliesRepository } from './repositories/fireflies.repository'
import { FirefliesApiService } from './services/fireflies-api.service'

@Module({
  imports: [ConfigModule, BrainModule],
  controllers: [FirefliesController],
  providers: [FirefliesIntegration, FirefliesApiService, FirefliesRepository],
  exports: [FirefliesIntegration, FirefliesApiService],
})
export class FirefliesModule {}
