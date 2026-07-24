import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { McpModule } from '../../mcp/mcp.module'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { HiggsfieldOAuthService } from './higgsfield-oauth.service'
import { HiggsfieldController } from './higgsfield.controller'
import { HiggsfieldRepository } from './higgsfield.repository'

@Module({
  imports: [ConfigModule, McpModule],
  controllers: [HiggsfieldController],
  providers: [HiggsfieldOAuthService, HiggsfieldRepository, IntegrationConnectionsRepository],
})
export class HiggsfieldModule {}
