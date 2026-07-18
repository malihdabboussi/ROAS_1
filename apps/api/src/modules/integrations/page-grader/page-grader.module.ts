import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BrainModule } from '../../brain/brain.module'
import { SpacesModule } from '../../spaces/spaces.module'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { PageGraderController } from './controllers/page-grader.controller'
import { PageGraderIntegration } from './integrations/page-grader.integration'
import { PageGraderApiService } from './services/page-grader-api.service'
import { PageGraderBrainImportService } from './services/page-grader-brain-import.service'

@Module({
  imports: [ConfigModule, SpacesModule, BrainModule],
  controllers: [PageGraderController],
  providers: [
    PageGraderIntegration,
    PageGraderApiService,
    PageGraderBrainImportService,
    IntegrationConnectionsRepository,
  ],
  exports: [PageGraderApiService, PageGraderIntegration],
})
export class PageGraderModule {}
