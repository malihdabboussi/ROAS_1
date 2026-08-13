import { Module } from '@nestjs/common'
import { SharedModule } from '@vibey/api-shared'
import { BillingModule } from '../billing/billing.module'
import { CampaignsModule } from '../campaigns/campaigns.module'
import { MediaModule } from '../media/media.module'
import { UserAgentApiModule } from '../user-agent-api/user-agent-api.module'
import { CanvasDelegationController } from './controllers/canvas-delegation.controller'
import { CampaignWhiteboardController } from './controllers/campaign-whiteboard.controller'
import { CanvasController } from './controllers/canvas.controller'
import { CanvasRepository } from './repositories/canvas.repository'
import { WhiteboardRepository } from './repositories/whiteboard.repository'
import { CanvasDelegationService } from './services/canvas-delegation.service'
import { CanvasNodeActionsService } from './services/canvas-node-actions.service'
import { CanvasService } from './services/canvas.service'
import { WhiteboardService } from './services/whiteboard.service'

@Module({
  imports: [SharedModule, CampaignsModule, MediaModule, UserAgentApiModule, BillingModule],
  controllers: [CampaignWhiteboardController, CanvasController, CanvasDelegationController],
  providers: [
    CanvasService,
    CanvasDelegationService,
    CanvasNodeActionsService,
    CanvasRepository,
    WhiteboardService,
    WhiteboardRepository,
  ],
  exports: [CanvasService],
})
export class CanvasModule {}
