import { Injectable, type Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildMachineProfileUpdate,
  resolveMachineProfileColumns,
  SupabaseServiceClient,
} from '@vibey/api-shared'
import type { ContextBreakdown } from '@vibey/context-breakdown'
import { ConversationsRepository } from '../../conversations/repositories/conversations.repository'
import { MessagesRepository } from '../../conversations/repositories/messages.repository'
import type { ActiveWorkingSet } from '../../shared/services/request-context.service'
import { RequestContextService } from '../../shared/services/request-context.service'
import { ChatContextRepository } from '../repositories/chat-context.repository'
import { AgentEditCheckpointService } from './agent-edit-checkpoint.service'
import type { ChatModelSettings, ValidatedModelSettings } from './chat-model-input.service'
import type {
  ChatRunCheckpointKind,
  RecordChatRunCheckpointInput,
} from './chat-run-checkpoint.service'
import { ChatRunEventStoreService } from './chat-run-event-store.service'
import { MessageTimelineService } from './message-timeline.service'
import type { SendFn } from './openclaw-proxy.service'
import { StreamRegistryService } from './stream-registry.service'
import type { ChatTurnTimingSpan } from './chat-turn-session.service'

type DbOperation = <T>(operation: (supabase: SupabaseClient) => Promise<T>) => Promise<T>
type CompletionLogger = Pick<Logger, 'error' | 'warn'>
type ChatTerminalStatus = 'done' | 'failed' | 'failed_recoverable' | 'cancelled' | 'active'
type ToolStep = { name: string; label: string; status: string }
type CheckpointPayload = Omit<
  RecordChatRunCheckpointInput,
  'runId' | 'conversationId' | 'messageId' | 'userId' | 'orgId' | 'attemptIndex' | 'kind'
>
type RecordRunCheckpoint = (
  kind: ChatRunCheckpointKind,
  checkpoint: CheckpointPayload,
) => Promise<void>

interface PersistSuccessfulTurnInput {
  userId: string
  orgId?: string | null
  conversationId: string
  messageId: string
  streamStartedAt: number
  toolSteps: ToolStep[]
  orderedBlocks: Record<string, unknown>[]
  selectedSettings: ValidatedModelSettings
  modelSettings?: ChatModelSettings
  effectiveContextWindowTokens?: number
  resultLastCallInputTokens?: number
  resultCompactionCount?: number
  contextBreakdown?: ContextBreakdown
  resolvedModelId?: string
  donePayload: Record<string, unknown>
  timingSpans: ChatTurnTimingSpan[]
  getAccumulatedContent: () => string
  getCompletedVisibleToolCount: () => number
  clearFlushTimer: () => void
  recordRunCheckpoint: RecordRunCheckpoint
  dbOp: DbOperation
  logger: CompletionLogger
  streamedContent?: string
}

interface EmitSuccessfulTurnDoneInput {
  userId: string
  conversationId: string
  messageId: string
  runId: string
  donePayload: Record<string, unknown>
  sendRunEvent: SendFn
  verifyStreamMirrorDone: () => void
  logger: CompletionLogger
}

interface FlushFinalMessageInput {
  conversationId: string
  messageId: string
  streamStartedAt: number
  terminalRunStatus: ChatTerminalStatus
  toolSteps: ToolStep[]
  orderedBlocks: Record<string, unknown>[]
  selectedSettings: ValidatedModelSettings
  effectiveContextWindowTokens?: number
  resolvedModelId?: string
  timingSpans: ChatTurnTimingSpan[]
  getAccumulatedContent: () => string
  clearFlushTimer: () => void
  dbOp: DbOperation
  logger: CompletionLogger
  streamedContent?: string
}

interface CompleteConversationInput {
  conversationId: string
  userId: string
  content: string
  historyLength: number
  streamStartedAt: number
  chatDiag: string
  spaceId?: string | null
  model?: string
  lastInputTokensActual?: number
  resultLastCallInputTokens?: number
  effectiveContextWindowTokens?: number
  modelSettings?: ChatModelSettings
  selectedSettings: ValidatedModelSettings
  resultCompactionCount?: number
  contextBreakdown?: ContextBreakdown
  existingConversationMetadata?: Record<string, unknown>
  hasActiveWorkingSetEntries: (workingSet: ActiveWorkingSet) => boolean
  dbOp: DbOperation
  logChatFlow: (message: string) => void
}

