import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingModule } from '../../billing/billing.module'
import { DataForSeoController } from './controllers/dataforseo.controller'
import { DataForSeoApiService } from './services/dataforseo-api.service'
import { DataForSeoUsageService } from './services/dataforseo-usage.service'

@Module({
  imports: [ConfigModule, BillingModule],
  controllers: [DataForSeoController],
  providers: [DataForSeoApiService, DataForSeoUsageService],
  exports: [DataForSeoApiService],
})
export class DataForSeoModule {}
