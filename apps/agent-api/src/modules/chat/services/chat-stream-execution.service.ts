import { Injectable, Logger, Optional } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import {
  isModelStrategy,
  resolveChatStageModel,
  resolveFallbackForStrategy,
  type ModelStrategy,
} from '@vibey/api-shared'
import { ArtifactsService } from '../../artifacts/services/artifacts.service'
import { executeArtifactRead } from './chat-artifact-read-execution'
import {
  AUTO_WRITER_INSTRUCTIONS,
  buildAutoWriterInput,
  mergeAutoStageResults,
  withGenerationStage,
} from './chat-auto-pipeline'
import {
  formatCampaignIntelligenceResearch,
  isCampaignStatusRequest,
} from './chat-campaign-intelligence.util'
import { runCanonicalTaskLookup } from './chat-canonical-task-lookup.util'
import {
  ChatModelInputService,
  type ChatModelSettings,
  type ValidatedModelSettings,
} from './chat-model-input.service'
import { formatOperationalAgenda } from './chat-operational-agenda-format.util'
import {
  extractCanonicalTaskLookupTitle,
  isOperationalCalendarRequest,
  isOperationalPriorityRecommendationRequest,
  isOperationalTaskRequest,
  resolveOperationalCalendarWindow,
  shouldSkipBrainContextForOperationalAgenda,
} from './chat-operational-agenda.util'
import type { ChatRunCheckpointKind } from './chat-run-checkpoint.service'
import { ChatStreamRecoveryService } from './chat-stream-recovery.service'
import {
  OpenClawProxyService,
  type OpenClawCompletionResult,
  type OpenClawInputMessage,
  type OpenClawSkillCatalog,
  type SendFn,
  type TraceRecoveryEvent,
} from './openclaw-proxy.service'
import type { ToolStep } from './openclaw-proxy.service'

const CONTINUATION_PROMPT =
  'Continue your previous response from exactly where you left off. Do not repeat prior text. Produce only the continuation.'
type RecordCheckpoint = (
  kind: ChatRunCheckpointKind,
  checkpoint: {
    summary: string
    remainingWork?: string | null
    lastCursor?: string | null
    toolCount?: number
    contentLength?: number
    contextWindowTokens?: number | null
    lastCallInputTokens?: number | null
    compactionCount?: number | null
    rawSnapshot?: Record<string, unknown>
  },
) => Promise<void>

export interface ChatStreamExecutionInput {
  chatDiag: string
  chatTimingLogsEnabled: boolean
  channel: 'telegram' | 'slack' | 'studio'
  conversationId: string
  campaignId?: string | null
  disabledNativeActions: string[]
  enabledToolkitsForGateway?: string[]
  gatewayAgentId: string
  gatewayModelId: string
  generationStage?: 'research' | 'write'
  getAccumulatedContent: () => string
  identitySuffix?: string
  inputArray: OpenClawInputMessage[]
  instructions: string
  logChatFlow: (message: string) => void
  logger: Logger
  modelSettings?: ChatModelSettings
  openClawSkillCatalog?: OpenClawSkillCatalog
  progressiveSend: SendFn
  recordRunCheckpoint: RecordCheckpoint
  relaxedResponseFilter: boolean
  selectedModelInput: string | null
  selectedSettings: ValidatedModelSettings
  sessionKey: string
  signal?: AbortSignal
  traceId?: string | null
  messageId?: string | null
  runId?: string | null
  requestId?: string | null
  userContent: string
  userId: string
  orgId?: string | null
}

@Injectable()
export class ChatStreamExecutionService {
  constructor(
    private readonly openClaw: OpenClawProxyService,
    private readonly streamRecoveryService: ChatStreamRecoveryService,
    private readonly modelInputService: ChatModelInputService,
    @Optional() private readonly moduleRef?: ModuleRef,
  ) {}

  async run(input: ChatStreamExecutionInput): Promise<OpenClawCompletionResult> {
    if (input.selectedModelInput === 'auto') {
      return this.runAutoPipeline(input)
    }
    return this.runWithRecovery(input)
  }

