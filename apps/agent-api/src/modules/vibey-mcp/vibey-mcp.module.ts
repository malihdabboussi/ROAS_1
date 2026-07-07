import { Module } from '@nestjs/common'
import { SharedModule } from '@vibey/api-shared'
import { ArtifactsModule } from '../artifacts/artifacts.module'
import { ConversationsModule } from '../conversations/conversations.module'
import { SharedContextModule } from '../shared/shared-context.module'
import { VibeyMcpController } from './controllers/vibey-mcp.controller'
import { VibeyMcpOAuthGuard } from './guards/vibey-mcp-oauth.guard'
import { VibeyMcpDocsSearchService } from './services/vibey-mcp-docs-search.service'
import { VibeyMcpInstructionsService } from './services/vibey-mcp-instructions.service'
import { VibeyMcpPolicyService } from './services/vibey-mcp-policy.service'
import { VibeyMcpPromptCatalogService } from './services/vibey-mcp-prompt-catalog.service'
import { VibeyMcpResourceCatalogService } from './services/vibey-mcp-resource-catalog.service'
import { VibeyMcpServerService } from './services/vibey-mcp-server.service'
import { VibeyMcpSessionService } from './services/vibey-mcp-session.service'
import { VibeyMcpTokenIntrospectionService } from './services/vibey-mcp-token-introspection.service'
import { VibeyMcpToolCatalogService } from './services/vibey-mcp-tool-catalog.service'

@Module({
  imports: [SharedModule, SharedContextModule, ArtifactsModule, ConversationsModule],
  controllers: [VibeyMcpController],
  providers: [
    VibeyMcpOAuthGuard,
    VibeyMcpDocsSearchService,
    VibeyMcpInstructionsService,
    VibeyMcpPolicyService,
    VibeyMcpPromptCatalogService,
    VibeyMcpResourceCatalogService,
    VibeyMcpServerService,
    VibeyMcpSessionService,
    VibeyMcpTokenIntrospectionService,
    VibeyMcpToolCatalogService,
  ],
})
export class VibeyMcpModule {}
