import { Module } from '@nestjs/common'
import { McpOAuthController } from './controllers/mcp-oauth.controller'
import { McpController } from './controllers/mcp.controller'
import { McpOAuthConsentRepository } from './repositories/mcp-oauth-consent.repository'
import { McpOAuthRepository } from './repositories/mcp-oauth.repository'
import { McpServersRepository } from './repositories/mcp-servers.repository'
import { McpOAuthCleanupService } from './services/mcp-oauth-cleanup.service'
import { McpOAuthService } from './services/mcp-oauth.service'
import { McpProbeService } from './services/mcp-probe.service'
import { McpServersService } from './services/mcp-servers.service'

@Module({
  controllers: [McpController, McpOAuthController],
  providers: [
    McpProbeService,
    McpServersService,
    McpOAuthService,
    McpOAuthCleanupService,
    McpOAuthRepository,
    McpOAuthConsentRepository,
    McpServersRepository,
  ],
})
export class McpModule {}
