import { Module } from '@nestjs/common'
import { AgentSyncModule } from '../agent-sync/agent-sync.module'
import { AgentBillingModule } from '../billing/billing.module'
import { CreditsGuard } from '../billing/guards/credits.guard'
import { BrainModule } from '../brain/brain.module'
import { ComposioModule } from '../composio/composio.module'
import { ConversationsModule } from '../conversations/conversations.module'
import { McpModule } from '../mcp/mcp.module'
import { BrowserMediaController } from './controllers/browser-media.controller'
import { ChannelChatController } from './controllers/channel-chat.controller'
import { ChatStatusController } from './controllers/chat-status.controller'
import { ChatStreamController } from './controllers/chat-stream.controller'
import { ChatController } from './controllers/chat.controller'
import { InternalChatRuntimeController } from './controllers/internal-chat-runtime.controller'
import { OpenClawGatewayClient } from './integrations/openclaw-gateway.client'
import { AgentEditCheckpointRepository } from './repositories/agent-edit-checkpoint.repository'
import { ChatAdminAuthRepository } from './repositories/chat-admin-auth.repository'
import { ChatAttachmentContextRepository } from './repositories/chat-attachment-context.repository'
import { ChatContextRepository } from './repositories/chat-context.repository'
import { ChatRuntimeRepository } from './repositories/chat-runtime.repository'
import { AgentEditCheckpointService } from './services/agent-edit-checkpoint.service'
import { AgentRuntimeQueueService } from './services/agent-runtime-queue.service'
import { AnthropicClaudeAdminAuthService } from './services/anthropic-claude-admin-auth.service'
import { CampaignContextService } from './services/campaign-context.service'
import { ChannelInstructionsService } from './services/channel-instructions.service'
import { ChatAccessTokenService } from './services/chat-access-token.service'
import { ChatAssistantTurnService } from './services/chat-assistant-turn.service'
import { ChatCompletionSideEffectsService } from './services/chat-completion-side-effects.service'
import { ChatContactLinkingService } from './services/chat-contact-linking.service'
import { ChatContextAccountingService } from './services/chat-context-accounting.service'
import { ChatDocumentContextService } from './services/chat-document-context.service'
import { ChatGatewayInputService } from './services/chat-gateway-input.service'
import { ChatMessageEnrichmentService } from './services/chat-message-enrichment.service'
import { ChatModelInputService } from './services/chat-model-input.service'
import { ChatOrderedBlocksService } from './services/chat-ordered-blocks.service'
import { ChatPrewarmCacheService } from './services/chat-prewarm-cache.service'
import { ChatPrewarmContextService } from './services/chat-prewarm-context.service'
import { ChatProfileContextService } from './services/chat-profile-context.service'
import { ChatProgressiveStreamService } from './services/chat-progressive-stream.service'
import { ChatReferenceContextService } from './services/chat-reference-context.service'
import { ChatRunCheckpointService } from './services/chat-run-checkpoint.service'
import { ChatRunEventStoreService } from './services/chat-run-event-store.service'
import { ChatSessionHistoryService } from './services/chat-session-history.service'
import { ChatSetupEventsService } from './services/chat-setup-events.service'
import { ChatSlashCommandService } from './services/chat-slash-command.service'
import { ChatStableTurnContextService } from './services/chat-stable-turn-context.service'
import { ChatStreamExecutionService } from './services/chat-stream-execution.service'
import { ChatStreamHttpService } from './services/chat-stream-http.service'
import { ChatStreamMirrorService } from './services/chat-stream-mirror.service'
import { ChatStreamRecoveryService } from './services/chat-stream-recovery.service'
import { ChatService } from './services/chat.service'
import { DocumentParserService } from './services/document-parser.service'
import { IntegrationContextService } from './services/integration-context.service'
import { MessageTimelineService } from './services/message-timeline.service'
import { OpenAICodexAdminAuthService } from './services/openai-codex-admin-auth.service'
import { OpenClawGatewayRequestService } from './services/openclaw-gateway-request.service'
import { OpenClawProxyService } from './services/openclaw-proxy.service'
import { OpenClawStreamContentService } from './services/openclaw-stream-content.service'
import { OpenClawStreamLifecycleService } from './services/openclaw-stream-lifecycle.service'
import { OpenClawStreamReaderService } from './services/openclaw-stream-reader.service'
import { OpenClawStreamToolService } from './services/openclaw-stream-tool.service'
import { OpenRouterCostService } from './services/openrouter-cost.service'
import { PulseCompositorService } from './services/pulse-compositor.service'
import { ResponseFilterService } from './services/response-filter.service'
import { SkillRecommendationEventRecorderService } from './services/skill-recommendation-event-recorder.service'
import { StateWriterService } from './services/state-writer.service'
import { StreamRegistryService } from './services/stream-registry.service'
import { TracingService } from './services/tracing.service'

@Module({
  imports: [
    AgentSyncModule,
    ConversationsModule,
    AgentBillingModule,
    BrainModule,
    ComposioModule,
    McpModule,
  ],
  controllers: [
    ChatController,
    ChatStreamController,
    ChatStatusController,
    ChannelChatController,
    BrowserMediaController,
    InternalChatRuntimeController,
  ],
  providers: [
    AgentEditCheckpointRepository,
    ChatAdminAuthRepository,
    ChatAttachmentContextRepository,
    ChatContextRepository,
    ChatRuntimeRepository,
    CampaignContextService,
    ChannelInstructionsService,
    IntegrationContextService,
    AgentEditCheckpointService,
    AgentRuntimeQueueService,
    ChatAccessTokenService,
    ChatAssistantTurnService,
    ChatCompletionSideEffectsService,
    ChatContactLinkingService,
    ChatContextAccountingService,
    ChatPrewarmCacheService,
    ChatRunEventStoreService,
    ChatDocumentContextService,
    ChatGatewayInputService,
    ChatMessageEnrichmentService,
    ChatModelInputService,
    ChatOrderedBlocksService,
    ChatProgressiveStreamService,
    ChatProfileContextService,
    ChatReferenceContextService,
    ChatSessionHistoryService,
    ChatRunCheckpointService,
    ChatSetupEventsService,
    ChatSlashCommandService,
    ChatStreamExecutionService,
    ChatStreamMirrorService,
    ChatStreamRecoveryService,
    ChatStableTurnContextService,
    ChatPrewarmContextService,
    ChatService,
    ChatStreamHttpService,
    AnthropicClaudeAdminAuthService,
    OpenAICodexAdminAuthService,
    OpenClawGatewayClient,
    OpenClawGatewayRequestService,
    OpenClawProxyService,
    OpenClawStreamContentService,
    OpenClawStreamLifecycleService,
    OpenClawStreamReaderService,
    OpenClawStreamToolService,
    ResponseFilterService,
    SkillRecommendationEventRecorderService,
    DocumentParserService,
    TracingService,
    OpenRouterCostService,
    PulseCompositorService,
    MessageTimelineService,
    StreamRegistryService,
    StateWriterService,
    CreditsGuard,
  ],
  exports: [
    ChatService,
    AgentRuntimeQueueService,
    ChatPrewarmCacheService,
    ChatRunCheckpointService,
    ChatRunEventStoreService,
    OpenClawProxyService,
    DocumentParserService,
    IntegrationContextService,
    CampaignContextService,
    PulseCompositorService,
    StreamRegistryService,
    TracingService,
    SkillRecommendationEventRecorderService,
    OpenRouterCostService,
    AnthropicClaudeAdminAuthService,
    OpenAICodexAdminAuthService,
  ],
})
export class ChatModule {}
