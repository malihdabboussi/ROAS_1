import { Injectable, Logger } from '@nestjs/common'
import type { ContextBreakdown, ContextCategorySlice } from '@vibey/context-breakdown'
import { ChatCompletionSideEffectsService } from './chat-completion-side-effects.service'
import { ChatContextAccountingService } from './chat-context-accounting.service'
import type { ChatModelSettings, ValidatedModelSettings } from './chat-model-input.service'
import type { ChatRunCheckpointKind } from './chat-run-checkpoint.service'
import { ChatRunEventStoreService } from './chat-run-event-store.service'
import { ChatSessionHistoryService } from './chat-session-history.service'
import type { ChatStreamExecutionInput } from './chat-stream-execution.service'
import { ChatStreamExecutionService } from './chat-stream-execution.service'
import { ChatStreamRecoveryService } from './chat-stream-recovery.service'
import type {
  OpenClawInputMessage,
  OpenClawSkillCatalog,
  SendFn,
  TraceRecoveryEvent,
  TraceRecoveryStatus,
  TraceUserVisibleOutcome,
  ToolStep,
} from './openclaw-proxy.service'
import type { ResolvedSlashCommand } from './chat-slash-command.service'
import { StreamRegistryService } from './stream-registry.service'
import { TracingService } from './tracing.service'

type ChatGatewayChannel = 'telegram' | 'slack' | 'studio'
type StreamFailureStatus = 'failed' | 'failed_recoverable'
type RecordRunCheckpoint = ChatStreamExecutionInput['recordRunCheckpoint']

interface RunChatTurnStreamInput {
  chatDiag: string
  chatTimingLogsEnabled: boolean
  conversationId: string
  content: string
  defaultModelId: string
  disabledNativeActions: string[]
  enabledToolkitsForGateway?: string[]
  gatewayAgentId: string
  gatewayModelId: string
  getAccumulatedContent: () => string
  getCompletedVisibleToolCount: () => number
  inputArray: OpenClawInputMessage[]
  instructions: string
  logChatFlow: (message: string) => void
  logChatTiming: (stage: string, extra?: Record<string, unknown>) => void
  logger: Logger
  measuredContextSlices: ContextCategorySlice[]
  messageId: string
  modelSettings?: ChatModelSettings
  openClawSkillCatalog?: OpenClawSkillCatalog
  orgId?: string
  progressiveSend: SendFn
  recordRunCheckpoint: RecordRunCheckpoint
  resolvedAgentId: string
  resolvedCampaignId?: string
  resolvedChannel: ChatGatewayChannel
  resolvedSlashCommands: ResolvedSlashCommand[]
  runId: string
  requestId: string
  runtime: { gatewayAgentId: string; agentKey: string }
  selectedModelInput: string | null
  selectedSettings: ValidatedModelSettings
  sendCreditUpdate: (creditData: unknown) => void
  sessionKey: string
  signal?: AbortSignal
  startedAt: number
  streamContextWindowTokens?: number
  traceId: string | null
  userId: string
  history: Record<string, unknown>[]
  gatewayToolPolicySlice: ContextCategorySlice | null
  verifyStreamMirrorError: () => void
}

export interface ChatTurnStreamOutcome {
  toolSteps: ToolStep[]
  streamedContent?: string
  resolvedModelId?: string
  lastInputTokensActual?: number
  resultLastCallInputTokens?: number
  effectiveContextWindowTokens?: number
  resultCompactionCount?: number
  contextBreakdown?: ContextBreakdown
  terminalResult?: {
    status: StreamFailureStatus
    message: string
  }
}

@Injectable()
export class ChatTurnStreamService {
  constructor(
    private readonly streamExecution: ChatStreamExecutionService,
    private readonly streamRecovery: ChatStreamRecoveryService,
    private readonly contextAccounting: ChatContextAccountingService,
    private readonly sessionHistory: ChatSessionHistoryService,
    private readonly sideEffects: ChatCompletionSideEffectsService,
    private readonly chatRunEvents: ChatRunEventStoreService,
    private readonly streamRegistry: StreamRegistryService,
    private readonly tracing: TracingService,
  ) {}

