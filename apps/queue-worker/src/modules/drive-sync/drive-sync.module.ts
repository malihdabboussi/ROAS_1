import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { DriveSyncInternalController } from './controllers/drive-sync-internal.controller'
import { DriveSyncQueue } from './drive-sync.queue'
import { DriveSyncProcessor } from './processors/drive-sync.processor'
import { DriveSyncScheduler } from './services/drive-sync.scheduler'
import { DriveSyncService } from './services/drive-sync.service'
import { DRIVE_SYNC_QUEUE } from './types/drive-sync.types'

@Module({
  imports: [
    BullModule.registerQueue({
      name: DRIVE_SYNC_QUEUE,
    }),
  ],
  controllers: [DriveSyncInternalController],
  providers: [DriveSyncQueue, DriveSyncProcessor, DriveSyncScheduler, DriveSyncService],
  exports: [DriveSyncService],
})
export class DriveSyncModule {}
