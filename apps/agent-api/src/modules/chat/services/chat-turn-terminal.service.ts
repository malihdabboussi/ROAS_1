import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContextBreakdown } from '@vibey/context-breakdown'
import type { ActiveWorkingSet } from '../../shared/services/request-context.service'
import { ChatContextAccountingService } from './chat-context-accounting.service'
import type { ChatGatewayInputContext } from './chat-gateway-input.service'
import type { ChatModelSettings, ValidatedModelSettings } from './chat-model-input.service'
import { ChatRunEventStoreService } from './chat-run-event-store.service'
import type { ResolvedSlashCommand } from './chat-slash-command.service'
import type { ChatStreamMirrorState } from './chat-stream-mirror.service'
import { ChatStreamMirrorService } from './chat-stream-mirror.service'
import { ChatTurnCompletionService } from './chat-turn-completion.service'
import type { ChatTurnTimingSpan, RecordChatTurnTimingSpan } from './chat-turn-session.service'
import { ChatTurnStreamService } from './chat-turn-stream.service'
import type { ChatTurnStreamingState } from './chat-turn-streaming-state.service'
import type { OpenClawInputMessage, OpenClawSkillCatalog, SendFn } from './openclaw-proxy.service'
import { StreamRegistryService } from './stream-registry.service'
import { TracingService } from './tracing.service'

type DbOperation = <T>(operation: (supabase: SupabaseClient) => Promise<T>) => Promise<T>
type ChatProcessTerminalStatus = 'done' | 'failed' | 'failed_recoverable' | 'cancelled'

interface ChatTurnTerminalInput {
  chatDiag: string
  chatTimingLogsEnabled: boolean
  content: string
  conversationId: string
  dbOp: DbOperation
  defaultModelId: string
  disabledNativeActions: string[]
  enabledToolkitsForGateway: ChatGatewayInputContext['enabledToolkitsForGateway']
  gatewayModelId: string
  gatewayToolPolicySlice: ContextBreakdown['slices'][number] | null
  history: Record<string, unknown>[]
  inputArray: OpenClawInputMessage[]
  instructions: string
  logChatFlow: (message: string) => void
  logChatTiming: (stage: string, extra?: Record<string, unknown>) => void
  logger: Logger
  measuredContextSlices: ContextBreakdown['slices']
  messageId: string
  model?: string
  modelSettings?: ChatModelSettings
  openClawSkillCatalog?: OpenClawSkillCatalog
  orgId?: string
  resolvedAgentId: string
  resolvedCampaignId?: string
  resolvedChannel: 'telegram' | 'slack' | 'studio'
  resolvedSlashCommands: ResolvedSlashCommand[]
  runId: string
  requestId: string
  runtime: { gatewayAgentId: string; agentKey: string }
  selectedModelInput: string | null
  selectedSettings: ValidatedModelSettings
  send: SendFn
  sendRunEvent: SendFn
  sessionKey: string
  signal?: AbortSignal
  streamMirrorService: ChatStreamMirrorService
  streamMirrorState: ChatStreamMirrorState
  streamStartedAt: number
  streamingState: ChatTurnStreamingState
  traceId: string | null
  recordTimingSpan: RecordChatTurnTimingSpan
  getTimingSpans: () => ChatTurnTimingSpan[]
  userId: string
  conversationMetadata: Record<string, unknown>
  historyLength: number
  spaceId?: string | null
  hasActiveWorkingSetEntries: (workingSet: ActiveWorkingSet) => boolean
}

export interface ChatTurnTerminalResult {
  status: ChatProcessTerminalStatus
  message?: string
}

@Injectable()
export class ChatTurnTerminalService {
  constructor(
    private readonly streamService: ChatTurnStreamService,
    private readonly completionService: ChatTurnCompletionService,
    private readonly chatRunEvents: ChatRunEventStoreService,
    private readonly tracing: TracingService,
    private readonly streamRegistry: StreamRegistryService,
    private readonly contextAccounting: ChatContextAccountingService,
  ) {}

