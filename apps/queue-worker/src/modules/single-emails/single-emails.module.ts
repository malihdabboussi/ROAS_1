import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { SingleEmailProcessor } from './processors/single-email.processor'
import { SingleEmailScheduler } from './services/single-email.scheduler'
import { SingleEmailService } from './services/single-email.service'
import { SINGLE_EMAILS_QUEUE } from './types'

@Module({
  imports: [
    BullModule.registerQueue({
      name: SINGLE_EMAILS_QUEUE,
    }),
  ],
  providers: [SingleEmailProcessor, SingleEmailService, SingleEmailScheduler],
})
export class SingleEmailsModule {}
