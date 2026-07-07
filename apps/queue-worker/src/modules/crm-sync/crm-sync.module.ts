import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { CrmSyncProcessor } from './processors/crm-sync.processor'
import { CrmSyncScheduler } from './services/crm-sync.scheduler'
import { CrmSyncService } from './services/crm-sync.service'
import { CRM_SYNC_QUEUE } from './types/crm-sync.types'

@Module({
  imports: [
    BullModule.registerQueue({
      name: CRM_SYNC_QUEUE,
    }),
  ],
  providers: [CrmSyncProcessor, CrmSyncService, CrmSyncScheduler],
})
export class CrmSyncModule {}
