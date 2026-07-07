import { Module } from '@nestjs/common'
import { BillingModule } from '../billing/billing.module'
import { SpaceRetrievalModule } from '../space-retrieval/space-retrieval.module'
import { SpaceItemActivityRepository } from '../spaces/repositories/space-item-activity.repository'
import { SpaceItemsRepository } from '../spaces/repositories/space-items.repository'
import { SpaceViewOverridesRepository } from '../spaces/repositories/space-view-overrides.repository'
import { SpacesRepository } from '../spaces/repositories/spaces.repository'
import { UserAgentApiModule } from '../user-agent-api/user-agent-api.module'
import { ChannelMembersController } from './controllers/channel-members.controller'
import { ChannelMessagesController } from './controllers/channel-messages.controller'
import { ChannelsController } from './controllers/channels.controller'
import { ChannelMembershipsRepository } from './repositories/channel-memberships.repository'
import { ChannelRuntimeRepository } from './repositories/channel-runtime.repository'
import { ChannelUserStateRepository } from './repositories/channel-user-state.repository'
import { ChannelsRepository } from './repositories/channels.repository'
import { ChannelAgentInvocationService } from './services/channel-agent-invocation.service'
import { ChannelManagementService } from './services/channel-management.service'
import { ChannelMessagesService } from './services/channel-messages.service'
import { ChannelsService } from './services/channels.service'

@Module({
  imports: [BillingModule, UserAgentApiModule, SpaceRetrievalModule],
  controllers: [ChannelsController, ChannelMembersController, ChannelMessagesController],
  providers: [
    ChannelsService,
    ChannelMembershipsRepository,
    ChannelRuntimeRepository,
    ChannelUserStateRepository,
    ChannelsRepository,
    ChannelAgentInvocationService,
    ChannelManagementService,
    ChannelMessagesService,
    SpaceItemsRepository,
    SpaceItemActivityRepository,
    SpaceViewOverridesRepository,
    SpacesRepository,
  ],
  exports: [ChannelsService, ChannelsRepository],
})
export class ChannelsModule {}
