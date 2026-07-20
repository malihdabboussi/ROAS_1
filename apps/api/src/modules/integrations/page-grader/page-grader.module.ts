import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BrainModule } from '../../brain/brain.module'
import { SpacesModule } from '../../spaces/spaces.module'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { PageGraderWebhooksController } from './controllers/page-grader-webhooks.controller'
import { PageGraderController } from './controllers/page-grader.controller'
import { PageGraderIntegration } from './integrations/page-grader.integration'
import { PageGraderApiService } from './services/page-grader-api.service'
import { PageGraderBrainImportService } from './services/page-grader-brain-import.service'
import { PageGraderBrainSyncService } from './services/page-grader-brain-sync.service'
import { PageGraderSendWorkService } from './services/page-grader-send-work.service'

@Module({
  imports: [ConfigModule, SpacesModule, BrainModule],
  controllers: [PageGraderController, PageGraderWebhooksController],
  providers: [
    PageGraderIntegration,
    PageGraderSendWorkService,
    PageGraderApiService,
    PageGraderBrainImportService,
    PageGraderBrainSyncService,
    IntegrationConnectionsRepository,
  ],
  exports: [PageGraderApiService, PageGraderIntegration, PageGraderBrainSyncService],
})
export class PageGraderModule {}
