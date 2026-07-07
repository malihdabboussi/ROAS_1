import { Module } from '@nestjs/common'
import { BillingModule } from '../billing/billing.module'
import { TranscribeController } from './controllers/transcribe.controller'
import { DeepgramIntegration } from './integrations/deepgram.integration'
import { TranscribeService } from './services/transcribe.service'

@Module({
  imports: [BillingModule],
  controllers: [TranscribeController],
  providers: [TranscribeService, DeepgramIntegration],
  exports: [TranscribeService],
})
export class TranscribeModule {}