  private async runWithRecovery(
    input: ChatStreamExecutionInput,
  ): Promise<OpenClawCompletionResult> {
    let result = await this.streamCompletion(input, input.inputArray, input.gatewayModelId)

    if (result.truncated && result.content.trim().length > 0) {
      result = await this.continueTruncatedResult(input, result)
    }

    if (
      result.failed === 'stream_stalled' &&
      result.content.length === 0 &&
      result.toolSteps.length === 0
    ) {
      result = await this.retryEmptyStall(input)
    }

    const hadEmptyResponse =
      !result.failed && result.content.length === 0 && result.toolSteps.length === 0
    if (hadEmptyResponse) {
      result = await this.retryEmptyOpenClone(input)
      if (!result.failed && result.content.length === 0 && result.toolSteps.length === 0) {
        result = {
          ...result,
          failed: 'empty_agent_response',
          recoveryEvents: (result.recoveryEvents ?? []).map((event) =>
            event.type === 'empty_response_retry'
              ? { ...event, status: 'failed' as const, reason: 'empty_agent_response' }
              : event,
          ),
        }
      }
    }

    if (result.failed && this.streamRecoveryService.isRetryableProviderError(result.failed)) {
      result = await this.retryBusyProvider(input, result)
    }

    if (
      result.failed &&
      this.streamRecoveryService.isRetryableProviderError(result.failed) &&
      isModelStrategy(input.selectedModelInput)
    ) {
      result = await this.retryFallbackModel(input, result)
    }

    return result
  }

  private async runAutoPipeline(
    input: ChatStreamExecutionInput,
  ): Promise<OpenClawCompletionResult> {
    const researchRoute = resolveChatStageModel('auto', 'research')
    const writerRoute = resolveChatStageModel('auto', 'write')
    const operationalAgendaQuickPath = shouldSkipBrainContextForOperationalAgenda(input.userContent)
    const operationalPriorityRecommendation =
      operationalAgendaQuickPath && isOperationalPriorityRecommendationRequest(input.userContent)
    const canonicalTaskLookupTitle = extractCanonicalTaskLookupTitle(input.userContent)
    const campaignIntelligenceQuickPath = isCampaignStatusRequest(input.userContent)
    const campaignScopeRequired = campaignIntelligenceQuickPath && !input.campaignId
    const directResearchOutput =
      canonicalTaskLookupTitle ||
      campaignScopeRequired ||
      (operationalAgendaQuickPath && !operationalPriorityRecommendation)
    const writerModelSettings = operationalAgendaQuickPath
      ? { ...writerRoute.modelSettings, reasoning_effort: 'low' as const }
      : writerRoute.modelSettings
    const researchSettings =
      canonicalTaskLookupTitle || operationalAgendaQuickPath || campaignIntelligenceQuickPath
        ? null
        : await this.modelInputService.validateModelSettings(
            researchRoute.modelId,
            researchRoute.modelSettings,
          )
    const writerSettings = directResearchOutput
      ? null
      : await this.modelInputService.validateModelSettings(writerRoute.modelId, writerModelSettings)
    const researchSend: SendFn = async (type, data) => {
      if (type === 'content_delta' || type === 'thinking_delta') return
      await input.progressiveSend(type, data)
    }
    const artifacts = this.moduleRef?.get(ArtifactsService, { strict: false })
    const researchResult = canonicalTaskLookupTitle
      ? await runCanonicalTaskLookup(input, artifacts, canonicalTaskLookupTitle)
      : operationalAgendaQuickPath
        ? await this.runOperationalAgendaResearch(input)
        : campaignIntelligenceQuickPath
          ? await this.runCampaignIntelligenceResearch(input)
          : await this.runWithRecovery({
              ...input,
              gatewayModelId: researchRoute.modelId,
              generationStage: 'research',
              instructions: input.instructions,
              progressiveSend: researchSend,
              selectedModelInput: 'auto:economy',
              selectedSettings: researchSettings!,
            })
    if (campaignScopeRequired && researchResult.content.trim().length > 0) {
      const guidanceResult = { ...researchResult, failed: undefined }
      await input.progressiveSend('content_delta', { content: guidanceResult.content })
      return withGenerationStage(guidanceResult, 'research')
    }
    if (
      researchResult.failed ||
      (researchResult.content.trim().length === 0 && researchResult.toolSteps.length === 0)
    ) {
      return withGenerationStage(researchResult, 'research')
    }
    if (directResearchOutput) {
      await input.progressiveSend('content_delta', { content: researchResult.content })
      return withGenerationStage(researchResult, 'research')
    }

    const writerInput = buildAutoWriterInput(input.userContent, researchResult)
    const writerResult = await this.streamCompletion(
      {
        ...input,
        gatewayModelId: writerRoute.modelId,
        instructions: AUTO_WRITER_INSTRUCTIONS,
        inputArray: writerInput,
        selectedSettings: writerSettings!,
        sessionKey: `${input.sessionKey}:writer:${input.runId ?? input.messageId ?? 'turn'}`,
      },
      writerInput,
      writerRoute.modelId,
      writerSettings!.openClaw,
      {
        generationStage: 'write',
        sessionKey: `${input.sessionKey}:writer:${input.runId ?? input.messageId ?? 'turn'}`,
        toolChoice: 'none',
      },
    )

    const stagedResearch = withGenerationStage(researchResult, 'research')
    const stagedWriter = withGenerationStage(writerResult, 'write')
    if (writerResult.failed || writerResult.content.trim().length === 0) {
      await input.progressiveSend('content_delta', { delta: researchResult.content })
      return mergeAutoStageResults(stagedResearch, stagedWriter, {
        content: researchResult.content,
        failed: undefined,
        recoveryEvent: this.buildRecoveryEvent(
          'writer_fallback_to_research',
          'recovered',
          writerResult.failed ?? 'empty_writer_response',
        ),
      })
    }

    return mergeAutoStageResults(stagedResearch, stagedWriter, {
      content: writerResult.content,
      failed: writerResult.failed,
    })
  }

