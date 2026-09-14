import { Module } from '@nestjs/common'
import { BillingModule } from '../../billing/billing.module'
import { BrainModule } from '../../brain/brain.module'
import { SpaceTemplatesModule } from '../../space-templates/space-templates.module'
import { SpacesModule } from '../../spaces/spaces.module'
import { MeetingProvidersModule } from '../providers/meeting-providers.module'
import { MeetingImportsController } from './controllers/meeting-imports.controller'
import { MeetingWebhooksController } from './controllers/meeting-webhooks.controller'
import { MeetingIntakeRepository } from './repositories/meeting-intake.repository'
import { MeetingWebhookDeliveriesRepository } from './repositories/meeting-webhook-deliveries.repository'
import { MeetingImportService } from './services/meeting-import.service'
import { MeetingIntakeService } from './services/meeting-intake.service'
import { MeetingsSpaceBootstrapService } from './services/meetings-space-bootstrap.service'

@Module({
  imports: [BillingModule, BrainModule, SpacesModule, SpaceTemplatesModule, MeetingProvidersModule],
  controllers: [MeetingWebhooksController, MeetingImportsController],
  providers: [
    MeetingIntakeRepository,
    MeetingWebhookDeliveriesRepository,
    MeetingIntakeService,
    MeetingImportService,
    MeetingsSpaceBootstrapService,
  ],
  exports: [
    MeetingIntakeService,
    MeetingImportService,
    MeetingIntakeRepository,
    MeetingsSpaceBootstrapService,
  ],
})
export class MeetingIntakeModule {}
