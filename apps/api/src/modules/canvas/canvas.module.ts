import { Module } from '@nestjs/common'
import { SharedModule } from '@vibey/api-shared'
import { BillingModule } from '../billing/billing.module'
import { CampaignsModule } from '../campaigns/campaigns.module'
import { MediaModule } from '../media/media.module'
import { UserAgentApiModule } from '../user-agent-api/user-agent-api.module'
import { CanvasDelegationController } from './controllers/canvas-delegation.controller'
import { CanvasController } from './controllers/canvas.controller'
import { CanvasRepository } from './repositories/canvas.repository'
import { CanvasDelegationService } from './services/canvas-delegation.service'
import { CanvasNodeActionsService } from './services/canvas-node-actions.service'
import { CanvasService } from './services/canvas.service'

@Module({
  imports: [SharedModule, CampaignsModule, MediaModule, UserAgentApiModule, BillingModule],
  controllers: [CanvasController, CanvasDelegationController],
  providers: [CanvasService, CanvasDelegationService, CanvasNodeActionsService, CanvasRepository],
  exports: [CanvasService],
})
export class CanvasModule {}
