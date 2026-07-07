import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingModule } from '../billing/billing.module'
import { EmailModule } from '../email/email.module'
import { MachinesModule } from '../machines/machines.module'
import { MissionsModule } from '../missions/missions.module'
import { TransferModule } from '../transfer/transfer.module'
import { OrgAgentImportsController } from './controllers/org-agent-imports.controller'
import { OrgBillingAnalyticsController } from './controllers/org-billing-analytics.controller'
import { OrgBillingCheckoutController } from './controllers/org-billing-checkout.controller'
import { OrgBillingStatusController } from './controllers/org-billing-status.controller'
import { OrgBrainSharingLegacyController } from './controllers/org-brain-sharing-legacy.controller'
import { OrgInvitationsController } from './controllers/org-invitations.controller'
import { OrgMembersController } from './controllers/org-members.controller'
import { OrgSharingController } from './controllers/org-sharing.controller'
import { OrgTransfersController } from './controllers/org-transfers.controller'
import { OrgController } from './controllers/org.controller'
import { OrgAgentImportRepository } from './repositories/org-agent-import.repository'
import { OrgBillingRepository } from './repositories/org-billing.repository'
import { OrgInvitationDeliveryRepository } from './repositories/org-invitation-delivery.repository'
import { OrgSharingRepository } from './repositories/org-sharing.repository'
import { OrgSetupRepository } from './repositories/org-setup.repository'
import { OrgStripeRepository } from './repositories/org-stripe.repository'
import { OrgRepository } from './repositories/org.repository'
import { OrgAgentImportService } from './services/org-agent-import.service'
import { OrgBillingService } from './services/org-billing.service'
import { OrgInvitationService } from './services/org-invitation.service'
import { OrgSharingService } from './services/org-sharing.service'
import { OrgStripeService } from './services/org-stripe.service'
import { OrgService } from './services/org.service'

@Module({
  imports: [
    ConfigModule,
    BillingModule,
    EmailModule,
    MachinesModule,
    forwardRef(() => MissionsModule),
    TransferModule,
  ],
  controllers: [
    OrgController,
    OrgMembersController,
    OrgTransfersController,
    OrgAgentImportsController,
    OrgBrainSharingLegacyController,
    OrgInvitationsController,
    OrgBillingStatusController,
    OrgBillingAnalyticsController,
    OrgBillingCheckoutController,
    OrgSharingController,
  ],
  providers: [
    OrgService,
    OrgInvitationService,
    OrgBillingService,
    OrgAgentImportService,
    OrgStripeService,
    OrgSharingService,
    OrgAgentImportRepository,
    OrgBillingRepository,
    OrgInvitationDeliveryRepository,
    OrgSharingRepository,
    OrgSetupRepository,
    OrgStripeRepository,
    OrgRepository,
  ],
  exports: [
    OrgService,
    OrgInvitationService,
    OrgBillingService,
    OrgAgentImportService,
    OrgStripeService,
    OrgSharingService,
    OrgAgentImportRepository,
    OrgBillingRepository,
    OrgInvitationDeliveryRepository,
    OrgSharingRepository,
    OrgSetupRepository,
    OrgStripeRepository,
    OrgRepository,
  ],
})
export class OrgModule {}
