import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { SlackSyncService } from './slack-sync.service'

@Injectable()
export class SlackSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SlackSyncScheduler.name)
  private interval: NodeJS.Timeout | null = null

  constructor(private readonly slackSyncService: SlackSyncService) {}

  onModuleInit() {
    this.interval = setInterval(() => void this.tick(), 60_000)
    void this.tick()
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval)
  }

  private async tick(): Promise<void> {
    const enqueued = await this.slackSyncService.enqueueDueMappings()
    if (enqueued > 0) {
      this.logger.log(`Enqueued ${enqueued} Slack brain sync job(s)`)
    }
  }
}
