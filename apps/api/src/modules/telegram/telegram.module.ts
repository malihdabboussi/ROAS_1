import { Module } from '@nestjs/common'
import { BrainModule } from '../brain/brain.module'
import { LeadsModule } from '../leads/leads.module'
import { MachinesModule } from '../machines/machines.module'
import { UserAgentApiModule } from '../user-agent-api/user-agent-api.module'
import { TelegramController, TelegramWebhookController } from './controllers/telegram.controller'
import { TelegramApiIntegration } from './integrations/telegram-api.integration'
import { TelegramRepository } from './repositories/telegram.repository'
import { TelegramRuntimeRepository } from './repositories/telegram-runtime.repository'
import { TelegramService } from './services/telegram.service'

@Module({
  imports: [MachinesModule, BrainModule, LeadsModule, UserAgentApiModule],
  controllers: [TelegramController, TelegramWebhookController],
  providers: [TelegramService, TelegramRepository, TelegramRuntimeRepository, TelegramApiIntegration],
  exports: [TelegramService],
})
export class TelegramModule {}
