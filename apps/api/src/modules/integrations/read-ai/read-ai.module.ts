import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MeetingIntakeModule } from '../../meetings/intake/meeting-intake.module'
import { MeetingProvidersModule } from '../../meetings/providers/meeting-providers.module'
import { ReadAiController } from './controllers/read-ai.controller'
import { ReadAiTranscriptProvider } from './providers/read-ai-transcript-provider'
import { ReadAiApiService } from './services/read-ai-api.service'

@Module({
  imports: [ConfigModule, MeetingProvidersModule, MeetingIntakeModule],
  controllers: [ReadAiController],
  providers: [ReadAiApiService, ReadAiTranscriptProvider],
  exports: [ReadAiApiService],
})
export class ReadAiModule {}
