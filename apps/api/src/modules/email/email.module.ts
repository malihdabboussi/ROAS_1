import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DomainReplyTrackingController } from './controllers/domain-reply-tracking.controller'
import { DomainStatusController } from './controllers/domain-status.controller'
import { DomainsController } from './controllers/domains.controller'
import { EmailArtifactsController } from './controllers/email-artifacts.controller'
import { EmailLogsController } from './controllers/email-logs.controller'
import { SenderIdentitySyncController } from './controllers/sender-identity-sync.controller'
import { SenderIdentitiesController } from './controllers/sender-identities.controller'
import { UnsubscribeController } from './controllers/unsubscribe.controller'
import { WebhooksController } from './controllers/webhooks.controller'
import { SendGridIntegration } from './integrations/sendgrid.integration'
import { EmailArtifactsRepository } from './repositories/email-artifacts.repository'
import { EmailDomainsRepository } from './repositories/email-domains.repository'
import { EmailRuntimeRepository } from './repositories/email-runtime.repository'
import { EmailSenderIdentitiesRepository } from './repositories/email-sender-identities.repository'
import { DomainAuthService } from './services/domain-auth.service'
import { EmailArtifactsService } from './services/email-artifacts.service'
import { EmailLogsService } from './services/email-logs.service'
import { EmailOutboundFooterService } from './services/email-outbound-footer.service'
import { EmailUnsubscribeService } from './services/email-unsubscribe.service'
import { EmailWebhookEventsService } from './services/email-webhook-events.service'
import { SenderIdentityService } from './services/sender-identity.service'

@Module({
  imports: [ConfigModule],
  controllers: [
    DomainsController,
    DomainReplyTrackingController,
    DomainStatusController,
    EmailArtifactsController,
    EmailLogsController,
    SenderIdentitiesController,
    SenderIdentitySyncController,
    UnsubscribeController,
    WebhooksController,
  ],
  providers: [
    SendGridIntegration,
    EmailDomainsRepository,
    EmailSenderIdentitiesRepository,
    EmailRuntimeRepository,
    EmailArtifactsRepository,
    EmailArtifactsService,
    EmailLogsService,
    EmailOutboundFooterService,
    EmailUnsubscribeService,
    EmailWebhookEventsService,
    DomainAuthService,
    SenderIdentityService,
  ],
  exports: [
    DomainAuthService,
    SenderIdentityService,
    SendGridIntegration,
    EmailOutboundFooterService,
    EmailArtifactsService,
    EmailRuntimeRepository,
    EmailArtifactsRepository,
  ],
})
export class EmailModule {}
