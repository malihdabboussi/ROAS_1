import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingModule } from '../../billing/billing.module'
import { BrainModule } from '../../brain/brain.module'
import { MeetingIntakeModule } from '../../meetings/intake/meeting-intake.module'
import { MeetingProvidersModule } from '../../meetings/providers/meeting-providers.module'
import { FirefliesController } from './controllers/fireflies.controller'
import { FirefliesIntegration } from './integrations/fireflies.integration'
import { FirefliesTranscriptProvider } from './providers/fireflies-transcript-provider'
import { FirefliesRepository } from './repositories/fireflies.repository'
import { FirefliesApiService } from './services/fireflies-api.service'

@Module({
  imports: [ConfigModule, BillingModule, BrainModule, MeetingProvidersModule, MeetingIntakeModule],
  controllers: [FirefliesController],
  providers: [
    FirefliesIntegration,
    FirefliesApiService,
    FirefliesRepository,
    FirefliesTranscriptProvider,
  ],
  exports: [FirefliesIntegration, FirefliesApiService],
})
export class FirefliesModule {}
