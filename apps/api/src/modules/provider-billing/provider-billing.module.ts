import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingModule } from '../billing/billing.module'
import { InternalProviderBillingController } from './controllers/internal-provider-billing.controller'
import { ProviderBillingRepository } from './repositories/provider-billing.repository'
import { OpenRouterBillingClientService } from './services/openrouter-billing-client.service'
import { ProviderBillingSettlementService } from './services/provider-billing-settlement.service'

@Module({
  imports: [ConfigModule, BillingModule],
  controllers: [InternalProviderBillingController],
  providers: [ProviderBillingRepository, ProviderBillingSettlementService, OpenRouterBillingClientService],
  exports: [ProviderBillingRepository, ProviderBillingSettlementService, OpenRouterBillingClientService],
})
export class ProviderBillingModule {}