  private async runOperationalAgendaResearch(
    input: ChatStreamExecutionInput,
  ): Promise<OpenClawCompletionResult> {
    const artifacts = this.moduleRef?.get(ArtifactsService, { strict: false })
    if (!artifacts) {
      return {
        content: '',
        toolSteps: [],
        failed: 'operational_agenda_executor_unavailable',
      }
    }

    const wantsTasks = isOperationalTaskRequest(input.userContent)
    const wantsCalendar = isOperationalCalendarRequest(input.userContent)
    const actions: Array<Promise<ToolStep>> = []
    if (wantsTasks) {
      actions.push(
        executeArtifactRead(input, artifacts, {
          action: 'list_tasks',
          label: 'Retrieving your open assigned tasks',
          data: { assigned_to_me: true, include_closed: false, include_count: true },
        }),
      )
    }
    if (wantsCalendar) {
      const { start, end, label } = resolveOperationalCalendarWindow(input.userContent)
      actions.push(
        executeArtifactRead(input, artifacts, {
          action: 'list_calendar_events',
          label,
          data: { start, end },
        }),
      )
    }

    const toolSteps = await Promise.all(actions)
    const failedStep = toolSteps.find((step) => step.status === 'failed')
    return {
      content: formatOperationalAgenda(toolSteps),
      toolSteps,
      ...(failedStep ? { failed: failedStep.error ?? `${failedStep.name} failed` } : {}),
    }
  }

  private async runCampaignIntelligenceResearch(
    input: ChatStreamExecutionInput,
  ): Promise<OpenClawCompletionResult> {
    const artifacts = this.moduleRef?.get(ArtifactsService, { strict: false })
    if (!artifacts) {
      return {
        content: '',
        toolSteps: [],
        failed: 'campaign_intelligence_executor_unavailable',
      }
    }
    if (!input.campaignId) {
      return {
        content:
          'I need one specific client campaign before I can retrieve live reporting. Select the client campaign or name it unambiguously, then ask again.',
        toolSteps: [],
        failed: 'campaign_scope_required',
      }
    }

    const campaignId = input.campaignId
    const toolSteps = await Promise.all([
      executeArtifactRead(input, artifacts, {
        action: 'get_campaign_main_dashboard',
        label: 'Retrieving live campaign performance',
        data: { campaign_id: campaignId, refresh: true },
      }),
      executeArtifactRead(input, artifacts, {
        action: 'search_campaign_brain',
        label: 'Cross-referencing campaign decisions and context',
        data: { campaign_id: campaignId, query: input.userContent, limit: 10 },
      }),
      executeArtifactRead(input, artifacts, {
        action: 'list_tasks',
        label: 'Retrieving open campaign work',
        data: { campaign_id: campaignId, include_closed: false, include_count: true },
      }),
    ])
    const dashboard = toolSteps.find(
      (step) => (step.action ?? step.name) === 'get_campaign_main_dashboard',
    )
    return {
      content: formatCampaignIntelligenceResearch(campaignId, toolSteps),
      toolSteps,
      ...(dashboard?.status === 'failed'
        ? { failed: dashboard.error ?? 'get_campaign_main_dashboard failed' }
        : {}),
    }
  }

