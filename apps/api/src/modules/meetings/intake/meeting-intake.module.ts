import { Module } from '@nestjs/common'
import { BillingModule } from '../../billing/billing.module'
import { BrainModule } from '../../brain/brain.module'
import { SpacesModule } from '../../spaces/spaces.module'
import { MeetingProvidersModule } from '../providers/meeting-providers.module'
import { MeetingImportsController } from './controllers/meeting-imports.controller'
import { MeetingWebhooksController } from './controllers/meeting-webhooks.controller'
import { MeetingIntakeRepository } from './repositories/meeting-intake.repository'
import { MeetingWebhookDeliveriesRepository } from './repositories/meeting-webhook-deliveries.repository'
import { MeetingImportService } from './services/meeting-import.service'
import { MeetingIntakeService } from './services/meeting-intake.service'

@Module({
  imports: [BillingModule, BrainModule, SpacesModule, MeetingProvidersModule],
  controllers: [MeetingWebhooksController, MeetingImportsController],
  providers: [
    MeetingIntakeRepository,
    MeetingWebhookDeliveriesRepository,
    MeetingIntakeService,
    MeetingImportService,
  ],
  exports: [MeetingIntakeService, MeetingImportService],
})
export class MeetingIntakeModule {}
