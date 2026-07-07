import { Module } from '@nestjs/common'
import { SlackSyncScheduler } from './services/slack-sync.scheduler'
import { SlackSyncService } from './services/slack-sync.service'

@Module({
  providers: [SlackSyncScheduler, SlackSyncService],
  exports: [SlackSyncService],
})
export class SlackSyncModule {}
