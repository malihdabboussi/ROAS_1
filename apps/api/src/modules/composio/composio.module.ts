import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SharedModule } from '@vibey/api-shared'
import { BillingModule } from '../billing/billing.module'
import { ComposioRepository } from './repositories/composio.repository'
import { ComposioService } from './services/composio.service'

@Module({
  imports: [BillingModule, ConfigModule, SharedModule],
  providers: [ComposioService, ComposioRepository],
  exports: [ComposioService],
})
export class ComposioModule {}
