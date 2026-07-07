import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CalendlyEventTypesController } from './controllers/calendly-event-types.controller'
import { CalendlyScheduledEventsController } from './controllers/calendly-scheduled-events.controller'
import { CalendlyWebhookController } from './controllers/calendly-webhook.controller'
import { CalendlyController } from './controllers/calendly.controller'
import { CalendlyIntegration } from './integrations/calendly.integration'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { CalendlyApiService } from './services/calendly-api.service'
import { CalendlyOAuthService } from './services/calendly-oauth.service'

@Module({
  imports: [ConfigModule],
  controllers: [
    CalendlyController,
    CalendlyEventTypesController,
    CalendlyScheduledEventsController,
    CalendlyWebhookController,
  ],
  providers: [CalendlyIntegration, IntegrationConnectionsRepository, CalendlyOAuthService, CalendlyApiService],
  exports: [CalendlyIntegration, CalendlyOAuthService, CalendlyApiService],
})
export class CalendlyModule {}
