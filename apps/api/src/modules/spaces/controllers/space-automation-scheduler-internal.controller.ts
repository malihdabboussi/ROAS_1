import {
  Controller,
  Get,
  Headers,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
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

  @Get('dispatch-due')
  async dispatchDue(@Headers('authorization') authorization?: string) {
    const cronSecret = this.assertCronAuthorization(authorization)
    const configuredUrl =
      this.config.get<string>('PUBLIC_API_URL') ??
      process.env.PUBLIC_API_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null)
    if (!configuredUrl) {
      throw new ServiceUnavailableException('Missing public API URL for cron dispatch')
    }
    const response = await fetch(
      `${configuredUrl.replace(/\/$/, '')}/api/internal/space-automations/process-due`,
      {
        headers: {
          authorization: `Bearer ${cronSecret}`,
          'x-space-automation-dispatch': 'vercel-cron',
        },
      },
    )
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Automation cron dispatch failed with status ${response.status}`,
      )
    }
    return { dispatched: true }
  }

  private assertCronAuthorization(authorization?: string): string {
    const cronSecret = this.config.get<string>('CRON_SECRET') ?? process.env.CRON_SECRET
    if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
      throw new UnauthorizedException('Invalid cron secret')
    }
    return cronSecret
  }
}