  async run(input: ChatTurnTerminalInput): Promise<ChatTurnTerminalResult> {
    let resolvedModelId: string | undefined
    let lastInputTokensActual: number | undefined
    let resultLastCallInputTokens: number | undefined
    let effectiveContextWindowTokens = input.selectedSettings.request.context_window_tokens
    let resultCompactionCount: number | undefined
    let contextBreakdown: ContextBreakdown | undefined
    let terminalRunStatus: ChatProcessTerminalStatus | 'active' = 'active'
    let streamedContent: string | undefined
    const donePayload: Record<string, unknown> = {
      message_id: input.messageId,
      credits_pending: true,
    }
    const startedAt = Date.now()
    try {
      input.streamingState.setModelStreamStartedAt(startedAt)
      const estimatedContextBreakdown = this.contextAccounting.buildEstimatedContextBreakdown({
        instructions: input.instructions,
        inputMessages: input.inputArray,
        contextWindowTokens: effectiveContextWindowTokens,
        modelId: input.gatewayModelId,
        skillCatalog: input.openClawSkillCatalog,
        extraSlices: input.gatewayToolPolicySlice
          ? [...input.measuredContextSlices, input.gatewayToolPolicySlice]
          : input.measuredContextSlices,
      })
      if (estimatedContextBreakdown) {
        await input.sendRunEvent('context_update', {
          context_breakdown: estimatedContextBreakdown,
        })
      }
      const streamOutcome = await this.streamService.run({
        chatDiag: input.chatDiag,
        chatTimingLogsEnabled: input.chatTimingLogsEnabled,
        conversationId: input.conversationId,
        content: input.content,
        defaultModelId: input.defaultModelId,
        disabledNativeActions: input.disabledNativeActions,
        enabledToolkitsForGateway: input.enabledToolkitsForGateway,
        gatewayAgentId: input.runtime.gatewayAgentId,
        gatewayModelId: input.gatewayModelId,
        getAccumulatedContent: input.streamingState.getAccumulatedContent,
        getCompletedVisibleToolCount: input.streamingState.getCompletedVisibleToolCount,
        inputArray: input.inputArray,
        instructions: input.instructions,
        logChatFlow: input.logChatFlow,
        logChatTiming: input.logChatTiming,
        logger: input.logger,
        measuredContextSlices: input.measuredContextSlices,
        messageId: input.messageId,
        modelSettings: input.modelSettings,
        openClawSkillCatalog: input.openClawSkillCatalog,
        orgId: input.orgId,
        progressiveSend: input.streamingState.progressiveSend,
        recordRunCheckpoint: input.streamingState.recordRunCheckpoint,
        resolvedAgentId: input.resolvedAgentId,
        resolvedCampaignId: input.resolvedCampaignId,
        resolvedChannel: input.resolvedChannel,
        resolvedSlashCommands: input.resolvedSlashCommands,
        runId: input.runId,
        requestId: input.requestId,
        runtime: input.runtime,
        selectedModelInput: input.selectedModelInput,
        selectedSettings: input.selectedSettings,
        sendCreditUpdate: (creditData) => {
          input.send('credit_update', { credits: creditData }).catch(() => {})
        },
        sessionKey: input.sessionKey,
        signal: input.signal,
        startedAt,
        streamContextWindowTokens: effectiveContextWindowTokens,
        traceId: input.traceId,
        userId: input.userId,
        history: input.history,
        gatewayToolPolicySlice: input.gatewayToolPolicySlice,
        verifyStreamMirrorError: () =>
          input.streamMirrorService.verify(input.streamMirrorState, 'error', input.logger),
      })
      input.recordTimingSpan('model_stream', startedAt, {
        gateway_model_id: input.gatewayModelId,
        input_items: input.inputArray.length,
      })
      input.streamingState.toolSteps = streamOutcome.toolSteps
      streamedContent = streamOutcome.streamedContent
      resolvedModelId = streamOutcome.resolvedModelId
      lastInputTokensActual = streamOutcome.lastInputTokensActual
      resultLastCallInputTokens = streamOutcome.resultLastCallInputTokens
      effectiveContextWindowTokens =
        streamOutcome.effectiveContextWindowTokens ?? effectiveContextWindowTokens
      resultCompactionCount = streamOutcome.resultCompactionCount
      contextBreakdown = streamOutcome.contextBreakdown
      if (streamOutcome.terminalResult) {
        terminalRunStatus = streamOutcome.terminalResult.status
        return streamOutcome.terminalResult
      }

      await this.completionService.persistSuccessfulTurn({
        userId: input.userId,
        orgId: input.orgId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        streamStartedAt: input.streamStartedAt,
        toolSteps: input.streamingState.toolSteps,
        orderedBlocks: input.streamingState.orderedBlocks,
        selectedSettings: input.selectedSettings,
        modelSettings: input.modelSettings,
        effectiveContextWindowTokens,
        resultLastCallInputTokens,
        resultCompactionCount,
        contextBreakdown,
        resolvedModelId,
        donePayload,
        timingSpans: input.getTimingSpans(),
        getAccumulatedContent: input.streamingState.getAccumulatedContent,
        getCompletedVisibleToolCount: input.streamingState.getCompletedVisibleToolCount,
        getRetrievalReceipts: input.streamingState.getRetrievalReceipts,
        getWebResearchUrls: input.streamingState.getWebResearchUrls,
        clearFlushTimer: input.streamingState.clearFlushTimer,
        recordRunCheckpoint: input.streamingState.recordRunCheckpoint,
        dbOp: input.dbOp,
        logger: input.logger,
        streamedContent: streamOutcome.streamedContent,
      })
      terminalRunStatus = 'done'
      await this.completionService.emitSuccessfulTurnDone({
        userId: input.userId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        runId: input.runId,
        donePayload,
        sendRunEvent: input.sendRunEvent,
        verifyStreamMirrorDone: () =>
          input.streamMirrorService.verify(input.streamMirrorState, 'done', input.logger),
        logger: input.logger,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const cancelled = await this.chatRunEvents.isRunCancelled(input.runId).catch(() => false)
      if (cancelled) {
        terminalRunStatus = 'cancelled'
        this.tracing
          .failTrace(input.traceId, 'cancelled', {
            terminalStatus: 'cancelled',
            userVisibleOutcome: 'cancelled',
            recoveryStatus: 'cancelled',
            observability: {
              request_id: input.requestId,
              run_id: input.runId,
              message_id: input.messageId,
            },
          })
          .catch(() => {})
        this.streamRegistry.complete(input.conversationId)
        this.streamRegistry.clearAbortController(input.conversationId)
        return { status: 'cancelled' }
      }
      terminalRunStatus = 'failed'
      input.logger.error(`[ChatFlow] stream_exception ${input.chatDiag} err=${errorMessage}`)
      await this.chatRunEvents
        .appendEvent({
          runId: input.runId,
          type: 'error',
          payload: { message: errorMessage },
        })
        .catch(() => null)
      await this.chatRunEvents.markRunFailed(input.runId, errorMessage).catch(() => null)
      this.tracing
        .failTrace(input.traceId, errorMessage, {
          terminalStatus: 'failed',
          userVisibleOutcome: 'blocked',
          recoveryStatus: 'failed_unrecoverable',
          observability: {
            request_id: input.requestId,
            run_id: input.runId,
            message_id: input.messageId,
          },
        })
        .catch(() => {})
      this.streamRegistry.complete(input.conversationId)
      this.streamRegistry.clearAbortController(input.conversationId)
      throw err
    } finally {
      await this.completionService.flushFinalMessage({
        conversationId: input.conversationId,
        messageId: input.messageId,
        streamStartedAt: input.streamStartedAt,
        terminalRunStatus,
        toolSteps: input.streamingState.toolSteps,
        orderedBlocks: input.streamingState.orderedBlocks,
        selectedSettings: input.selectedSettings,
        effectiveContextWindowTokens,
        resolvedModelId,
        timingSpans: input.getTimingSpans(),
        getAccumulatedContent: input.streamingState.getAccumulatedContent,
        getRetrievalReceipts: input.streamingState.getRetrievalReceipts,
        getWebResearchUrls: input.streamingState.getWebResearchUrls,
        clearFlushTimer: input.streamingState.clearFlushTimer,
        dbOp: input.dbOp,
        logger: input.logger,
        streamedContent,
      })
    }

    await this.completionService.completeConversation({
      conversationId: input.conversationId,
      userId: input.userId,
      content: input.content,
      historyLength: input.historyLength,
      streamStartedAt: input.streamStartedAt,
      chatDiag: input.chatDiag,
      spaceId: input.spaceId,
      model: input.model,
      lastInputTokensActual,
      resultLastCallInputTokens,
      effectiveContextWindowTokens,
      modelSettings: input.modelSettings,
      selectedSettings: input.selectedSettings,
      resultCompactionCount,
      contextBreakdown,
      existingConversationMetadata: input.conversationMetadata,
      hasActiveWorkingSetEntries: input.hasActiveWorkingSetEntries,
      dbOp: input.dbOp,
      logChatFlow: input.logChatFlow,
    })

    return { status: 'done' }
  }
}
