import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { BroadcastEmailProcessor } from './processors/broadcast-email.processor'
import { BroadcastEmailScheduler } from './services/broadcast-email.scheduler'
import { BroadcastEmailService } from './services/broadcast-email.service'
import { BROADCAST_EMAILS_QUEUE } from './types'

@Module({
  imports: [
    BullModule.registerQueue({
      name: BROADCAST_EMAILS_QUEUE,
    }),
  ],
  providers: [BroadcastEmailProcessor, BroadcastEmailService, BroadcastEmailScheduler],
})
export class BroadcastEmailsModule {}
