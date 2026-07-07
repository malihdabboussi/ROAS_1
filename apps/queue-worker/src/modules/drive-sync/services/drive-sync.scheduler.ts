import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { DriveSyncService } from './drive-sync.service'

@Injectable()
export class DriveSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DriveSyncScheduler.name)
  private interval: NodeJS.Timeout | null = null

  constructor(private readonly driveSyncService: DriveSyncService) {}

  onModuleInit() {
    this.interval = setInterval(() => void this.tick(), 60_000)
    void this.tick()
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval)
  }

  private async tick(): Promise<void> {
    const [enqueued, renewed] = await Promise.all([
      this.driveSyncService.enqueueDueMappings(),
      this.driveSyncService.renewDuePushChannels(),
    ])
    if (enqueued > 0) {
      this.logger.log(`Enqueued ${enqueued} drive sync job(s)`)
    }
    if (renewed > 0) {
      this.logger.log(`Renewed ${renewed} drive push channel(s)`)
    }
  }
}