  async run(input: RunChatTurnStreamInput): Promise<ChatTurnStreamOutcome> {
    const identitySuffix = input.runtime.agentKey === 'vibey' ? '-CEO' : undefined
    input.logChatTiming('openclaw_stream_call_start', {
      message_id: input.messageId,
      input_items: input.inputArray.length,
      instructions_chars: input.instructions.length,
      enabled_toolkit_count: input.enabledToolkitsForGateway?.length ?? 0,
      disabled_native_action_count: input.disabledNativeActions.length,
      gateway_model_id: input.gatewayModelId,
    })
    const result = await this.streamExecution.run({
      chatDiag: input.chatDiag,
      chatTimingLogsEnabled: input.chatTimingLogsEnabled,
      channel: input.resolvedChannel,
      conversationId: input.conversationId,
      campaignId: input.resolvedCampaignId ?? null,
      disabledNativeActions: input.disabledNativeActions,
      enabledToolkitsForGateway: input.enabledToolkitsForGateway,
      gatewayAgentId: input.gatewayAgentId,
      gatewayModelId: input.gatewayModelId,
      getAccumulatedContent: input.getAccumulatedContent,
      identitySuffix,
      inputArray: input.inputArray,
      instructions: input.instructions,
      logChatFlow: input.logChatFlow,
      logger: input.logger,
      modelSettings: input.modelSettings,
      openClawSkillCatalog: input.openClawSkillCatalog,
      progressiveSend: input.progressiveSend,
      recordRunCheckpoint: input.recordRunCheckpoint,
      relaxedResponseFilter: input.runtime.agentKey === 'viktor',
      selectedModelInput: input.selectedModelInput,
      selectedSettings: input.selectedSettings,
      sessionKey: input.sessionKey,
      signal: input.signal,
      traceId: input.traceId,
      messageId: input.messageId,
      runId: input.runId,
      requestId: input.requestId,
      userContent: input.content,
      userId: input.userId,
      orgId: input.orgId ?? null,
    })
    const toolSteps = result.toolSteps
    const durationMs = Date.now() - input.startedAt
    input.logChatFlow(
      `[ChatFlow] stream_result ${input.chatDiag} durationMs=${durationMs} contentLen=${result.content.length} toolSteps=${toolSteps.length} failed=${result.failed ? 'yes' : 'no'}`,
    )
    const resultLastCallInputTokens = result.lastCallInputTokens
    const effectiveContextWindowTokens =
      result.contextWindowTokens ?? input.streamContextWindowTokens
    const resultCompactionCount = result.compactionCount
    const recoveryEvents = result.recoveryEvents ?? []

    if (result.failed) {
      return this.handleFailedResult({
        ...input,
        resultFailed: result.failed,
        truncated: result.truncated ?? false,
        resultLastCallInputTokens,
        effectiveContextWindowTokens,
        resultCompactionCount,
        recoveryEvents,
        toolSteps,
      })
    }

    const resolvedModelId = this.resolveCompletedModelId(result, input.defaultModelId)
    const lastInputTokensActual = result.usage?.input_tokens as number | undefined
    const contextBreakdown = this.contextAccounting.buildContextBreakdown({
      systemPromptReport: result.systemPromptReport,
      lastCallInputTokens: resultLastCallInputTokens,
      contextWindowTokens: effectiveContextWindowTokens,
      modelId: resolvedModelId,
      extraSlices: input.gatewayToolPolicySlice
        ? [...input.measuredContextSlices, input.gatewayToolPolicySlice]
        : input.measuredContextSlices,
    })
    this.logContextBreakdown(input.conversationId, contextBreakdown, input.logger)

    const sessionMessages = Array.isArray(result.llmInput?.messages)
      ? (result.llmInput.messages as Array<{ role?: string }>)
      : []
    this.sessionHistory.recordGatewayTrace({
      history: input.history,
      sessionKey: input.sessionKey,
      conversationId: input.conversationId,
      llmMessages: sessionMessages,
      logger: input.logger,
    })

    const hasVisibleOutput = input.getAccumulatedContent().trim().length > 0 || toolSteps.length > 0
    const recovered = recoveryEvents.some((event) => event.status === 'recovered')
    const userVisibleOutcome: TraceUserVisibleOutcome = !hasVisibleOutput
      ? 'no_visible_output'
      : recovered
        ? 'recovered_output'
        : 'output_visible'
    const recoveryStatus: TraceRecoveryStatus = recovered ? 'recovered' : 'none'

    this.sideEffects.runDetached({
      agentKey: input.resolvedAgentId,
      campaignId: input.resolvedCampaignId,
      channel: input.resolvedChannel,
      contextWindowTokens: effectiveContextWindowTokens,
      conversationId: input.conversationId,
      defaultModelId: input.defaultModelId,
      durationMs,
      hasOutput: () => hasVisibleOutput,
      logger: input.logger,
      modelSettings: input.selectedSettings.request,
      orgId: input.orgId,
      prompt: input.content,
      requestedModelId: input.selectedSettings.requestedModelId,
      resolvedCommands: input.resolvedSlashCommands,
      resolvedModelId,
      result,
      sendCreditUpdate: input.sendCreditUpdate,
      sessionKey: input.sessionKey,
      toolSteps,
      traceId: input.traceId,
      terminalStatus: 'done',
      userVisibleOutcome,
      recoveryStatus,
      recoveryEvents,
      observability: {
        request_id: input.requestId,
        run_id: input.runId,
        message_id: input.messageId,
        recovery_event_count: recoveryEvents.length,
        compaction_count: resultCompactionCount ?? null,
      },
      userId: input.userId,
    })

    return {
      toolSteps,
      streamedContent: result.content,
      resolvedModelId,
      lastInputTokensActual,
      resultLastCallInputTokens,
      effectiveContextWindowTokens,
      resultCompactionCount,
      contextBreakdown,
    }
  }

