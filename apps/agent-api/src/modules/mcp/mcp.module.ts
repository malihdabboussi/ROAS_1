import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { McpRepository } from './repositories/mcp.repository'
import { McpConfigService } from './services/mcp-config.service'
import { McpConnectionService } from './services/mcp-connection.service'
import { McpToolService } from './services/mcp-tool.service'

@Module({
  imports: [ConfigModule],
  providers: [McpRepository, McpConnectionService, McpToolService, McpConfigService],
  exports: [McpConnectionService, McpToolService, McpConfigService],
})
export class McpModule {}
