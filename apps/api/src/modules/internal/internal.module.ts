import { Module } from '@nestjs/common'
import { BillingModule } from '../billing/billing.module'
import { BrainModule } from '../brain/brain.module'
import { FathomModule } from '../integrations/fathom/fathom.module'
import { PageGraderModule } from '../integrations/page-grader/page-grader.module'
import { MediaModule } from '../media/media.module'
import { InternalBillingReconciliationController } from './controllers/internal-billing-reconciliation.controller'
import { InternalBrainImportJobsController } from './controllers/internal-brain-import-jobs.controller'
import { InternalBrainNodesController } from './controllers/internal-brain-nodes.controller'
import { InternalFathomImportJobsController } from './controllers/internal-fathom-import-jobs.controller'
import { InternalMediaBillingController } from './controllers/internal-media-billing.controller'
import { InternalPageGraderBrainSyncController } from './controllers/internal-page-grader-brain-sync.controller'
import { InternalPageGraderClientImportController } from './controllers/internal-page-grader-client-import.controller'
import { InternalController } from './controllers/internal.controller'
import { InternalRepository } from './repositories/internal.repository'
import { InternalBillingReconciliationService } from './services/internal-billing-reconciliation.service'
import { InternalBrainService } from './services/internal-brain.service'
import { InternalService } from './services/internal.service'

@Module({
  imports: [MediaModule, BillingModule, BrainModule, FathomModule, PageGraderModule],
  controllers: [
    InternalController,
    InternalMediaBillingController,
    InternalFathomImportJobsController,
    InternalBrainImportJobsController,
    InternalBrainNodesController,
    InternalBillingReconciliationController,
    InternalPageGraderClientImportController,
    InternalPageGraderBrainSyncController,
  ],
  providers: [
    InternalService,
    InternalBrainService,
    InternalBillingReconciliationService,
    InternalRepository,
  ],
})
export class InternalModule {}
