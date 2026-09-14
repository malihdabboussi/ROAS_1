import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BrainModule } from '../../brain/brain.module'
import { MeetingIntakeModule } from '../../meetings/intake/meeting-intake.module'
import { MeetingsModule } from '../../meetings/meetings.module'
import { MeetingProvidersModule } from '../../meetings/providers/meeting-providers.module'
import { SpaceTemplatesModule } from '../../space-templates/space-templates.module'
import { SpacesModule } from '../../spaces/spaces.module'
import { PageGraderModule } from '../page-grader/page-grader.module'
import { FathomMeetingsController } from './controllers/fathom-meetings.controller'
import { FathomWebhooksController } from './controllers/fathom-webhooks.controller'
import { FathomController } from './controllers/fathom.controller'
import { FathomIntegration } from './integrations/fathom.integration'
import { FathomTranscriptProvider } from './providers/fathom-transcript-provider'
import { FathomRepository } from './repositories/fathom.repository'
import { FathomApiService } from './services/fathom-api.service'
import { FathomCampaignBrainRouteService } from './services/fathom-campaign-brain-route.service'
import { FathomMeetingWorkspaceAttachService } from './services/fathom-meeting-workspace-attach.service'
import { FathomMeetingWorkspaceBackfillService } from './services/fathom-meeting-workspace-backfill.service'
import { FathomOAuthService } from './services/fathom-oauth.service'
import { FathomWebhookService } from './services/fathom-webhook.service'

@Module({
  imports: [
    ConfigModule,
    BrainModule,
    MeetingsModule,
    MeetingProvidersModule,
    MeetingIntakeModule,
    SpacesModule,
    SpaceTemplatesModule,
    PageGraderModule,
  ],
  controllers: [FathomController, FathomMeetingsController, FathomWebhooksController],
  providers: [
    FathomIntegration,
    FathomRepository,
    FathomOAuthService,
    FathomApiService,
    FathomCampaignBrainRouteService,
    FathomMeetingWorkspaceAttachService,
    FathomMeetingWorkspaceBackfillService,
    FathomWebhookService,
    FathomTranscriptProvider,
  ],
  exports: [
    FathomIntegration,
    FathomOAuthService,
    FathomApiService,
    FathomMeetingWorkspaceAttachService,
  ],
})
export class FathomModule {}
