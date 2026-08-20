import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  isModelStrategy,
  SupabaseClientFactory,
  SupabaseServiceClient,
  type OrgRole,
} from '@vibey/api-shared'
import { type ContextBreakdown } from '@vibey/context-breakdown'
import { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import { AgentRuntimeSkillScopeService } from '../../agent-sync/services/agent-runtime-skill-scope.service'
import { CreditsService } from '../../billing/services/credits.service'
import { BrainContextService } from '../../brain/services/brain-context.service'
import { ConversationsRepository } from '../../conversations/repositories/conversations.repository'
import { MessagesRepository } from '../../conversations/repositories/messages.repository'
import { ConversationPermissionsService } from '../../conversations/services/conversation-permissions.service'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { RequestContextService } from '../../shared/services/request-context.service'
import { ChatAttachmentContextRepository } from '../repositories/chat-attachment-context.repository'
import { ChatContextRepository } from '../repositories/chat-context.repository'
import { AgentEditCheckpointService } from './agent-edit-checkpoint.service'
import { CampaignContextService } from './campaign-context.service'
import { ChannelInstructionsService } from './channel-instructions.service'
import { ChatAccessTokenService } from './chat-access-token.service'
import { ChatAssistantTurnService } from './chat-assistant-turn.service'
import { ChatCompletionSideEffectsService } from './chat-completion-side-effects.service'
import { ChatContactLinkingService } from './chat-contact-linking.service'
import { ChatContextAccountingService } from './chat-context-accounting.service'
import { recordChatOrganizationDataAccess } from './chat-data-access-audit'
import { ChatDocumentContextService } from './chat-document-context.service'
import { ChatGatewayInputService } from './chat-gateway-input.service'
import { ChatMessageEnrichmentService } from './chat-message-enrichment.service'
import { ChatModelInputService } from './chat-model-input.service'
import { ChatOrderedBlocksService } from './chat-ordered-blocks.service'
import { ChatPrewarmCacheService } from './chat-prewarm-cache.service'
import {
  ChatPrewarmContextService,
  type ChatStablePrewarmContext,
  type PrewarmChatContextOptions,
} from './chat-prewarm-context.service'
import type { ChatProcessResult, ProcessMessageOptions } from './chat-process-message.types'
import { ChatProfileContextService } from './chat-profile-context.service'
import { ChatProgressiveStreamService } from './chat-progressive-stream.service'
import { ChatReferenceContextService } from './chat-reference-context.service'
import { ChatRunCheckpointService, type ChatRunCheckpointKind } from './chat-run-checkpoint.service'
import { ChatRunEventStoreService } from './chat-run-event-store.service'
import { ChatServiceCollaborators } from './chat-service-collaborators'
import { ChatSessionHistoryService } from './chat-session-history.service'
import { ChatSetupEventsService } from './chat-setup-events.service'
import { ChatSlashCommandService } from './chat-slash-command.service'
import { ChatStableTurnContextService } from './chat-stable-turn-context.service'
import { ChatStreamExecutionService } from './chat-stream-execution.service'
import { ChatStreamMirrorService } from './chat-stream-mirror.service'
import { ChatStreamRecoveryService } from './chat-stream-recovery.service'
import type { ActiveTurnSnapshot } from './chat-turn-query.service'
import { DocumentParserService } from './document-parser.service'
import { IntegrationContextService } from './integration-context.service'
import { MessageTimelineService } from './message-timeline.service'
import { maybeBindNamedClientCampaign } from './named-client-campaign-bind'
import { OpenClawProxyService } from './openclaw-proxy.service'
import { OpenRouterCostService } from './openrouter-cost.service'
import { SkillRecommendationEventRecorderService } from './skill-recommendation-event-recorder.service'
import { StreamRegistryService } from './stream-registry.service'
import { TracingService } from './tracing.service'

function normalizeScopeId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Chat Service (Layer 2): orchestrates chat turn persistence, streaming, and completion. */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)
  private readonly DEFAULT_MODEL_ID = 'anthropic/claude-opus-4.6'
  private readonly collaborators: ChatServiceCollaborators

  async getContextBaseline(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<ContextBreakdown | null> {
    return this.collaborators
      .getChatContextAccountingService()
      .getContextBaseline(supabase, conversationId)
  }

  constructor(
    private readonly messages: MessagesRepository,
    private readonly conversations: ConversationsRepository,
    private readonly openClaw: OpenClawProxyService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly credits: CreditsService,
    private readonly brainContext: BrainContextService,
    private readonly tracing: TracingService,
    private readonly messageTimeline: MessageTimelineService,
    private readonly costService: OpenRouterCostService,
    private readonly streamRegistry: StreamRegistryService,
    private readonly chatRunEvents: ChatRunEventStoreService,
    private readonly requestContext: RequestContextService,
    private readonly channelInstructions: ChannelInstructionsService,
    private readonly campaignContext: CampaignContextService,
    private readonly clientFactory: SupabaseClientFactory,
    private readonly svc: SupabaseServiceClient,
    private readonly runtimeReadiness: AgentRuntimeReadinessService,
    private readonly runtimeSkillScope: AgentRuntimeSkillScopeService,
    private readonly documentParser: DocumentParserService,
    private readonly integrationContext: IntegrationContextService,
    private readonly conversationPermissions: ConversationPermissionsService,
    private readonly agentEditCheckpoints: AgentEditCheckpointService,
    private readonly skillRecommendationEvents: SkillRecommendationEventRecorderService,
    private readonly agentPolicy?: AgentPolicyService,
    private readonly chatPrewarmCache?: ChatPrewarmCacheService,
    private readonly chatContextRepository: ChatContextRepository = new ChatContextRepository(),
    private readonly chatAttachmentContextRepository: ChatAttachmentContextRepository = new ChatAttachmentContextRepository(),
    chatProfileContextService?: ChatProfileContextService,
    chatSlashCommandService?: ChatSlashCommandService,
    chatCompletionSideEffectsService?: ChatCompletionSideEffectsService,
    chatDocumentContextService?: ChatDocumentContextService,
    chatReferenceContextService?: ChatReferenceContextService,
    chatModelInputService?: ChatModelInputService,
    chatContextAccountingService?: ChatContextAccountingService,
    chatAccessTokenService?: ChatAccessTokenService,
    chatContactLinkingService?: ChatContactLinkingService,
    chatPrewarmContextService?: ChatPrewarmContextService,
    chatMessageEnrichmentService?: ChatMessageEnrichmentService,
    chatSessionHistoryService?: ChatSessionHistoryService,
    chatRunCheckpointService?: ChatRunCheckpointService,
    chatOrderedBlocksService?: ChatOrderedBlocksService,
    chatStreamRecoveryService?: ChatStreamRecoveryService,
    chatSetupEventsService?: ChatSetupEventsService,
    chatStreamExecutionService?: ChatStreamExecutionService,
    chatStreamMirrorService?: ChatStreamMirrorService,
    chatProgressiveStreamService?: ChatProgressiveStreamService,
    chatGatewayInputService?: ChatGatewayInputService,
    chatAssistantTurnService?: ChatAssistantTurnService,
    chatStableTurnContextService?: ChatStableTurnContextService,
  ) {
    this.collaborators = new ChatServiceCollaborators(
      {
        messages: this.messages,
        conversations: this.conversations,
        openClaw: this.openClaw,
        agentRuntime: this.agentRuntime,
        credits: this.credits,
        brainContext: this.brainContext,
        tracing: this.tracing,
        messageTimeline: this.messageTimeline,
        costService: this.costService,
        streamRegistry: this.streamRegistry,
        chatRunEvents: this.chatRunEvents,
        requestContext: this.requestContext,
        channelInstructions: this.channelInstructions,
        campaignContext: this.campaignContext,
        clientFactory: this.clientFactory,
        svc: this.svc,
        runtimeReadiness: this.runtimeReadiness,
        runtimeSkillScope: this.runtimeSkillScope,
        documentParser: this.documentParser,
        integrationContext: this.integrationContext,
        agentEditCheckpoints: this.agentEditCheckpoints,
        skillRecommendationEvents: this.skillRecommendationEvents,
        agentPolicy: this.agentPolicy,
        chatPrewarmCache: this.chatPrewarmCache,
        chatContextRepository: this.chatContextRepository,
        chatAttachmentContextRepository: this.chatAttachmentContextRepository,
      },
      {
        chatProfileContextService,
        chatSlashCommandService,
        chatCompletionSideEffectsService,
        chatDocumentContextService,
        chatReferenceContextService,
        chatModelInputService,
        chatContextAccountingService,
        chatAccessTokenService,
        chatContactLinkingService,
        chatPrewarmContextService,
        chatMessageEnrichmentService,
        chatSessionHistoryService,
        chatRunCheckpointService,
        chatOrderedBlocksService,
        chatStreamRecoveryService,
        chatSetupEventsService,
        chatStreamExecutionService,
        chatStreamMirrorService,
        chatProgressiveStreamService,
        chatGatewayInputService,
        chatAssistantTurnService,
        chatStableTurnContextService,
      },
    )
  }

  private get sessionHistoryConfidence() {
    return this.collaborators.sessionHistoryConfidence
  }

  private createPrewarmCacheKey(options: PrewarmChatContextOptions): string | null {
    return this.collaborators.getChatPrewarmContextService().createPrewarmCacheKey(options)
  }

  async prewarmChatContext(options: PrewarmChatContextOptions) {
    return this.collaborators
      .getChatPrewarmContextService()
      .prewarmChatContext(options, this.logger)
  }

  async prewarmAgentChatContext(options: PrewarmChatContextOptions) {
    return this.collaborators
      .getChatPrewarmContextService()
      .prewarmAgentChatContext(options, this.logger)
  }

  private async buildStablePrewarmContext(
    options: PrewarmChatContextOptions,
  ): Promise<ChatStablePrewarmContext> {
    return this.collaborators
      .getChatPrewarmContextService()
      .buildStablePrewarmContext(options, this.logger)
  }

  async verifyConversationAccess(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
    requiredLevel: 'view' | 'edit' | 'admin' = 'view',
  ): Promise<boolean> {
    return this.collaborators
      .getChatTurnQueryService(this.conversationPermissions)
      .verifyConversationAccess(supabase, conversationId, userId, orgId, orgRole, requiredLevel)
  }

  async getActiveTurnSnapshot(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ): Promise<ActiveTurnSnapshot> {
    return this.collaborators
      .getChatTurnQueryService(this.conversationPermissions)
      .getActiveTurnSnapshot(supabase, userId, conversationId, orgId, orgRole)
  }

  async processMessage(options: ProcessMessageOptions): Promise<ChatProcessResult> {
    const {
      supabase,
      conversationId,
      content,
      agentKey,
      model,
      modelSettings,
      userId,
      accessToken,
      refreshToken,
      campaignId,
      spaceId,
      scopeKind,
      orgId,
      orgMemberId,
      organizationWideDataAccess,
      source,
      channelUser,
      documents,
      highlightedArtifacts,
      messageReferences,
      uiSelectedArtifact,
      hidden,
      systemContext,
      signal,
      send,
    } = options
    const requestCampaignId =
      typeof campaignId === 'string' && campaignId.trim().length > 0 ? campaignId.trim() : null
    const hasMessageCampaignScope = campaignId !== undefined
    const messageScope = {
      space_id: normalizeScopeId(spaceId),
      campaign_id: hasMessageCampaignScope ? requestCampaignId : null,
      scope_kind: scopeKind ?? 'unknown',
      org_id: normalizeScopeId(orgId),
    }
    let selectedModelInput: string | null = null
    const referenceContextService = this.collaborators.getChatReferenceContextService()
    const turnSession = this.collaborators.getChatTurnSessionService().create({
      supabase,
      conversationId,
      agentKey,
      model,
      modelSettings,
      userId,
      accessToken,
      refreshToken,
      campaignId,
      spaceId,
      scopeKind,
      orgId,
      source,
      channelUser,
      documentsLength: documents?.length ?? 0,
      highlightedArtifactCount: highlightedArtifacts?.length ?? 0,
      messageReferenceCount: messageReferences?.length ?? 0,
      hidden: hidden === true,
      timingSpans: options.timingSpans,
      send,
      logger: this.logger,
    })
    const {
      chatDiag,
      streamStartedAt,
      chatTimingLogsEnabled,
      prewarmCacheKey,
      streamMirrorService,
      streamMirrorState,
      completedPlatformTools,
      dbOp,
      logChatFlow,
      logChatTiming,
      recordTimingSpan,
      getTimingSpans,
      sendPreRunEvent,
      sendSetupStatus,
      runPlatformTool,
    } = turnSession

    // Avoid mid-stream persistence failures by refreshing if we're close to expiry.
    await turnSession.refreshIfNearExpiry()

    const {
      history,
      conversation: conv,
      prewarmedStableContext,
      prewarmContextResult,
    } = await this.collaborators.getChatTurnBootstrapService().load({
      conversationId,
      content,
      model,
      modelSettings,
      userId,
      orgId,
      hidden,
      documents,
      highlightedArtifacts,
      messageReferences,
      uiSelectedArtifact,
      messageScope,
      hasMessageCampaignScope,
      prewarmCacheKey,
      resolvePrewarmedStableContext: () =>
        this.collaborators
          .getChatPrewarmContextService()
          .resolveStablePrewarmContextForTurn(turnSession.getPrewarmOptions(), this.logger),
      chatDiag,
      dbOp,
      sendSetupStatus,
      logChatFlow,
      logChatTiming,
      recordTimingSpan,
      logger: this.logger,
    })

    // 3. Resolve campaign + agent from the conversation (source of truth)
    const stableContextStartedAt = Date.now()
    const stableTurnContext = await this.collaborators.getChatStableTurnContextService().resolve({
      prewarmedStableContext,
      conversation: conv as Record<string, unknown> | null,
      dbSupabase: turnSession.getDbSupabase(),
      dbOp,
      requestCampaignId,
      hasMessageCampaignScope,
      conversationId,
      model,
      modelSettings,
      userId,
      orgId,
      campaignId,
      spaceId,
      scopeKind,
      source,
      channelUser,
      sendSetupStatus,
      logger: this.logger,
    })
    const stableContextCacheHit = prewarmContextResult
      ? prewarmContextResult.cache_status !== 'built_on_send'
      : false
    recordTimingSpan('stable_context', stableContextStartedAt, {
      cache_hit: stableContextCacheHit,
      cache_status: prewarmContextResult?.cache_status ?? 'none',
      cache_store: prewarmContextResult?.store ?? 'none',
      cache_reused: prewarmContextResult?.reused ?? false,
      agent_cache_status: prewarmContextResult?.agent_cache_status ?? 'none',
      agent_cache_store: prewarmContextResult?.agent_store ?? 'none',
      agent_cache_reused: prewarmContextResult?.agent_reused ?? false,
      agent_cache_duration_ms: prewarmContextResult?.agent_duration_ms ?? null,
    })
    selectedModelInput = stableTurnContext.selectedModelInput
    const {
      resolvedCampaignId: stableResolvedCampaignId,
      runtime,
      resolvedAgentId,
      selectedModelSource,
      resolvedModelSelection,
      selectedSettings,
      gatewayModelId,
    } = stableTurnContext
    // §11.2a (app side): a message that NAMES a client binds CONNECTIONS before
    // the turn — deterministic, so the Campaign Brain preload and campaign
    // tools fire without waiting for the model to call search_campaign_brain.
    const namedClientBind = await maybeBindNamedClientCampaign(turnSession.getDbSupabase(), {
      conversationId,
      userId,
      orgId,
      text: content,
      currentCampaignId: stableResolvedCampaignId ?? null,
    }).catch((err) => {
      this.logger.warn(`Named-client campaign bind skipped: ${err}`)
      return null
    })
    if (namedClientBind) {
      this.logger.log(
        `[CONNECTIONS] Bound conversation ${conversationId} to campaign ${namedClientBind.campaignId} (named "${namedClientBind.candidate}")`,
      )
    }
    const resolvedCampaignId = namedClientBind?.campaignId ?? stableResolvedCampaignId
    this.logger.log(
      `[ModelRouter] strategy=${isModelStrategy(selectedModelInput) ? selectedModelInput : 'manual'} source=${selectedModelSource} task=chat requested=${selectedSettings.requestedModelId} resolved=${gatewayModelId} speed=${selectedSettings.request.speed_mode ?? 'standard'} reason=${resolvedModelSelection.reason}`,
    )
    const {
      resolvedChannel,
      sessionKey,
      openClawSkillCatalog,
      resolvedSlashCommands,
      disabledNativeActions,
      enabledToolkitsForGateway,
      gatewayToolPolicySlice,
      instructions,
      measuredContextSlices,
      inputArray,
      retrievalReceipts,
    } = await this.collaborators.getChatTurnGatewayPreparationService().prepare({
      conversationId,
      content,
      history,
      userId,
      orgId,
      organizationWideDataAccess,
      source,
      systemContext,
      channelUser,
      documents,
      highlightedArtifacts,
      messageReferences,
      modelSettings,
      messageScopeSpaceId: messageScope.space_id,
      prewarmedStableContext,
      stableTurnContext,
      runPlatformTool,
      sendPreRunEvent,
      sendSetupStatus,
      logChatTiming,
      recordTimingSpan,
      logger: this.logger,
    })
    await recordChatOrganizationDataAccess({
      client: this.svc.client,
      logger: this.logger,
      orgId,
      orgMemberId,
      userId,
      conversationId,
      allowed: organizationWideDataAccess === true,
    })

    // 5. Create the durable assistant turn before exposing its message ID to SSE/timeline.
    const assistantTurn = await this.collaborators.getChatAssistantTurnService().start({
      chatDiag,
      completedPlatformTools,
      content,
      conversationId,
      dbOp,
      gatewayAgentId: runtime.gatewayAgentId,
      gatewayModelId,
      historyLength: history.length,
      instructions,
      logChatFlow,
      logChatTiming,
      logger: this.logger,
      messageId: options.messageId,
      requestId: options.requestId,
      orgId,
      resolvedAgentId,
      resolvedCampaignId,
      resolvedChannel,
      runId: options.runId,
      send,
      sendSetupStatus,
      selectedModelInput,
      selectedSettings,
      sessionKey,
      streamMirrorService,
      streamMirrorState,
      streamStartedAt,
      userId,
    })
    const { messageId, runId, requestId, traceId, sendRunEvent } = assistantTurn

    const streamingState = this.collaborators.getChatTurnStreamingStateService().create({
      conversationId,
      userId,
      orgId,
      resolvedCampaignId,
      currentAccessToken: turnSession.getCurrentAccessToken(),
      currentRefreshToken: turnSession.getCurrentRefreshToken(),
      selectedModelInput,
      messageId,
      runId,
      resolvedChannel,
      channelUser,
      messageScope,
      completedPlatformTools,
      documents,
      conversationMetadata: conv?.metadata,
      highlightedArtifacts,
      messageReferences,
      uiSelectedArtifact,
      dbOp,
      chatDiag,
      sendRunEvent,
      streamStartedAt,
      logChatFlow,
      recordTimingSpan,
      logger: this.logger,
      referenceContextService,
    })
    await streamingState.sendRetrievalReceipts(retrievalReceipts)
    turnSession.setRequestContextRefreshState({
      conversationId,
      userId,
      campaignId: resolvedCampaignId ?? null,
      selectedModelInput,
      orgId,
      resolvedChannel,
      channelUser,
      messageScope,
    })

    return this.collaborators.getChatTurnTerminalService().run({
      chatDiag,
      chatTimingLogsEnabled,
      conversationId,
      content,
      dbOp,
      defaultModelId: this.DEFAULT_MODEL_ID,
      disabledNativeActions,
      enabledToolkitsForGateway,
      gatewayModelId,
      gatewayToolPolicySlice,
      history,
      inputArray,
      instructions,
      logChatFlow,
      logChatTiming,
      logger: this.logger,
      measuredContextSlices,
      messageId,
      model,
      modelSettings,
      openClawSkillCatalog,
      orgId,
      resolvedAgentId,
      resolvedCampaignId,
      resolvedChannel,
      resolvedSlashCommands,
      runId,
      requestId,
      runtime,
      selectedModelInput,
      selectedSettings,
      send,
      sendRunEvent,
      sessionKey,
      signal,
      streamMirrorService,
      streamMirrorState,
      streamStartedAt,
      streamingState,
      traceId,
      recordTimingSpan,
      getTimingSpans,
      userId,
      conversationMetadata: (conv?.metadata as Record<string, unknown> | undefined) ?? {},
      historyLength: history.length,
      spaceId: messageScope.space_id,
      hasActiveWorkingSetEntries: (workingSet) =>
        referenceContextService.hasActiveWorkingSetEntries(workingSet),
    })
  }
}
