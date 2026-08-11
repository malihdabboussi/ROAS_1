import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BillingCreditAlertService } from '../services/billing-credit-alert.service'

@Controller('internal/billing-credit-alerts')
export class BillingCreditAlertInternalController {
  constructor(
    private readonly alerts: BillingCreditAlertService,
    private readonly config: ConfigService,
  ) {}

  @Get('process-due')
  async processDue(@Headers('authorization') authorization?: string) {
    const cronSecret = this.config.get<string>('CRON_SECRET') ?? process.env.CRON_SECRET
    if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
      throw new UnauthorizedException('Invalid cron secret')
    }
    return this.alerts.processDueAlerts()
  }
}
