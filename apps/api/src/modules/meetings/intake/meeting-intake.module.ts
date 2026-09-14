import { Module } from '@nestjs/common'
import { BrainModule } from '../../brain/brain.module'
import { SpacesModule } from '../../spaces/spaces.module'
import { MeetingProvidersModule } from '../providers/meeting-providers.module'
import { MeetingWebhooksController } from './controllers/meeting-webhooks.controller'
import { MeetingIntakeRepository } from './repositories/meeting-intake.repository'
import { MeetingWebhookDeliveriesRepository } from './repositories/meeting-webhook-deliveries.repository'
import { MeetingIntakeService } from './services/meeting-intake.service'

@Module({
  imports: [BrainModule, SpacesModule, MeetingProvidersModule],
  controllers: [MeetingWebhooksController],
  providers: [MeetingIntakeRepository, MeetingWebhookDeliveriesRepository, MeetingIntakeService],
  exports: [MeetingIntakeService],
})
export class MeetingIntakeModule {}
