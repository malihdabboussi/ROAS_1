import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BrainModule } from '../../brain/brain.module'
import { McpModule } from '../../mcp/mcp.module'
import { SpacesModule } from '../../spaces/spaces.module'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { PageGraderWebhooksController } from './controllers/page-grader-webhooks.controller'
import { PageGraderController } from './controllers/page-grader.controller'
import { PageGraderIntegration } from './integrations/page-grader.integration'
import { PageGraderBrainSyncRepository } from './repositories/page-grader-brain-sync.repository'
import { PageGraderApiService } from './services/page-grader-api.service'
import { PageGraderBrainImportService } from './services/page-grader-brain-import.service'
import { PageGraderBrainSyncService } from './services/page-grader-brain-sync.service'
import { PageGraderMcpRegistrationService } from './services/page-grader-mcp-registration.service'
import { PageGraderMeetingSyncService } from './services/page-grader-meeting-sync.service'
import { PageGraderSendWorkService } from './services/page-grader-send-work.service'

@Module({
  imports: [ConfigModule, SpacesModule, BrainModule, McpModule],
  controllers: [PageGraderController, PageGraderWebhooksController],
  providers: [
    PageGraderIntegration,
    PageGraderSendWorkService,
    PageGraderApiService,
    PageGraderBrainImportService,
    PageGraderBrainSyncService,
    PageGraderMeetingSyncService,
    PageGraderMcpRegistrationService,
    PageGraderBrainSyncRepository,
    IntegrationConnectionsRepository,
  ],
  exports: [
    PageGraderApiService,
    PageGraderIntegration,
    PageGraderBrainSyncService,
    PageGraderSendWorkService,
    PageGraderMeetingSyncService,
  ],
})
export class PageGraderModule {}
