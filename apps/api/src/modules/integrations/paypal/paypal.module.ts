import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PaypalController } from './controllers/paypal.controller'
import { PaypalIntegration } from './integrations/paypal.integration'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { PaypalApiService } from './services/paypal-api.service'
import { PaypalOAuthService } from './services/paypal-oauth.service'

@Module({
  imports: [ConfigModule],
  controllers: [PaypalController],
  providers: [PaypalIntegration, IntegrationConnectionsRepository, PaypalOAuthService, PaypalApiService],
  exports: [PaypalIntegration, PaypalOAuthService, PaypalApiService],
})
export class PaypalModule {}
