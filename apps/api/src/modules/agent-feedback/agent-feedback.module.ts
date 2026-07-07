import { Module } from '@nestjs/common'
import { ConversationsModule } from '../conversations/conversations.module'
import { AgentFeedbackController } from './controllers/agent-feedback.controller'
import { AgentFeedbackRepository } from './repositories/agent-feedback.repository'
import { AgentFeedbackService } from './services/agent-feedback.service'

@Module({
  imports: [ConversationsModule],
  controllers: [AgentFeedbackController],
  providers: [AgentFeedbackService, AgentFeedbackRepository],
  exports: [AgentFeedbackService, AgentFeedbackRepository],
})
export class AgentFeedbackModule {}
