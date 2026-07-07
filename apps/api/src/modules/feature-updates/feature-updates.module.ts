import { Module } from '@nestjs/common'
import { FeatureUpdatesController } from './controllers/feature-updates.controller'
import { FeatureUpdatesRepository } from './repositories/feature-updates.repository'
import { FeatureUpdatesService } from './services/feature-updates.service'

@Module({
  controllers: [FeatureUpdatesController],
  providers: [FeatureUpdatesService, FeatureUpdatesRepository],
})
export class FeatureUpdatesModule {}