function resolveAssistantMessageContent(
  getAccumulatedContent: () => string,
  streamedContent?: string,
): string {
  const accumulated = getAccumulatedContent()
  const streamed = streamedContent ?? ''
  return accumulated.length >= streamed.length ? accumulated : streamed
}

@Injectable()
export class ChatTurnCompletionService {
  private readonly machineColumns = resolveMachineProfileColumns(process.env)

  constructor(
    private readonly messages: MessagesRepository,
    private readonly conversations: ConversationsRepository,
    private readonly messageTimeline: MessageTimelineService,
    private readonly chatRunEvents: ChatRunEventStoreService,
    private readonly streamRegistry: StreamRegistryService,
    private readonly requestContext: RequestContextService,
    private readonly agentEditCheckpoints: AgentEditCheckpointService,
    private readonly chatContextRepository: ChatContextRepository,
    private readonly svc: SupabaseServiceClient,
  ) {}

  async persistSuccessfulTurn(input: PersistSuccessfulTurnInput): Promise<void> {
    input.donePayload.duration_ms = Date.now() - input.streamStartedAt
    if (input.resultLastCallInputTokens && input.resultLastCallInputTokens > 0) {
      input.donePayload.usage = { input_tokens: input.resultLastCallInputTokens }
    }
    if (input.effectiveContextWindowTokens && input.effectiveContextWindowTokens > 0) {
      input.donePayload.context_window = input.effectiveContextWindowTokens
    }
    if (input.modelSettings) {
      input.donePayload.model_settings = input.selectedSettings.request
      input.donePayload.requested_model_id = input.selectedSettings.requestedModelId
      input.donePayload.resolved_model_id = input.selectedSettings.resolvedModelId
    }
    if (input.contextBreakdown) {
      input.donePayload.context_breakdown = input.contextBreakdown
    }
    if (input.timingSpans.length > 0) {
      input.donePayload.timing_spans = input.timingSpans
    }

    const checkpointMutations = this.requestContext.drainAgentCheckpointMutations(
      input.conversationId,
    )
    if (checkpointMutations.length > 0) {
      await this.agentEditCheckpoints
        .finalizeTurn({
          userId: input.userId,
          orgId: input.orgId ?? null,
          conversationId: input.conversationId,
          messageId: input.messageId,
          mutations: checkpointMutations,
        })
        .catch((err) =>
          input.logger.warn(
            `[AgentCheckpoints] finalize failed conversationId=${input.conversationId}: ${String(err)}`,
          ),
        )
    }

    input.clearFlushTimer()
    const finalContent = resolveAssistantMessageContent(
      input.getAccumulatedContent,
      input.streamedContent,
    )
    await this.updateAssistantMessage(input.messageId, {
      content: finalContent,
      metadata: {
        ...(input.toolSteps.length > 0 ? { tool_steps: input.toolSteps } : {}),
        ...(input.orderedBlocks.length > 0
          ? { content_blocks_ordered: structuredClone(input.orderedBlocks) }
          : {}),
        ...(input.effectiveContextWindowTokens
          ? { context_window_tokens: input.effectiveContextWindowTokens }
          : {}),
        ...(input.timingSpans.length > 0
          ? { timing_spans: structuredClone(input.timingSpans) }
          : {}),
        model_settings: input.selectedSettings.request,
        requested_model_id: input.selectedSettings.requestedModelId,
        resolved_model_id: input.selectedSettings.resolvedModelId,
      },
    })
    await input.recordRunCheckpoint('final', {
      summary: 'The assistant response completed successfully.',
      remainingWork: null,
      contextWindowTokens: input.effectiveContextWindowTokens ?? null,
      lastCallInputTokens: input.resultLastCallInputTokens ?? null,
      compactionCount: input.resultCompactionCount ?? null,
      rawSnapshot: {
        content_length: finalContent.length,
        tool_count: input.getCompletedVisibleToolCount(),
        model_id: input.resolvedModelId ?? input.selectedSettings.resolvedModelId,
      },
    })
  }

  async updateAssistantMessage(
    messageId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    await this.messages.update(this.svc.client, messageId, updates)
  }

  async emitSuccessfulTurnDone(input: EmitSuccessfulTurnDoneInput): Promise<void> {
    void this.messageTimeline
      .appendEvent({
        userId: input.userId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        type: 'done',
        payload: input.donePayload,
      })
      .catch((err) => input.logger.warn(`Failed to append done timeline event: ${err}`))
    await input.sendRunEvent('done', input.donePayload)
    input.verifyStreamMirrorDone()
    await this.chatRunEvents.markRunDone(input.runId).catch(() => null)
  }

