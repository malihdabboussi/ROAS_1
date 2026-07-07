import { Module } from '@nestjs/common'
import { VercelIntegration } from '../domains/integrations/vercel.integration'
import { SpacesModule } from '../spaces/spaces.module'
import { FunnelConversionPointsController } from './controllers/funnel-conversion-points.controller'
import { FunnelHistoryController } from './controllers/funnel-history.controller'
import { FunnelPagesController } from './controllers/funnel-pages.controller'
import { FunnelsController } from './controllers/funnels.controller'
import { InternalFunnelsController } from './controllers/internal-funnels.controller'
import { PreviewController } from './controllers/preview.controller'
import { InternalAuthGuard } from './guards/internal-auth.guard'
import { FunnelFilesRepository } from './repositories/funnel-files.repository'
import { FunnelHistoryRepository } from './repositories/funnel-history.repository'
import { FunnelPagesRepository } from './repositories/funnel-pages.repository'
import { FunnelRuntimeRepository } from './repositories/funnel-runtime.repository'
import { FunnelsRepository } from './repositories/funnels.repository'
import { FunnelHistoryService } from './services/funnel-history.service'
import { FunnelPublishService } from './services/funnel-publish.service'
import { FunnelsService } from './services/funnels.service'

@Module({
  imports: [SpacesModule],
  controllers: [
    FunnelsController,
    FunnelPagesController,
    FunnelHistoryController,
    FunnelConversionPointsController,
    PreviewController,
    InternalFunnelsController,
  ],
  providers: [
    FunnelsService,
    FunnelPublishService,
    FunnelHistoryService,
    FunnelsRepository,
    FunnelPagesRepository,
    FunnelRuntimeRepository,
    FunnelFilesRepository,
    FunnelHistoryRepository,
    InternalAuthGuard,
    VercelIntegration,
  ],
  exports: [FunnelsService, FunnelsRepository, FunnelPagesRepository, FunnelRuntimeRepository],
})
export class FunnelsModule {}
