import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GoHighLevelController } from './controllers/gohighlevel.controller'
import { GoHighLevelIntegration } from './integrations/gohighlevel.integration'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { GoHighLevelOAuthService } from './services/gohighlevel-oauth.service'

@Module({
  imports: [ConfigModule],
  controllers: [GoHighLevelController],
  providers: [GoHighLevelIntegration, IntegrationConnectionsRepository, GoHighLevelOAuthService],
  exports: [GoHighLevelIntegration, GoHighLevelOAuthService],
})
export class GoHighLevelModule {}
