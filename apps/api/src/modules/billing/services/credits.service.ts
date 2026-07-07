/**
 * Credits Service
 *
 * Injectable facade for credit calculation, deduction, and balance checks.
 */

import { Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ErrorReporter } from '@vibey/api-shared'
import { BillingCreditsAutoRechargeRepository } from '../repositories/billing-credits-auto-recharge.repository'
import { BillingCreditsRepository } from '../repositories/billing-credits.repository'
import { CreditsProcessingBase } from './credits-service-processing.base'
export type {
  AutoRechargeConfig,
  CreditBalance,
  CreditCalculation,
  CreditsOwnerResolution,
  MonthlyCreditUsageRow,
  OrgAutoRechargeConfig,
  TextBillingContext,
  TextPricingTierRow,
  TextPricingTierSelection,
  TokenUsage,
} from './credits.types'

@Injectable()
export class CreditsService extends CreditsProcessingBase {
  constructor(
    configService: ConfigService,
    errorReporter: ErrorReporter,
    @Optional() creditsRepository?: BillingCreditsRepository,
    @Optional() creditsAutoRechargeRepository?: BillingCreditsAutoRechargeRepository,
  ) {
    const billingCreditsRepository =
      creditsRepository ?? new BillingCreditsRepository(configService)
    super(
      configService,
      errorReporter,
      billingCreditsRepository,
      creditsAutoRechargeRepository ??
        new BillingCreditsAutoRechargeRepository(billingCreditsRepository),
    )
  }
}
