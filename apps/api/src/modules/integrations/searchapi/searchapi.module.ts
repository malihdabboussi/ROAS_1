import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingModule } from '../../billing/billing.module'
import { SearchApiController } from './controllers/searchapi.controller'
import { SearchApiAgentService } from './services/searchapi-agent.service'
import { SearchApiService } from './services/searchapi-api.service'

@Module({
  imports: [ConfigModule, BillingModule],
  controllers: [SearchApiController],
  providers: [SearchApiService, SearchApiAgentService],
  exports: [SearchApiService],
})
export class SearchApiModule {}
