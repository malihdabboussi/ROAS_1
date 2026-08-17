import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PageGraderModule } from '../integrations/page-grader/page-grader.module'
import { SlackModule } from '../slack/slack.module'
import { UserAgentApiModule } from '../user-agent-api/user-agent-api.module'
import { WorkRequestController } from './controllers/work-request.controller'
import { WorkRequestRepository } from './repositories/work-request.repository'
import { WorkRequestChatService } from './services/work-request-chat.service'
import { WorkRequestScopeService } from './services/work-request-scope.service'
import { WorkRequestService } from './services/work-request.service'

@Module({
  imports: [ConfigModule, PageGraderModule, SlackModule, UserAgentApiModule],
  controllers: [WorkRequestController],
  providers: [
    WorkRequestRepository,
    WorkRequestScopeService,
    WorkRequestService,
    WorkRequestChatService,
  ],
  exports: [WorkRequestService],
})
export class WorkRequestsModule {}
