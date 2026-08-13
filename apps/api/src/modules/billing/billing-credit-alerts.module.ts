import { Module } from '@nestjs/common'
import { SlackModule } from '../slack/slack.module'
import { BillingModule } from './billing.module'
import { BillingCreditAlertInternalController } from './controllers/billing-credit-alert-internal.controller'
import { BillingCreditAlertRepository } from './repositories/billing-credit-alert.repository'
import { BillingCreditAlertService } from './services/billing-credit-alert.service'

@Module({
  imports: [BillingModule, SlackModule],
  controllers: [BillingCreditAlertInternalController],
  providers: [BillingCreditAlertRepository, BillingCreditAlertService],
})
export class BillingCreditAlertsModule {}