  private streamCompletion(
    input: ChatStreamExecutionInput,
    messages: OpenClawInputMessage[],
    model: string | undefined,
    modelSettings = input.selectedSettings.openClaw,
    overrides?: {
      generationStage?: 'research' | 'write'
      sessionKey?: string
      toolChoice?: 'none'
    },
  ): Promise<OpenClawCompletionResult> {
    return this.openClaw.streamCompletion({
      input: messages,
      instructions: input.instructions,
      send: input.progressiveSend,
      model,
      agentId: input.gatewayAgentId,
      sessionKey: overrides?.sessionKey ?? input.sessionKey,
      conversationId: input.conversationId,
      campaignId: input.campaignId,
      orgId: input.orgId,
      traceId: input.traceId,
      messageId: input.messageId,
      runId: input.runId,
      requestId: input.requestId,
      userId: input.userId,
      signal: input.signal,
      channel: input.channel,
      relaxedResponseFilter: input.relaxedResponseFilter,
      identitySuffix: input.identitySuffix,
      enabledToolkits: input.enabledToolkitsForGateway,
      disabledNativeActions: input.disabledNativeActions,
      skillCatalog: input.openClawSkillCatalog,
      modelSettings,
      generationStage: overrides?.generationStage ?? input.generationStage,
      toolChoice: overrides?.toolChoice,
    })
  }

  private buildRecoveryEvent(
    type: string,
    status: TraceRecoveryEvent['status'],
    reason?: string,
    metadata?: Record<string, unknown>,
  ): TraceRecoveryEvent {
    return {
      type,
      status,
      ...(reason ? { reason: reason.slice(0, 500) } : {}),
      at: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    }
  }

  private async continueTruncatedResult(
    input: ChatStreamExecutionInput,
    result: OpenClawCompletionResult,
  ): Promise<OpenClawCompletionResult> {
    const continuationInput: OpenClawInputMessage[] = [
      {
        type: 'message',
        role: 'assistant',
        content: result.content,
      },
      {
        type: 'message',
        role: 'user',
        content: CONTINUATION_PROMPT,
      },
    ]
    const continuationResult = await this.streamCompletion(
      input,
      continuationInput,
      input.gatewayModelId || undefined,
    )
    const recoveryEvent = this.buildRecoveryEvent(
      'truncation_continuation',
      continuationResult.failed ? 'failed' : 'recovered',
      continuationResult.failed ?? 'truncated',
    )
    return {
      ...continuationResult,
      content: `${result.content}${continuationResult.content}`,
      toolSteps: [...result.toolSteps, ...continuationResult.toolSteps],
      usage: continuationResult.usage ?? result.usage,
      generationId: continuationResult.generationId ?? result.generationId,
      completedGenerations: [
        ...(result.completedGenerations ?? []),
        ...(continuationResult.completedGenerations ?? []),
      ],
      fullSystemPrompt: continuationResult.fullSystemPrompt ?? result.fullSystemPrompt,
      llmInput: continuationResult.llmInput ?? result.llmInput,
      llmOutput: continuationResult.llmOutput ?? result.llmOutput,
      recoveryEvents: [
        ...(result.recoveryEvents ?? []),
        recoveryEvent,
        ...(continuationResult.recoveryEvents ?? []),
      ],
    }
  }

