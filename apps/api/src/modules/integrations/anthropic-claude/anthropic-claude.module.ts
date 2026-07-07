import { Module } from '@nestjs/common'
import { AnthropicClaudeController } from './controllers/anthropic-claude.controller'
import { AnthropicClaudeRepository } from './repositories/anthropic-claude.repository'
import { AnthropicClaudeService } from './services/anthropic-claude.service'

@Module({
  controllers: [AnthropicClaudeController],
  providers: [AnthropicClaudeRepository, AnthropicClaudeService],
  exports: [AnthropicClaudeService],
})
export class AnthropicClaudeModule {}
