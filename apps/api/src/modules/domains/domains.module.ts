import { Module } from '@nestjs/common'
import { VercelDeployService } from '../projects/services/vercel-deploy.service'
import { DomainConnectController } from './controllers/domain-connect.controller'
import { DomainGenerateController } from './controllers/domain-generate.controller'
import { DomainVerifyController } from './controllers/domain-verify.controller'
// Controllers
import { DomainsController } from './controllers/domains.controller'
// Integrations
import { CloudflareIntegration } from './integrations/cloudflare.integration'
import { VercelIntegration } from './integrations/vercel.integration'
import { DomainsCacheRepository } from './repositories/domains-cache.repository'
// Repositories
import { DomainsRepository } from './repositories/domains.repository'
import { DomainConnectionService } from './services/domain-connection.service'
import { DomainOrchestrationService } from './services/domain-orchestration.service'
import { DomainProjectConnectionService } from './services/domain-project-connection.service'
import { DomainVerificationService } from './services/domain-verification.service'
// Services
import { DomainsService } from './services/domains.service'

@Module({
  controllers: [
    DomainsController,
    DomainGenerateController,
    DomainVerifyController,
    DomainConnectController,
  ],
  providers: [
    // Integrations
    CloudflareIntegration,
    VercelIntegration,
    // Repositories
    DomainsRepository,
    DomainsCacheRepository,
    // Services
    DomainsService,
    DomainOrchestrationService,
    DomainVerificationService,
    DomainConnectionService,
    DomainProjectConnectionService,
    VercelDeployService,
  ],
  exports: [DomainOrchestrationService, DomainsService],
})
export class DomainsModule {}