  private async handleFailedResult(
    input: RunChatTurnStreamInput & {
      resultFailed: string
      truncated: boolean
      resultLastCallInputTokens?: number
      effectiveContextWindowTokens?: number
      resultCompactionCount?: number
      recoveryEvents: TraceRecoveryEvent[]
      toolSteps: ToolStep[]
    },
  ): Promise<ChatTurnStreamOutcome> {
    const classified = this.streamRecovery.classifyAgentStreamFailure(input.resultFailed)
    const recoverable = classified.code === 'context_window_exceeded'
    const status: StreamFailureStatus = recoverable ? 'failed_recoverable' : 'failed'
    this.tracing
      .failTrace(input.traceId, input.resultFailed, {
        terminalStatus: status,
        userVisibleOutcome: 'blocked',
        recoveryStatus: recoverable ? 'failed_recoverable' : 'failed_unrecoverable',
        recoveryEvents: input.recoveryEvents,
        observability: {
          request_id: input.requestId,
          run_id: input.runId,
          message_id: input.messageId,
          failure_code: classified.code,
          truncated: input.truncated,
        },
      })
      .catch(() => {})
    if (recoverable) {
      await input.progressiveSend('status', {
        phase: 'compacting',
        message: 'Summarizing the work so far',
      })
    }
    await input.recordRunCheckpoint('failure', {
      summary: recoverable
        ? 'The run hit the context window while generating a response.'
        : 'The run failed before a successful assistant completion.',
      remainingWork: recoverable ? 'Resume from this checkpoint after compacting the prior work.' : null,
      contextWindowTokens: input.effectiveContextWindowTokens ?? null,
      lastCallInputTokens: input.resultLastCallInputTokens ?? null,
      compactionCount: input.resultCompactionCount ?? null,
      rawSnapshot: {
        error_code: classified.code,
        failure_message: input.resultFailed.slice(0, 1000),
        content_length: input.getAccumulatedContent().length,
        tool_count: input.getCompletedVisibleToolCount(),
        truncated: input.truncated,
      },
    })
    if (this.streamRecovery.isRetryableProviderError(input.resultFailed)) {
      const failedMsg = input.resultFailed.toLowerCase()
      await input.progressiveSend('rate_limit_notice', {
        message:
          'The model is in high demand right now. You can try again shortly or switch to a different model.',
        model: input.gatewayModelId ?? input.defaultModelId,
        reason: failedMsg.includes('overloaded') ? 'overloaded' : 'rate_limited',
      })
      await input.progressiveSend('error', classified)
    } else {
      await input.progressiveSend('error', classified)
    }
    await (
      recoverable
        ? this.chatRunEvents.markRunRecoverableFailed(input.runId, input.resultFailed)
        : this.chatRunEvents.markRunFailed(input.runId, input.resultFailed)
    ).catch(() => null)
    input.verifyStreamMirrorError()
    this.streamRegistry.complete(input.conversationId)
    this.streamRegistry.clearAbortController(input.conversationId)
    return {
      toolSteps: input.toolSteps,
      resultLastCallInputTokens: input.resultLastCallInputTokens,
      effectiveContextWindowTokens: input.effectiveContextWindowTokens,
      resultCompactionCount: input.resultCompactionCount,
      terminalResult: { status, message: input.resultFailed },
    }
  }

  private resolveCompletedModelId(result: {
    completedGenerations?: Array<{ model?: string }>
    llmInput?: { model?: unknown }
  }, defaultModelId: string): string {
    const lastCompletedModel = result.completedGenerations
      ?.map((generation) => generation.model)
      .filter((model): model is string => typeof model === 'string' && model.length > 0)
      .at(-1)
    const resolvedModelId = lastCompletedModel ?? (result.llmInput?.model as string | undefined)
    return !resolvedModelId || resolvedModelId.startsWith('openclaw:')
      ? defaultModelId
      : resolvedModelId
  }

  private logContextBreakdown(
    conversationId: string,
    contextBreakdown: ContextBreakdown | undefined,
    logger: Logger,
  ): void {
    if (!contextBreakdown) return
    const sliceSummary = contextBreakdown.slices
      .map((slice) => `${slice.id}:${slice.tokens}`)
      .join(',')
    logger.debug(
      `[ContextBreakdown] conversationId=${conversationId} total=${contextBreakdown.totalTokens} window=${contextBreakdown.contextWindow} slices=${sliceSummary}`,
    )
    const sliceTotal = contextBreakdown.slices.reduce((sum, slice) => sum + slice.tokens, 0)
    const delta = Math.abs(sliceTotal - contextBreakdown.totalTokens)
    if (contextBreakdown.totalTokens > 0 && delta / contextBreakdown.totalTokens > 0.1) {
      logger.warn(
        `[ContextBreakdown] total mismatch conversationId=${conversationId} reported=${contextBreakdown.totalTokens} slices=${sliceTotal} delta=${delta}`,
      )
    }
  }
}
