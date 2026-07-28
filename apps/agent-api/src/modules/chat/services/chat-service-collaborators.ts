import type { SupabaseClientFactory, SupabaseServiceClient } from '@vibey/api-shared'
import type { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import type { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import type { AgentRuntimeSkillScopeService } from '../../agent-sync/services/agent-runtime-skill-scope.service'
import type { CreditsService } from '../../billing/services/credits.service'
import type { BrainContextService } from '../../brain/services/brain-context.service'
import type { ConversationsRepository } from '../../conversations/repositories/conversations.repository'
import type { MessagesRepository } from '../../conversations/repositories/messages.repository'
import type { ConversationPermissionsService } from '../../conversations/services/conversation-permissions.service'
import type { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import type { RequestContextService } from '../../shared/services/request-context.service'
import type { ChatAttachmentContextRepository } from '../repositories/chat-attachment-context.repository'
import type { ChatContextRepository } from '../repositories/chat-context.repository'
import type { AgentEditCheckpointService } from './agent-edit-checkpoint.service'
import type { CampaignContextService } from './campaign-context.service'
import type { ChannelInstructionsService } from './channel-instructions.service'
import { ChatAccessTokenService } from './chat-access-token.service'
import { ChatAssistantTurnService } from './chat-assistant-turn.service'
import { ChatCompletionSideEffectsService } from './chat-completion-side-effects.service'
import { ChatContactLinkingService } from './chat-contact-linking.service'
import { ChatContextAccountingService } from './chat-context-accounting.service'
import { ChatDocumentContextService } from './chat-document-context.service'
import { ChatGatewayInputService } from './chat-gateway-input.service'
import { ChatMessageEnrichmentService } from './chat-message-enrichment.service'
import { ChatModelInputService } from './chat-model-input.service'
import { ChatOrderedBlocksService } from './chat-ordered-blocks.service'
import { ChatPrewarmCacheService } from './chat-prewarm-cache.service'
import { ChatPrewarmContextService } from './chat-prewarm-context.service'
import { ChatProfileContextService } from './chat-profile-context.service'
import { ChatProgressiveStreamService } from './chat-progressive-stream.service'
import { ChatReferenceContextService } from './chat-reference-context.service'
import { ChatRunCheckpointService } from './chat-run-checkpoint.service'
import type { ChatRunEventStoreService } from './chat-run-event-store.service'
import { ChatSessionHistoryService } from './chat-session-history.service'
import { ChatSetupEventsService } from './chat-setup-events.service'
import { ChatSlashCommandService } from './chat-slash-command.service'
import { ChatStableTurnContextService } from './chat-stable-turn-context.service'
import { ChatStreamExecutionService } from './chat-stream-execution.service'
import { ChatStreamMirrorService } from './chat-stream-mirror.service'
import { ChatStreamRecoveryService } from './chat-stream-recovery.service'
import { ChatTurnBootstrapService } from './chat-turn-bootstrap.service'
import { ChatTurnCompletionService } from './chat-turn-completion.service'
import { ChatTurnGatewayPreparationService } from './chat-turn-gateway-preparation.service'
import { ChatTurnQueryService } from './chat-turn-query.service'
import { ChatTurnSessionService } from './chat-turn-session.service'
import { ChatTurnStreamingStateService } from './chat-turn-streaming-state.service'
import { ChatTurnStreamService } from './chat-turn-stream.service'
import { ChatTurnTerminalService } from './chat-turn-terminal.service'
import type { DocumentParserService } from './document-parser.service'
import type { IntegrationContextService } from './integration-context.service'
import type { MessageTimelineService } from './message-timeline.service'
import type { OpenClawProxyService } from './openclaw-proxy.service'
import type { OpenRouterCostService } from './openrouter-cost.service'
import type { SkillRecommendationEventRecorderService } from './skill-recommendation-event-recorder.service'
import type { StreamRegistryService } from './stream-registry.service'
import type { TracingService } from './tracing.service'

export interface ChatServiceCollaboratorDeps {
  messages: MessagesRepository
  conversations: ConversationsRepository
  openClaw: OpenClawProxyService
  agentRuntime: AgentRuntimeService
  credits: CreditsService
  brainContext: BrainContextService
  tracing: TracingService
  messageTimeline: MessageTimelineService
  costService: OpenRouterCostService
  streamRegistry: StreamRegistryService
  chatRunEvents: ChatRunEventStoreService
  requestContext: RequestContextService
  channelInstructions: ChannelInstructionsService
  campaignContext: CampaignContextService
  clientFactory: SupabaseClientFactory
  svc: SupabaseServiceClient
  runtimeReadiness: AgentRuntimeReadinessService
  runtimeSkillScope: AgentRuntimeSkillScopeService
  documentParser: DocumentParserService
  integrationContext: IntegrationContextService
  agentEditCheckpoints: AgentEditCheckpointService
  skillRecommendationEvents: SkillRecommendationEventRecorderService
  agentPolicy?: AgentPolicyService
  chatPrewarmCache?: ChatPrewarmCacheService
  chatContextRepository: ChatContextRepository
  chatAttachmentContextRepository: ChatAttachmentContextRepository
}

export interface ChatServiceCollaboratorOverrides {
  chatProfileContextService?: ChatProfileContextService
  chatSlashCommandService?: ChatSlashCommandService
  chatCompletionSideEffectsService?: ChatCompletionSideEffectsService
  chatDocumentContextService?: ChatDocumentContextService
  chatReferenceContextService?: ChatReferenceContextService
  chatModelInputService?: ChatModelInputService
  chatContextAccountingService?: ChatContextAccountingService
  chatAccessTokenService?: ChatAccessTokenService
  chatContactLinkingService?: ChatContactLinkingService
  chatPrewarmContextService?: ChatPrewarmContextService
  chatMessageEnrichmentService?: ChatMessageEnrichmentService
  chatSessionHistoryService?: ChatSessionHistoryService
  chatRunCheckpointService?: ChatRunCheckpointService
  chatOrderedBlocksService?: ChatOrderedBlocksService
  chatStreamRecoveryService?: ChatStreamRecoveryService
  chatSetupEventsService?: ChatSetupEventsService
  chatStreamExecutionService?: ChatStreamExecutionService
  chatStreamMirrorService?: ChatStreamMirrorService
  chatProgressiveStreamService?: ChatProgressiveStreamService
  chatGatewayInputService?: ChatGatewayInputService
  chatAssistantTurnService?: ChatAssistantTurnService
  chatStableTurnContextService?: ChatStableTurnContextService
  chatTurnBootstrapService?: ChatTurnBootstrapService
  chatTurnCompletionService?: ChatTurnCompletionService
  chatTurnGatewayPreparationService?: ChatTurnGatewayPreparationService
  chatTurnQueryService?: ChatTurnQueryService
  chatTurnSessionService?: ChatTurnSessionService
  chatTurnStreamingStateService?: ChatTurnStreamingStateService
  chatTurnStreamService?: ChatTurnStreamService
  chatTurnTerminalService?: ChatTurnTerminalService
}

export class ChatServiceCollaborators {
  private chatProfileContextService?: ChatProfileContextService
  private chatSlashCommandService?: ChatSlashCommandService
  private chatCompletionSideEffectsService?: ChatCompletionSideEffectsService
  private chatDocumentContextService?: ChatDocumentContextService
  private chatReferenceContextService?: ChatReferenceContextService
  private chatModelInputService?: ChatModelInputService
  private chatContextAccountingService?: ChatContextAccountingService
  private chatAccessTokenService?: ChatAccessTokenService
  private chatContactLinkingService?: ChatContactLinkingService
  private chatPrewarmContextService?: ChatPrewarmContextService
  private chatMessageEnrichmentService?: ChatMessageEnrichmentService
  private chatSessionHistoryService?: ChatSessionHistoryService
  private chatRunCheckpointService?: ChatRunCheckpointService
  private chatOrderedBlocksService?: ChatOrderedBlocksService
  private chatStreamRecoveryService?: ChatStreamRecoveryService
  private chatSetupEventsService?: ChatSetupEventsService
  private chatStreamExecutionService?: ChatStreamExecutionService
  private chatStreamMirrorService?: ChatStreamMirrorService
  private chatProgressiveStreamService?: ChatProgressiveStreamService
  private chatGatewayInputService?: ChatGatewayInputService
  private chatAssistantTurnService?: ChatAssistantTurnService
  private chatStableTurnContextService?: ChatStableTurnContextService
  private chatTurnBootstrapService?: ChatTurnBootstrapService
  private chatTurnCompletionService?: ChatTurnCompletionService
  private chatTurnGatewayPreparationService?: ChatTurnGatewayPreparationService
  private chatTurnQueryService?: ChatTurnQueryService
  private chatTurnSessionService?: ChatTurnSessionService
  private chatTurnStreamingStateService?: ChatTurnStreamingStateService
  private chatTurnStreamService?: ChatTurnStreamService
  private chatTurnTerminalService?: ChatTurnTerminalService

  constructor(
    private readonly deps: ChatServiceCollaboratorDeps,
    overrides: ChatServiceCollaboratorOverrides = {},
  ) {
    Object.assign(this, overrides)
  }

  get sessionHistoryConfidence() {
    return this.getChatSessionHistoryService().sessionHistoryConfidence
  }

  getChatProfileContextService(): ChatProfileContextService {
    if (!this.chatProfileContextService) {
      this.chatProfileContextService = new ChatProfileContextService(
        this.deps.svc,
        this.deps.chatContextRepository,
      )
    }
    return this.chatProfileContextService
  }

  getChatSlashCommandService(): ChatSlashCommandService {
    if (!this.chatSlashCommandService) {
      this.chatSlashCommandService = new ChatSlashCommandService(
        this.deps.svc,
        this.deps.runtimeSkillScope,
        this.deps.chatContextRepository,
      )
    }
    return this.chatSlashCommandService
  }

  getChatCompletionSideEffectsService(): ChatCompletionSideEffectsService {
    if (!this.chatCompletionSideEffectsService) {
      this.chatCompletionSideEffectsService = new ChatCompletionSideEffectsService(
        this.deps.costService,
        this.deps.tracing,
        this.deps.skillRecommendationEvents,
        this.deps.credits,
      )
    }
    return this.chatCompletionSideEffectsService
  }

  getChatDocumentContextService(): ChatDocumentContextService {
    if (!this.chatDocumentContextService) {
      this.chatDocumentContextService = new ChatDocumentContextService(
        this.deps.svc,
        this.deps.chatAttachmentContextRepository,
      )
    }
    return this.chatDocumentContextService
  }

  getChatReferenceContextService(): ChatReferenceContextService {
    if (!this.chatReferenceContextService) {
      this.chatReferenceContextService = new ChatReferenceContextService(
        this.deps.svc,
        this.deps.chatAttachmentContextRepository,
      )
    }
    return this.chatReferenceContextService
  }

  getChatModelInputService(): ChatModelInputService {
    if (!this.chatModelInputService) {
      this.chatModelInputService = new ChatModelInputService(
        this.deps.svc,
        this.deps.runtimeSkillScope,
        this.deps.chatContextRepository,
      )
    }
    return this.chatModelInputService
  }

  getChatContextAccountingService(): ChatContextAccountingService {
    if (!this.chatContextAccountingService) {
      this.chatContextAccountingService = new ChatContextAccountingService(this.deps.conversations)
    }
    return this.chatContextAccountingService
  }

  getChatAccessTokenService(): ChatAccessTokenService {
    if (!this.chatAccessTokenService) {
      this.chatAccessTokenService = new ChatAccessTokenService(this.deps.clientFactory)
    }
    return this.chatAccessTokenService
  }

  getChatContactLinkingService(): ChatContactLinkingService {
    if (!this.chatContactLinkingService) {
      this.chatContactLinkingService = new ChatContactLinkingService(
        this.deps.conversations,
        this.deps.chatContextRepository,
      )
    }
    return this.chatContactLinkingService
  }

  getChatPrewarmContextService(): ChatPrewarmContextService {
    if (!this.chatPrewarmContextService) {
      this.chatPrewarmContextService = new ChatPrewarmContextService(
        this.deps.agentRuntime,
        this.deps.runtimeReadiness,
        this.deps.brainContext,
        this.deps.campaignContext,
        this.deps.integrationContext,
        this.deps.conversations,
        this.deps.chatContextRepository,
        this.deps.chatPrewarmCache,
        this.deps.agentPolicy,
        this.getChatAccessTokenService(),
        this.getChatDocumentContextService(),
        this.getChatModelInputService(),
        this.getChatProfileContextService(),
      )
    }
    return this.chatPrewarmContextService
  }

  getChatMessageEnrichmentService(): ChatMessageEnrichmentService {
    if (!this.chatMessageEnrichmentService) {
      this.chatMessageEnrichmentService = new ChatMessageEnrichmentService(
        this.deps.runtimeReadiness,
        this.deps.documentParser,
        this.getChatDocumentContextService(),
        this.getChatReferenceContextService(),
        this.getChatSlashCommandService(),
      )
    }
    return this.chatMessageEnrichmentService
  }

  getChatSessionHistoryService(): ChatSessionHistoryService {
    if (!this.chatSessionHistoryService) {
      this.chatSessionHistoryService = new ChatSessionHistoryService()
    }
    return this.chatSessionHistoryService
  }

  getChatRunCheckpointService(): ChatRunCheckpointService {
    if (!this.chatRunCheckpointService) {
      this.chatRunCheckpointService = new ChatRunCheckpointService(this.deps.svc)
    }
    return this.chatRunCheckpointService
  }

  getChatOrderedBlocksService(): ChatOrderedBlocksService {
    if (!this.chatOrderedBlocksService) {
      this.chatOrderedBlocksService = new ChatOrderedBlocksService()
    }
    return this.chatOrderedBlocksService
  }

  getChatStreamRecoveryService(): ChatStreamRecoveryService {
    if (!this.chatStreamRecoveryService) {
      this.chatStreamRecoveryService = new ChatStreamRecoveryService()
    }
    return this.chatStreamRecoveryService
  }

  getChatSetupEventsService(): ChatSetupEventsService {
    if (!this.chatSetupEventsService) {
      this.chatSetupEventsService = new ChatSetupEventsService()
    }
    return this.chatSetupEventsService
  }

  getChatStreamExecutionService(): ChatStreamExecutionService {
    if (!this.chatStreamExecutionService) {
      this.chatStreamExecutionService = new ChatStreamExecutionService(
        this.deps.openClaw,
        this.getChatStreamRecoveryService(),
        this.getChatModelInputService(),
      )
    }
    return this.chatStreamExecutionService
  }

  getChatStreamMirrorService(): ChatStreamMirrorService {
    if (!this.chatStreamMirrorService) {
      this.chatStreamMirrorService = new ChatStreamMirrorService()
    }
    return this.chatStreamMirrorService
  }

  getChatProgressiveStreamService(): ChatProgressiveStreamService {
    if (!this.chatProgressiveStreamService) {
      this.chatProgressiveStreamService = new ChatProgressiveStreamService(
        this.getChatOrderedBlocksService(),
      )
    }
    return this.chatProgressiveStreamService
  }

  getChatGatewayInputService(): ChatGatewayInputService {
    if (!this.chatGatewayInputService) {
      this.chatGatewayInputService = new ChatGatewayInputService(this.deps.channelInstructions)
    }
    return this.chatGatewayInputService
  }

  getChatAssistantTurnService(): ChatAssistantTurnService {
    if (!this.chatAssistantTurnService) {
      this.chatAssistantTurnService = new ChatAssistantTurnService(
        this.deps.messages,
        this.deps.chatRunEvents,
        this.deps.streamRegistry,
        this.deps.messageTimeline,
        this.deps.tracing,
      )
    }
    return this.chatAssistantTurnService
  }

  getChatStableTurnContextService(): ChatStableTurnContextService {
    if (!this.chatStableTurnContextService) {
      this.chatStableTurnContextService = new ChatStableTurnContextService(
        this.deps.agentRuntime,
        this.deps.runtimeReadiness,
        this.deps.chatContextRepository,
        this.getChatModelInputService(),
        this.deps.agentPolicy,
      )
    }
    return this.chatStableTurnContextService
  }

  getChatTurnBootstrapService(): ChatTurnBootstrapService {
    if (!this.chatTurnBootstrapService) {
      this.chatTurnBootstrapService = new ChatTurnBootstrapService(
        this.deps.messages,
        this.deps.conversations,
        this.getChatContactLinkingService(),
        this.deps.chatContextRepository,
      )
    }
    return this.chatTurnBootstrapService
  }

  getChatTurnCompletionService(): ChatTurnCompletionService {
    if (!this.chatTurnCompletionService) {
      this.chatTurnCompletionService = new ChatTurnCompletionService(
        this.deps.messages,
        this.deps.conversations,
        this.deps.messageTimeline,
        this.deps.chatRunEvents,
        this.deps.streamRegistry,
        this.deps.requestContext,
        this.deps.agentEditCheckpoints,
        this.deps.chatContextRepository,
        this.deps.svc,
      )
    }
    return this.chatTurnCompletionService
  }

  getChatTurnGatewayPreparationService(): ChatTurnGatewayPreparationService {
    if (!this.chatTurnGatewayPreparationService) {
      this.chatTurnGatewayPreparationService = new ChatTurnGatewayPreparationService(
        this.deps.agentRuntime,
        this.deps.brainContext,
        this.deps.campaignContext,
        this.deps.integrationContext,
        this.getChatContextAccountingService(),
        this.getChatDocumentContextService(),
        this.getChatGatewayInputService(),
        this.getChatMessageEnrichmentService(),
        this.getChatModelInputService(),
        this.getChatProfileContextService(),
        this.getChatSessionHistoryService(),
        this.getChatSetupEventsService(),
        this.deps.agentPolicy,
      )
    }
    return this.chatTurnGatewayPreparationService
  }

  getChatTurnQueryService(conversationPermissions: ConversationPermissionsService): ChatTurnQueryService {
    if (!this.chatTurnQueryService) {
      this.chatTurnQueryService = new ChatTurnQueryService(
        this.deps.messages,
        conversationPermissions,
        this.deps.chatRunEvents,
        this.deps.streamRegistry,
        this.deps.messageTimeline,
        this.deps.svc,
      )
    }
    return this.chatTurnQueryService
  }

  getChatTurnSessionService(): ChatTurnSessionService {
    if (!this.chatTurnSessionService) {
      this.chatTurnSessionService = new ChatTurnSessionService(
        this.getChatAccessTokenService(),
        this.getChatPrewarmContextService(),
        this.getChatSetupEventsService(),
        this.getChatStreamMirrorService(),
        this.deps.requestContext,
      )
    }
    return this.chatTurnSessionService
  }

  getChatTurnStreamingStateService(): ChatTurnStreamingStateService {
    if (!this.chatTurnStreamingStateService) {
      this.chatTurnStreamingStateService = new ChatTurnStreamingStateService(
        this.deps.messages,
        this.deps.messageTimeline,
        this.deps.requestContext,
        this.getChatRunCheckpointService(),
        this.getChatProgressiveStreamService(),
        this.deps.svc,
      )
    }
    return this.chatTurnStreamingStateService
  }

  getChatTurnStreamService(): ChatTurnStreamService {
    if (!this.chatTurnStreamService) {
      this.chatTurnStreamService = new ChatTurnStreamService(
        this.getChatStreamExecutionService(),
        this.getChatStreamRecoveryService(),
        this.getChatContextAccountingService(),
        this.getChatSessionHistoryService(),
        this.getChatCompletionSideEffectsService(),
        this.deps.chatRunEvents,
        this.deps.streamRegistry,
        this.deps.tracing,
      )
    }
    return this.chatTurnStreamService
  }

  getChatTurnTerminalService(): ChatTurnTerminalService {
    if (!this.chatTurnTerminalService) {
      this.chatTurnTerminalService = new ChatTurnTerminalService(
        this.getChatTurnStreamService(),
        this.getChatTurnCompletionService(),
        this.deps.chatRunEvents,
        this.deps.tracing,
        this.deps.streamRegistry,
        this.getChatContextAccountingService(),
      )
    }
    return this.chatTurnTerminalService
  }
}
