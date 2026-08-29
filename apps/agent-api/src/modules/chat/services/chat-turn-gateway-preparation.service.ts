import { Injectable, type Logger } from '@nestjs/common'
import type { DocumentIntelligenceMetadata } from '@vibey/api-shared'
import type { ContextCategorySlice } from '@vibey/context-breakdown'
import { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import { BrainContextService } from '../../brain/services/brain-context.service'
import type { BrainRetrievalReceipt } from '../../brain/services/brain-retrieval-receipt'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { CampaignContextService } from './campaign-context.service'
import { ChatContextAccountingService } from './chat-context-accounting.service'
import { ChatDocumentContextService } from './chat-document-context.service'
import { ChatGatewayInputService, type ChatGatewayInputContext } from './chat-gateway-input.service'
import { ChatMessageEnrichmentService } from './chat-message-enrichment.service'
import { ChatModelInputService, type ChatModelSettings } from './chat-model-input.service'
import { shouldSkipBrainContextForOperationalAgenda } from './chat-operational-agenda.util'
import type { ChatStablePrewarmContext } from './chat-prewarm-context.service'
import { ChatProfileContextService } from './chat-profile-context.service'
import { ChatSessionHistoryService } from './chat-session-history.service'
import { ChatSetupEventsService } from './chat-setup-events.service'
import type { ResolvedSlashCommand } from './chat-slash-command.service'
import type { ChatStableTurnContext } from './chat-stable-turn-context.service'
import { BRAIN_CONTEXT_TOOL, CONTEXT_READY_STATUS_LABELS } from './chat-turn-gateway-labels'
import type { RecordChatTurnTimingSpan } from './chat-turn-session.service'
import { IntegrationContextService } from './integration-context.service'
import type { OpenClawInputMessage, OpenClawSkillCatalog } from './openclaw-proxy.service'

type ChatGatewayChannel = 'telegram' | 'slack' | 'studio'
interface ChatPreparationDocument {
  filename: string
  type: 'text' | 'image' | 'video' | 'audio'
  text?: string
  dataUrl?: string
  fileUrl?: string
  mimeType?: string
  mediaAssetId?: string
  sizeBytes?: number
  pageCount?: number
  preview?: string
  documentIntelligence?: DocumentIntelligenceMetadata | null
}

interface HighlightedArtifact {
  id: string
  type: string
  label: string
}

interface MessageReference {
  kind: 'artifact' | 'media' | 'mission' | 'conversation' | 'person' | 'campaign'
  id: string
  label: string
  type?: string
  campaign_id?: string
  brain_id?: string
}

interface ChannelUser {
  platform_id: string
  username?: string
  display_name: string
  language?: string
  relationship_kind?: 'internal'
  is_connection_owner?: boolean
  personal_brain_access?: boolean
  organization_wide_data_access?: boolean
}

type RunPlatformTool = <T>(
  options: {
    name: string
    action: string
    labels: readonly string[]
    seed: string
    id: string
  },
  operation: () => Promise<T>,
) => Promise<T>

interface PrepareGatewayInput {
  conversationId: string
  content: string
  history: Record<string, unknown>[]
  userId: string
  orgId?: string
  organizationWideDataAccess?: boolean
  source?: string
  systemContext?: string
  channelUser?: ChannelUser
  documents?: ChatPreparationDocument[]
  highlightedArtifacts?: HighlightedArtifact[]
  messageReferences?: MessageReference[]
  modelSettings?: ChatModelSettings
  messageScopeSpaceId?: string | null
  prewarmedStableContext: ChatStablePrewarmContext | null
  stableTurnContext: ChatStableTurnContext
  runPlatformTool: RunPlatformTool
  sendPreRunEvent: (type: string, payload: Record<string, unknown>) => Promise<void>
  sendSetupStatus: (message: string) => Promise<void>
  logChatTiming: (stage: string, extra?: Record<string, unknown>) => void
  recordTimingSpan?: RecordChatTurnTimingSpan
  logger: Pick<Logger, 'log' | 'warn'>
}

export interface PreparedGatewayTurn {
  resolvedChannel: ChatGatewayChannel
  sessionKey: string
  openClawSkillCatalog?: OpenClawSkillCatalog
  resolvedSlashCommands: ResolvedSlashCommand[]
  disabledNativeActions: string[]
  enabledToolkitsForGateway: ChatGatewayInputContext['enabledToolkitsForGateway']
  gatewayToolPolicySlice: ContextCategorySlice | null
  instructions: string
  measuredContextSlices: ContextCategorySlice[]
  inputArray: OpenClawInputMessage[]
  retrievalReceipts: BrainRetrievalReceipt[]
}

const PUBLIC_AGENT_META_PROMPTS = [
  'how do you work',
  'what can you do',
  'what do you do',
  'what can you help',
  'how can you help',
  'who are you',
] as const

@Injectable()
export class ChatTurnGatewayPreparationService {
  constructor(
    private readonly agentRuntime: AgentRuntimeService,
    private readonly brainContext: BrainContextService,
    private readonly campaignContext: CampaignContextService,
    private readonly integrationContext: IntegrationContextService,
    private readonly contextAccountingService: ChatContextAccountingService,
    private readonly documentContextService: ChatDocumentContextService,
    private readonly gatewayInputService: ChatGatewayInputService,
    private readonly messageEnrichmentService: ChatMessageEnrichmentService,
    private readonly modelInputService: ChatModelInputService,
    private readonly profileContextService: ChatProfileContextService,
    private readonly sessionHistoryService: ChatSessionHistoryService,
    private readonly setupEventsService: ChatSetupEventsService,
    private readonly agentPolicy?: AgentPolicyService,
  ) {}

  async prepare(input: PrepareGatewayInput): Promise<PreparedGatewayTurn> {
    const {
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
      messageScopeSpaceId,
      prewarmedStableContext,
      stableTurnContext,
      runPlatformTool,
      sendPreRunEvent,
      sendSetupStatus,
      logChatTiming,
      recordTimingSpan,
      logger,
    } = input
    const {
      resolvedCampaignId,
      extraCampaignIds = [],
      runtime,
      resolvedAgentId,
      agentReg,
      selectedSettings,
      gatewayModelId,
      policyScope,
      hasCampaignAccess,
      userBrainAccess,
      resolvedPolicy,
      useWikiContext,
    } = stableTurnContext

    const hasCurrentImageAttachments =
      documents?.some((doc) => doc.type === 'image' && (!!doc.fileUrl || !!doc.dataUrl)) ?? false
    if (hasCurrentImageAttachments) {
      this.modelInputService.assertImageInputSupported(gatewayModelId)
    }
    logChatTiming('stable_context_ready', {
      cache_hit: Boolean(prewarmedStableContext),
      resolved_agent_id: resolvedAgentId,
      gateway_agent_id: runtime.gatewayAgentId,
      has_campaign_access: hasCampaignAccess,
      user_brain_access: userBrainAccess,
      selected_model_source: stableTurnContext.selectedModelSource,
      requested_model: selectedSettings.requestedModelId,
      gateway_model_id: gatewayModelId,
    })

    const openClawSkillCatalog = await this.modelInputService
      .resolveOpenClawSkillCatalog({
        agentKey: runtime.agentKey,
        userId,
        orgId,
        agentReg,
      })
      .catch((err) => {
        logger.warn(`Runtime skill catalog resolve failed: ${err}`)
        return undefined
      })
    logChatTiming('skill_catalog_ready', {
      skill_catalog_entries: openClawSkillCatalog?.entries.length ?? 0,
    })

    const agentToken = process.env.VIBEY_AGENT_TOKEN ?? ''
    const resolvedChannel =
      source === 'telegram' ? 'telegram' : source === 'slack' ? 'slack' : 'studio'
    const lastUserMessage = content
    const sessionKey = this.agentRuntime.buildChatSessionKey({
      gatewayAgentId: runtime.gatewayAgentId,
      agentKey: runtime.agentKey,
      userId,
      conversationId,
      campaignId: resolvedCampaignId,
      spaceId: messageScopeSpaceId ?? undefined,
      orgId,
    })
    const skipPreviousImages = resolvedChannel !== 'studio'
    const cortexMaxEnabled = modelSettings?.cortex_max !== false
    const brainContextSeed = `${conversationId}:${resolvedAgentId ?? 'agent'}:${lastUserMessage}`
    const publicAgentQuickContext = this.shouldUsePublicAgentQuickContext(source, lastUserMessage)
      ? this.buildPublicAgentQuickContext(agentReg, resolvedAgentId)
      : ''
    const operationalAgendaQuickPath = shouldSkipBrainContextForOperationalAgenda(lastUserMessage)
    const shouldBuildBrainContext =
      cortexMaxEnabled && !publicAgentQuickContext && !operationalAgendaQuickPath
    const brainContextStartedAt = Date.now()
    const retrievalReceipts: BrainRetrievalReceipt[] = []
    const userBrainSummary = shouldBuildBrainContext
      ? await runPlatformTool(
          {
            ...BRAIN_CONTEXT_TOOL,
            seed: brainContextSeed,
            id: `platform-brain-context-${conversationId}`,
          },
          () =>
            this.brainContext
              .buildFullContext(
                userId,
                resolvedAgentId,
                lastUserMessage,
                orgId,
                !!channelUser,
                userBrainAccess,
                useWikiContext,
                resolvedCampaignId,
                {
                  extraCampaignIds,
                  onRetrievalReceipt: (receipt) => retrievalReceipts.push(receipt),
                },
              )
              .catch((err) => {
                logger.warn(`Brain context failed: ${err}`)
                return ''
              }),
        )
      : ''
    recordTimingSpan?.('brain_context', brainContextStartedAt, {
      skipped: !shouldBuildBrainContext,
      skip_reason: !cortexMaxEnabled
        ? 'cortex_max_disabled'
        : publicAgentQuickContext
          ? 'public_agent_low_context'
          : operationalAgendaQuickPath
            ? 'canonical_operational_agenda'
          : null,
      brain_context_chars: userBrainSummary.length,
      quick_context_chars: publicAgentQuickContext.length,
      user_brain_access: userBrainAccess,
      use_wiki_context: useWikiContext,
    })
    await sendPreRunEvent('status', {
      phase: 'thinking',
      message: this.setupEventsService.pickDeterministicLabel(
        CONTEXT_READY_STATUS_LABELS,
        `${brainContextSeed}:ready`,
      ),
    })
    logChatTiming('brain_context_done', {
      brain_context_chars: userBrainSummary.length,
      quick_context_chars: publicAgentQuickContext.length,
      skipped_for_public_intent: Boolean(publicAgentQuickContext),
      skipped_for_operational_agenda: operationalAgendaQuickPath,
      user_brain_access: userBrainAccess,
      use_wiki_context: useWikiContext,
      cortex_max: cortexMaxEnabled,
    })

    const enrichment = await this.messageEnrichmentService.buildEnrichedMessage({
      content,
      conversationId,
      resolvedCampaignId,
      userId,
      orgId,
      resolvedAgentId,
      runtime,
      documents,
      highlightedArtifacts,
      messageReferences,
      runPlatformTool,
      logger,
    })
    let latestUserContent = enrichment.latestUserContent
    const {
      combinedDocumentContext,
      highlightedArtifactsContext,
      messageReferencesContext,
      slashCommandContext,
      resolvedSlashCommands,
    } = enrichment
    logChatTiming('enriched_user_content_ready', {
      latest_user_content_chars: latestUserContent.length,
      document_context_chars: combinedDocumentContext.length,
      highlighted_artifacts_chars: highlightedArtifactsContext.length,
      message_references_chars: messageReferencesContext.length,
      slash_command_count: resolvedSlashCommands.length,
    })

    const runtimeContext = await this.loadRuntimeContext({
      prewarmedStableContext,
      skipPreviousImages,
      hasCampaignAccess,
      conversationId,
      resolvedCampaignId,
      resolvedAgentId,
      userId,
      orgId,
      logger,
    })
    logChatTiming('runtime_context_done', {
      previous_image_count: runtimeContext.previousImageUrls.length,
      user_profile_chars: runtimeContext.userProfileSummary.length,
      team_roster_chars: runtimeContext.teamRosterSummary.length,
      campaign_team_chars: runtimeContext.campaignTeamSummary.length,
      theme_chars: runtimeContext.themeSummary.length,
      integration_chars: runtimeContext.integrationSummary.length,
      agent_brain_present: runtimeContext.agentBrainPresence.hasAgentBrain,
    })

    const gatewayInputStartedAt = Date.now()
    const gatewayInputContext = await this.gatewayInputService.buildContext({
      agentBrainPresence: runtimeContext.agentBrainPresence,
      agentPolicy: this.agentPolicy,
      agentReg,
      agentToken,
      callerContext: [systemContext?.trim() ?? '', publicAgentQuickContext]
        .filter(Boolean)
        .join('\n\n'),
      campaignTeamSummary: runtimeContext.campaignTeamSummary,
      channelUser,
      combinedDocumentContext,
      contextAccountingService: this.contextAccountingService,
      conversationId,
      documentContextService: this.documentContextService,
      documents,
      hasCampaignAccess,
      highlightedArtifactsContext,
      integrationSummary: runtimeContext.integrationSummary,
      latestUserContent,
      logger,
      logChatTiming,
      messageReferencesContext,
      modelInputService: this.modelInputService,
      orgId,
      organizationWideDataAccess: organizationWideDataAccess === true,
      policyScope,
      previousImageUrls: runtimeContext.previousImageUrls,
      resolvedAgentId,
      resolvedCampaignId,
      resolvedChannel,
      resolvedPolicy,
      sendSetupStatus,
      slashCommandContext,
      teamRosterSummary: runtimeContext.teamRosterSummary,
      themeSummary: runtimeContext.themeSummary,
      userBrainAccess,
      userBrainSummary,
      userId,
      userProfileSummary: runtimeContext.userProfileSummary,
    })
    recordTimingSpan?.('gateway_input', gatewayInputStartedAt, gatewayInputContext.timing)
    latestUserContent = gatewayInputContext.latestUserContent
    logChatTiming('dynamic_context_ready', gatewayInputContext.timing)

    const { sessionContextGap, conversationHistoryBlock } =
      this.sessionHistoryService.buildRepairContext({
        history,
        sessionKey,
        conversationId,
        logger,
      })
    return this.buildPreparedGatewayTurn({
      conversationId,
      sessionKey,
      openClawSkillCatalog,
      resolvedChannel,
      resolvedSlashCommands,
      gatewayInputContext,
      latestUserContent,
      conversationHistoryBlock,
      sessionContextGap,
      retrievalReceipts,
      logChatTiming,
    })
  }

  private buildPreparedGatewayTurn(input: {
    conversationId: string
    sessionKey: string
    openClawSkillCatalog?: OpenClawSkillCatalog
    resolvedChannel: ChatGatewayChannel
    resolvedSlashCommands: ResolvedSlashCommand[]
    gatewayInputContext: ChatGatewayInputContext
    latestUserContent: string
    conversationHistoryBlock: string
    sessionContextGap: unknown
    retrievalReceipts: BrainRetrievalReceipt[]
    logChatTiming: (stage: string, extra?: Record<string, unknown>) => void
  }): PreparedGatewayTurn {
    input.logChatTiming('session_integrity_checked', {
      session_context_gap: Boolean(input.sessionContextGap),
      reconstructed_history_chars: input.conversationHistoryBlock.length,
    })
    input.logChatTiming('input_array_build_start')
    const inputArray = this.gatewayInputService.buildInputArray({
      conversationHistoryBlock: input.conversationHistoryBlock,
      dynamicContextParts: input.gatewayInputContext.dynamicContextParts,
      effectiveFileParts: input.gatewayInputContext.effectiveFileParts,
      effectiveImageParts: input.gatewayInputContext.effectiveImageParts,
      latestUserContent: input.latestUserContent,
    })
    input.logChatTiming('input_array_ready', {
      dynamic_context_part_count: input.gatewayInputContext.dynamicContextParts.length,
      dynamic_context_chars: input.gatewayInputContext.dynamicContextParts.join('\n\n').length,
      input_items: inputArray.length,
      image_part_count: input.gatewayInputContext.effectiveImageParts.length,
      file_part_count: input.gatewayInputContext.effectiveFileParts.length,
      disabled_native_action_count: input.gatewayInputContext.disabledNativeActions.length,
      session_context_gap: Boolean(input.sessionContextGap),
      reconstructed_history_chars: input.conversationHistoryBlock.length,
    })

    return {
      resolvedChannel: input.resolvedChannel,
      sessionKey: input.sessionKey,
      openClawSkillCatalog: input.openClawSkillCatalog,
      resolvedSlashCommands: input.resolvedSlashCommands,
      disabledNativeActions: input.gatewayInputContext.disabledNativeActions,
      enabledToolkitsForGateway: input.gatewayInputContext.enabledToolkitsForGateway,
      gatewayToolPolicySlice: input.gatewayInputContext.gatewayToolPolicySlice,
      instructions: input.gatewayInputContext.instructions,
      measuredContextSlices: input.gatewayInputContext.measuredContextSlices,
      inputArray,
      retrievalReceipts: input.retrievalReceipts,
    }
  }

  private async loadRuntimeContext(input: {
    prewarmedStableContext: ChatStablePrewarmContext | null
    skipPreviousImages: boolean
    hasCampaignAccess: boolean
    conversationId: string
    resolvedCampaignId?: string
    resolvedAgentId: string
    userId: string
    orgId?: string
    logger: Pick<Logger, 'warn'>
  }): Promise<{
    previousImageUrls: Array<{ filename: string; url: string }>
    userProfileSummary: string
    teamRosterSummary: string
    campaignTeamSummary: string
    themeSummary: string
    integrationSummary: string
    agentBrainPresence: { hasAgentBrain: boolean; brainId: string | null }
  }> {
    if (input.prewarmedStableContext) {
      return {
        previousImageUrls: input.prewarmedStableContext.previousImageUrls,
        userProfileSummary: input.prewarmedStableContext.userProfileSummary,
        teamRosterSummary: input.prewarmedStableContext.teamRosterSummary,
        campaignTeamSummary: input.prewarmedStableContext.campaignTeamSummary,
        themeSummary: input.prewarmedStableContext.themeSummary,
        integrationSummary: input.prewarmedStableContext.integrationSummary,
        agentBrainPresence: input.prewarmedStableContext.agentBrainPresence,
      }
    }
    const [
      previousImageUrls,
      userProfileSummary,
      teamRosterSummary,
      campaignTeamSummary,
      themeSummary,
      integrationSummary,
      agentBrainPresence,
    ] = await Promise.all([
      input.skipPreviousImages
        ? Promise.resolve([] as Array<{ filename: string; url: string }>)
        : this.documentContextService.loadPreviousImageUrls(input.conversationId).catch((err) => {
            input.logger.warn(`Failed to load previous image URLs: ${err}`)
            return [] as Array<{ filename: string; url: string }>
          }),
      input.hasCampaignAccess
        ? this.profileContextService
            .buildUserProfileSummary(input.userId, input.orgId)
            .catch((err) => {
              input.logger.warn(`User profile context failed: ${err}`)
              return ''
            })
        : Promise.resolve(''),
      input.resolvedAgentId === 'atlas' || input.resolvedAgentId === 'hr'
        ? this.profileContextService
            .buildTeamRosterContext(input.userId, input.orgId, input.resolvedAgentId)
            .catch((err) => {
              input.logger.warn(`Team roster context failed: ${err}`)
              return ''
            })
        : Promise.resolve(''),
      input.hasCampaignAccess
        ? this.profileContextService
            .buildCampaignTeamContext(input.resolvedCampaignId)
            .catch((err) => {
              input.logger.warn(`Campaign team context failed: ${err}`)
              return ''
            })
        : Promise.resolve(''),
      input.hasCampaignAccess && input.resolvedCampaignId
        ? this.campaignContext
            .buildThemeSummary(input.userId, input.resolvedCampaignId, input.orgId)
            .catch((err) => {
              input.logger.warn(`Theme context failed: ${err}`)
              return ''
            })
        : Promise.resolve(''),
      input.hasCampaignAccess
        ? this.integrationContext
            .buildIntegrationContext(input.userId, input.resolvedAgentId, input.orgId)
            .catch((err) => {
              input.logger.warn(`Integration context failed: ${err}`)
              return ''
            })
        : Promise.resolve(''),
      this.brainContext
        .resolveAgentBrainPresence(input.userId, input.resolvedAgentId, input.orgId)
        .catch((err) => {
          input.logger.warn(`Agent brain presence resolve failed: ${err}`)
          return { hasAgentBrain: false, brainId: null }
        }),
    ])

    return {
      previousImageUrls,
      userProfileSummary,
      teamRosterSummary,
      campaignTeamSummary,
      themeSummary,
      integrationSummary,
      agentBrainPresence,
    }
  }

  private shouldUsePublicAgentQuickContext(source: string | undefined, content: string): boolean {
    if (source !== 'public_agent') return false
    const normalized = content
      .trim()
      .toLowerCase()
      .replace(/[!?.,]+$/g, '')
    if (!normalized || normalized.length > 180) return false
    if (/^(hi|hello|hey|yo|sup|gm|good morning|good afternoon|good evening)$/.test(normalized)) {
      return true
    }
    return PUBLIC_AGENT_META_PROMPTS.some((prompt) => normalized.includes(prompt))
  }

  private buildPublicAgentQuickContext(
    agentReg: Record<string, unknown> | null,
    resolvedAgentId: string,
  ): string {
    const config = (agentReg?.config as Record<string, unknown> | null) ?? {}
    const capabilityDomain =
      typeof config.capability_domain === 'string' ? config.capability_domain : ''
    const profile = [
      'PUBLIC AGENT FAST CONTEXT:',
      `- Agent key: ${resolvedAgentId}`,
      capabilityDomain ? `- Capability domain: ${capabilityDomain}` : '',
      '- For greetings or meta questions, briefly explain how this agent helps and invite a specific question.',
    ].filter(Boolean)
    return profile.join('\n')
  }
}