  private async retryEmptyStall(
    input: ChatStreamExecutionInput,
  ): Promise<OpenClawCompletionResult> {
    if (input.chatTimingLogsEnabled) {
      input.logger.warn(
        `[ChatFlow] stall_retry ${input.chatDiag} model=${input.gatewayModelId ?? 'default'} reason=empty_stall`,
      )
    }
    await input.progressiveSend('status', {
      phase: 'thinking',
      message: 'Connection timed out — retrying',
    })
    const retryResult = await this.streamCompletion(input, input.inputArray, input.gatewayModelId)
    return {
      ...retryResult,
      recoveryEvents: [
        ...(retryResult.recoveryEvents ?? []),
        this.buildRecoveryEvent(
          'empty_stall_retry',
          retryResult.failed ? 'failed' : 'recovered',
          retryResult.failed ?? 'stream_stalled',
        ),
      ],
    }
  }

  private async retryEmptyOpenClone(
    input: ChatStreamExecutionInput,
  ): Promise<OpenClawCompletionResult> {
    if (input.chatTimingLogsEnabled) {
      input.logger.warn(
        `[ChatFlow] empty_response_retry ${input.chatDiag} model=${input.gatewayModelId ?? 'default'} reason=open_clone`,
      )
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 1500))
    await input.progressiveSend('status', { phase: 'thinking', message: 'Reconnecting...' })
    const retryResult = await this.streamCompletion(
      input,
      input.inputArray,
      input.gatewayModelId || undefined,
    )
    return {
      ...retryResult,
      recoveryEvents: [
        ...(retryResult.recoveryEvents ?? []),
        this.buildRecoveryEvent(
          'empty_response_retry',
          retryResult.failed ? 'failed' : 'recovered',
          retryResult.failed ?? 'empty_agent_response',
        ),
      ],
    }
  }

  private async retryFallbackModel(
    input: ChatStreamExecutionInput,
    failedResult: OpenClawCompletionResult,
  ): Promise<OpenClawCompletionResult> {
    const failure = failedResult.failed ?? 'provider_busy'
    const fallback = resolveFallbackForStrategy(input.selectedModelInput as ModelStrategy, 'chat')
    const fallbackSettings = await this.modelInputService.validateModelSettings(
      fallback.modelId,
      this.modelInputService.mergeResolvedModelSettings(fallback, input.modelSettings),
    )
    if (input.chatTimingLogsEnabled) {
      input.logger.warn(
        `[ChatFlow] fallback_retry ${input.chatDiag} fromModel=${input.gatewayModelId ?? 'default'} toModel=${fallback.modelId} reason=${failure}`,
      )
    }
    await input.progressiveSend('status', {
      phase: 'thinking',
      message: 'Primary model is busy, switching to fallback',
    })
    const retryResult = await this.streamCompletion(
      input,
      input.inputArray,
      fallback.modelId,
      fallbackSettings.openClaw,
    )
    return {
      ...retryResult,
      recoveryEvents: [
        ...(failedResult.recoveryEvents ?? []),
        ...(retryResult.recoveryEvents ?? []),
        this.buildRecoveryEvent(
          'fallback_model_retry',
          retryResult.failed ? 'failed' : 'recovered',
          failure,
          {
            from_model: input.gatewayModelId ?? null,
            to_model: fallback.modelId,
          },
        ),
      ],
    }
  }

  private async retryBusyProvider(
    input: ChatStreamExecutionInput,
    failedResult: OpenClawCompletionResult,
  ): Promise<OpenClawCompletionResult> {
    const failure = failedResult.failed ?? 'provider_busy'
    if (input.chatTimingLogsEnabled) {
      input.logger.warn(
        `[ChatFlow] provider_busy_retry ${input.chatDiag} model=${input.gatewayModelId ?? 'default'} reason=${failure}`,
      )
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 5000))
    await input.progressiveSend('status', {
      phase: 'thinking',
      message: 'Pixel is busy — retrying your message',
    })
    const retryResult = await this.streamCompletion(
      input,
      input.inputArray,
      input.gatewayModelId || undefined,
    )
    return {
      ...retryResult,
      recoveryEvents: [
        ...(failedResult.recoveryEvents ?? []),
        ...(retryResult.recoveryEvents ?? []),
        this.buildRecoveryEvent(
          'provider_busy_retry',
          retryResult.failed ? 'failed' : 'recovered',
          retryResult.failed ?? failure,
          {
            model: input.gatewayModelId ?? null,
            delay_ms: 5000,
          },
        ),
      ],
    }
  }
}
