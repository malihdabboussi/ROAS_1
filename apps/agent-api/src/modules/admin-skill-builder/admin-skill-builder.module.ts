import { Module } from '@nestjs/common'
import { ChatModule } from '../chat/chat.module'
import { AdminSkillBuilderController } from './controllers/admin-skill-builder.controller'
import { AdminSkillBuilderChatService } from './services/admin-skill-builder-chat.service'
import { AdminSkillBuilderContextService } from './services/admin-skill-builder-context.service'

@Module({
  imports: [ChatModule],
  controllers: [AdminSkillBuilderController],
  providers: [AdminSkillBuilderChatService, AdminSkillBuilderContextService],
  exports: [AdminSkillBuilderContextService],
})
export class AdminSkillBuilderModule {}
