import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MeetingActionReconciliationService } from '../services/meeting-action-reconciliation.service'

@Controller('internal/meeting-action-reconciliation')
export class MeetingActionReconciliationController {
  constructor(
    private readonly reconciliation: MeetingActionReconciliationService,
    private readonly config: ConfigService,
  ) {}

  @Post('run')
  run(@Headers('authorization') authorization?: string) {
    const secret = this.config.get<string>('CRON_SECRET') ?? process.env.CRON_SECRET
    if (!secret || authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid cron secret')
    }
    return this.reconciliation.reconcile()
  }
}
