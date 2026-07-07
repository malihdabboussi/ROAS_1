import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingModule } from '../../billing/billing.module'
import { SearchApiService } from './services/searchapi-api.service'

@Module({
  imports: [ConfigModule, BillingModule],
  providers: [SearchApiService],
  exports: [SearchApiService],
})
export class SearchApiModule {}