  async flushFinalMessage(input: FlushFinalMessageInput): Promise<void> {
    const DEFERRED_CLEAR_MS = 30 * 60 * 1000
    setTimeout(() => this.requestContext.clear(input.conversationId), DEFERRED_CLEAR_MS)
    input.clearFlushTimer()
    const finalContent = resolveAssistantMessageContent(
      input.getAccumulatedContent,
      input.streamedContent,
    )
    const finalUpdates: Record<string, unknown> = {
      content: finalContent,
      metadata: {
        ...(input.toolSteps.length > 0 ? { tool_steps: input.toolSteps } : {}),
        ...(input.orderedBlocks.length > 0
          ? { content_blocks_ordered: structuredClone(input.orderedBlocks) }
          : {}),
        ...(input.effectiveContextWindowTokens
          ? { context_window_tokens: input.effectiveContextWindowTokens }
          : {}),
        ...(input.timingSpans.length > 0
          ? { timing_spans: structuredClone(input.timingSpans) }
          : {}),
        model_settings: input.selectedSettings.request,
        requested_model_id: input.selectedSettings.requestedModelId,
        resolved_model_id: input.selectedSettings.resolvedModelId,
        ...(input.terminalRunStatus === 'done'
          ? { duration_ms: Date.now() - input.streamStartedAt }
          : {}),
      },
    }
    if (input.resolvedModelId) finalUpdates.model_id = input.resolvedModelId
    await this.updateAssistantMessage(input.messageId, finalUpdates).catch((err) => {
      input.logger.error(`Final message save failed: ${err}`)
    })
  }

  async completeConversation(input: CompleteConversationInput): Promise<void> {
    const conversationUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (input.lastInputTokensActual) {
      conversationUpdates.last_input_tokens = input.lastInputTokensActual
    }
    if (input.model) {
      conversationUpdates.default_model_id = input.model
    }
    const ctxMeta: Record<string, unknown> = {}
    if (input.spaceId) ctxMeta.space_id = input.spaceId
    if (input.resultLastCallInputTokens) {
      ctxMeta.last_call_input_tokens = input.resultLastCallInputTokens
    }
    if (input.effectiveContextWindowTokens) {
      ctxMeta.context_window_tokens = input.effectiveContextWindowTokens
    }
    if (input.modelSettings) ctxMeta.model_settings = input.selectedSettings.request
    if (input.selectedSettings.requestedModelId !== input.selectedSettings.resolvedModelId) {
      ctxMeta.requested_model_id = input.selectedSettings.requestedModelId
      ctxMeta.resolved_model_id = input.selectedSettings.resolvedModelId
    }
    if (input.resultCompactionCount != null) ctxMeta.compaction_count = input.resultCompactionCount
    if (input.contextBreakdown) ctxMeta.context_breakdown = input.contextBreakdown
    const activeWorkingSet = this.requestContext.getActiveWorkingSet(input.conversationId)
    if (input.hasActiveWorkingSetEntries(activeWorkingSet)) {
      ctxMeta.active_working_set = activeWorkingSet
    }
    if (Object.keys(ctxMeta).length > 0) {
      const existing = input.existingConversationMetadata ?? {}
      conversationUpdates.metadata = { ...existing, ...ctxMeta }
    }
    await input.dbOp((supabase) =>
      this.conversations.update(supabase, input.conversationId, conversationUpdates),
    )

    if (input.historyLength <= 2) {
      const maxLen = 200
      const trimmed = input.content.trim()
      const title = trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed
      await input.dbOp((supabase) =>
        this.conversations.update(supabase, input.conversationId, { title }),
      )
    }

    this.streamRegistry.complete(input.conversationId)
    this.streamRegistry.clearAbortController(input.conversationId)
    input.logChatFlow(
      `[ChatFlow] process_complete ${input.chatDiag} totalDurationMs=${Date.now() - input.streamStartedAt}`,
    )

    void Promise.resolve(
      this.chatContextRepository.updateMachineRuntimeActivity(this.svc.client, {
        userId: input.userId,
        patch: buildMachineProfileUpdate(this.machineColumns, {
          runtimeLastActivityAt: new Date().toISOString(),
        }),
      }),
    ).catch(() => {})
  }
}
