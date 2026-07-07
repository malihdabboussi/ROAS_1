import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { OpenAICodexController } from './controllers/openai-codex.controller'
import { OpenAICodexIntegration } from './integrations/openai-codex.integration'
import { OpenAICodexRepository } from './repositories/openai-codex.repository'
import { OpenAICodexOAuthService } from './services/openai-codex-oauth.service'

@Module({
  imports: [ConfigModule],
  controllers: [OpenAICodexController],
  providers: [OpenAICodexIntegration, OpenAICodexRepository, OpenAICodexOAuthService],
  exports: [OpenAICodexOAuthService],
})
export class OpenAICodexModule {}
