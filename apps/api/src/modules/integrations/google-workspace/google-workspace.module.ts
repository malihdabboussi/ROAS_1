import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PageGraderModule } from '../page-grader/page-grader.module'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { GoogleWorkspaceController } from './controllers/google-workspace.controller'
import { GoogleWorkspaceGoogleClient } from './integrations/google-workspace-google.client'
import { GoogleWorkspaceRepository } from './repositories/google-workspace.repository'
import { OrgPersonCalendarIdentitiesRepository } from './repositories/org-person-calendar-identities.repository'
import { GoogleWorkspaceApiService } from './services/google-workspace-api.service'
import { GoogleWorkspaceCalendarService } from './services/google-workspace-calendar.service'
import { GoogleWorkspacePersonBriefingService } from './services/google-workspace-person-briefing.service'
import { OrgPersonCalendarIdentitiesService } from './services/org-person-calendar-identities.service'

@Module({
  imports: [ConfigModule, PageGraderModule],
  controllers: [GoogleWorkspaceController],
  providers: [
    IntegrationConnectionsRepository,
    GoogleWorkspaceGoogleClient,
    GoogleWorkspaceRepository,
    OrgPersonCalendarIdentitiesRepository,
    OrgPersonCalendarIdentitiesService,
    GoogleWorkspaceApiService,
    GoogleWorkspaceCalendarService,
    GoogleWorkspacePersonBriefingService,
  ],
  exports: [
    GoogleWorkspaceApiService,
    GoogleWorkspaceCalendarService,
    GoogleWorkspacePersonBriefingService,
    OrgPersonCalendarIdentitiesService,
  ],
})
export class GoogleWorkspaceModule {}
