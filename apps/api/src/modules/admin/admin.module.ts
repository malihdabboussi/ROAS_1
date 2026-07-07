import { Module } from '@nestjs/common'
import { BillingModule } from '../billing/billing.module'
import { EmailModule } from '../email/email.module'
import { MachinesModule } from '../machines/machines.module'
import { AdminEnterpriseModule } from './admin-enterprise.module'
import { AdminInfrastructureController } from './controllers/admin-infrastructure.controller'
import { AdminInvitesController } from './controllers/admin-invites.controller'
import { AdminOperationsController } from './controllers/admin-operations.controller'
import { AdminPlatformEmailController } from './controllers/admin-platform-email.controller'
import { AdminController } from './controllers/admin.controller'
import { ImpersonationController } from './controllers/impersonation.controller'
import { AdminRepository } from './repositories/admin.repository'
import { AdminAccountDetailService } from './services/admin-account-detail.service'
import { AdminService } from './services/admin.service'
import { ImpersonationService } from './services/impersonation.service'
import { InstructionGovernanceService } from './services/instruction-governance.service'
import { UnitEconomicsService } from './services/unit-economics.service'

@Module({
  imports: [EmailModule, BillingModule, MachinesModule, AdminEnterpriseModule],
  controllers: [
    AdminController,
    AdminOperationsController,
    AdminInvitesController,
    AdminPlatformEmailController,
    AdminInfrastructureController,
    ImpersonationController,
  ],
  providers: [
    AdminRepository,
    AdminService,
    AdminAccountDetailService,
    ImpersonationService,
    InstructionGovernanceService,
    UnitEconomicsService,
  ],
  exports: [
    AdminRepository,
    AdminService,
    AdminAccountDetailService,
    ImpersonationService,
    InstructionGovernanceService,
    UnitEconomicsService,
  ],
})
export class AdminModule {}
