import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SpaceAutomationSchedulerService } from '../services/space-automation-scheduler.service'

@Controller('internal/space-automations')
export class SpaceAutomationSchedulerInternalController {
  constructor(
    private readonly scheduler: SpaceAutomationSchedulerService,
    private readonly config: ConfigService,
  ) {}

  @Get('process-due')
  async processDue(@Headers('authorization') authorization?: string) {
    this.assertCronAuthorization(authorization)
    await this.scheduler.processDueSchedules()
    return { processed: true }
  }

  private assertCronAuthorization(authorization?: string): string {
    const cronSecret = this.config.get<string>('CRON_SECRET') ?? process.env.CRON_SECRET
    if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
      throw new UnauthorizedException('Invalid cron secret')
    }
    return cronSecret
  }
}
