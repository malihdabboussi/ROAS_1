import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CreditsGuard } from './guards/credits.guard'
import { BillingCreditsRepository } from './repositories/billing-credits.repository'
import { CreditsBalanceService } from './services/credits-balance.service'
import { CreditsPricingService } from './services/credits-pricing.service'
import { CreditsService } from './services/credits.service'
import { CreditsTranscriptService } from './services/credits-transcript.service'
import { CreditsUsageProcessingService } from './services/credits-usage-processing.service'
import { ProviderBillingAttemptsService } from './services/provider-billing-attempts.service'

/**
 * BillingModule (Agent Backend — credits only, no Stripe, no UI)
 *
 * Provides CreditsGuard for pre-request credit checks and
 * CreditsService for post-response usage calculation + deduction.
 *
 * SANCTIONED EXCEPTION: Uses SUPABASE_SERVICE_ROLE_KEY because
 * credit operations span multiple tables and need cross-user writes.
 *
 * No BillingController or StripeService — those stay in Platform Backend.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    BillingCreditsRepository,
    CreditsTranscriptService,
    CreditsPricingService,
    CreditsBalanceService,
    CreditsUsageProcessingService,
    CreditsService,
    ProviderBillingAttemptsService,
    CreditsGuard,
  ],
  exports: [CreditsService, CreditsGuard, ProviderBillingAttemptsService],
})
export class AgentBillingModule {}
