import { Injectable, Logger } from '@nestjs/common'
import {
  ChatOrderedBlocksService,
  type ChatOrderedBlocksState,
  type CompletedPlatformToolBlock,
} from './chat-ordered-blocks.service'
import type { RecordChatTurnTimingSpan } from './chat-turn-session.service'
import type { SendFn } from './openclaw-proxy.service'

type OrderedBlock = Record<string, unknown>
type ToolStep = { name: string; label: string; status: string }

export interface ChatProgressiveStreamState {
  accumulatedContent: string
  completedVisibleToolCount: number
  firstVisibleActivityLogged: boolean
  flushTimer: ReturnType<typeof setTimeout> | null
  lastFlushBlockCount: number
  lastFlushLength: number
  lastFlushReceiptCount: number
  lastFlushWebCount: number
  lastToolCheckpointAt: number
  orderedBlocksState: ChatOrderedBlocksState
  retrievalReceipts: Record<string, unknown>[]
  webResearchUrls: Record<string, unknown>[]
}

export interface ChatProgressiveStreamSendInput {
  appendTimelineEvent: (type: string, payload: Record<string, unknown>) => Promise<void>
  chatDiag: string
  flushContentToDB: () => Promise<void>
  logger: Logger
  messageId: string
  recordToolCheckpoint: (input: {
    accumulatedContent: string
    completedVisibleToolCount: number
    data: Record<string, unknown>
    type: string
  }) => Promise<void>
  sendRunEvent: SendFn
  streamStartedAt: number
  getFirstVisibleSpanStart?: () => number
  recordTimingSpan?: RecordChatTurnTimingSpan
  logChatFlow: (message: string) => void
}

export interface ChatProgressiveStreamFlushInput {
  getToolSteps: () => ToolStep[]
  updateMessage: (updates: Record<string, unknown>) => Promise<void>
  logger: Logger
}

@Injectable()
export class ChatProgressiveStreamService {
  private readonly flushIntervalMs = 2000
  private readonly toolCheckpointCountInterval = 5
  private readonly toolCheckpointMsInterval = 30_000

  constructor(private readonly orderedBlocksService: ChatOrderedBlocksService) {}

  createState(
    messageId: string,
    completedPlatformTools: CompletedPlatformToolBlock[],
  ): ChatProgressiveStreamState {
    return {
      accumulatedContent: '',
      completedVisibleToolCount: completedPlatformTools.length,
      firstVisibleActivityLogged: false,
      flushTimer: null,
      lastFlushBlockCount: 0,
      lastFlushLength: 0,
      lastFlushReceiptCount: 0,
      lastFlushWebCount: 0,
      lastToolCheckpointAt: Date.now(),
      orderedBlocksState: this.orderedBlocksService.createState(messageId, completedPlatformTools),
      retrievalReceipts: [],
      webResearchUrls: [],
    }
  }

  getAccumulatedContent(state: ChatProgressiveStreamState): string {
    return state.accumulatedContent
  }

  getCompletedVisibleToolCount(state: ChatProgressiveStreamState): number {
    return state.completedVisibleToolCount
  }

  getRetrievalReceipts(state: ChatProgressiveStreamState): Record<string, unknown>[] {
    return state.retrievalReceipts
  }

  getWebResearchUrls(state: ChatProgressiveStreamState): Record<string, unknown>[] {
    return state.webResearchUrls
  }

  getOrderedBlocks(state: ChatProgressiveStreamState): OrderedBlock[] {
    return state.orderedBlocksState.blocks
  }

  clearFlushTimer(state: ChatProgressiveStreamState): void {
    if (!state.flushTimer) return
    clearTimeout(state.flushTimer)
    state.flushTimer = null
  }

  async flushContentToDB(
    state: ChatProgressiveStreamState,
    input: ChatProgressiveStreamFlushInput,
  ): Promise<void> {
    const orderedBlocks = this.getOrderedBlocks(state)
    const contentChanged = state.accumulatedContent.length > state.lastFlushLength
    const blocksChanged = orderedBlocks.length > state.lastFlushBlockCount
    const receiptsChanged = state.retrievalReceipts.length > state.lastFlushReceiptCount
    const webChanged = state.webResearchUrls.length > state.lastFlushWebCount
    if (!contentChanged && !blocksChanged && !receiptsChanged && !webChanged) return

    state.lastFlushLength = state.accumulatedContent.length
    state.lastFlushBlockCount = orderedBlocks.length
    state.lastFlushReceiptCount = state.retrievalReceipts.length
    state.lastFlushWebCount = state.webResearchUrls.length

    await input
      .updateMessage({
        content: state.accumulatedContent,
        metadata: {
          ...(input.getToolSteps().length > 0 ? { tool_steps: input.getToolSteps() } : {}),
          ...(orderedBlocks.length > 0
            ? { content_blocks_ordered: structuredClone(orderedBlocks) }
            : {}),
          ...(state.retrievalReceipts.length > 0
            ? { retrieval_receipts: structuredClone(state.retrievalReceipts) }
            : {}),
          ...(state.webResearchUrls.length > 0
            ? { web_research_urls: structuredClone(state.webResearchUrls) }
            : {}),
        },
      })
      .catch((err) => {
        input.logger.warn(`Progressive save failed: ${err}`)
      })
  }

  createSend(state: ChatProgressiveStreamState, input: ChatProgressiveStreamSendInput): SendFn {
    return async (type, data) => {
      this.logFirstVisibleActivity(state, input, type, data)

      if (
        type !== 'content_delta' &&
        type !== 'thinking_delta' &&
        type !== 'tool_content_preview'
      ) {
        await input
          .appendTimelineEvent(type, {
            ...data,
            content_len: state.accumulatedContent.length,
          })
          .catch((err) => {
            input.logger.warn(
              `[TimelineNonBlocking] appendEvent failed for ${type} messageId=${input.messageId}: ${String(err)}`,
            )
          })
      }

      if (type === 'content_delta' && data.content) {
        state.accumulatedContent += data.content as string
        this.orderedBlocksService.appendText(state.orderedBlocksState, data.content as string)
        this.scheduleFlush(state, input.flushContentToDB)
      }

      if (type === 'thinking_delta') {
        const text = (data.text as string) ?? ''
        this.orderedBlocksService.upsertThinkingTranscript(state.orderedBlocksState, text)
        return input.sendRunEvent(type, data)
      }

      await this.applyStructuredEvent(state, input, type, data)

      if (this.shouldFlushForStructuredEvent(type)) {
        this.scheduleFlush(state, input.flushContentToDB)
      }

      return input.sendRunEvent(type, data)
    }
  }

  private async applyStructuredEvent(
    state: ChatProgressiveStreamState,
    input: ChatProgressiveStreamSendInput,
    type: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const orderedBlocks = this.getOrderedBlocks(state)

    if (type === 'retrieval_receipt') {
      state.retrievalReceipts.push({ ...data })
      return
    }

    if (type === 'web_source') {
      state.webResearchUrls.push({ ...data })
      return
    }

    if (type === 'status' && data.phase) {
      if (data.phase === 'compacting') {
        const label =
          typeof data.message === 'string' && data.message.trim().length > 0
            ? data.message.trim()
            : 'Summarizing our conversation'
        this.orderedBlocksService.pushSessionCompaction(state.orderedBlocksState, label, Date.now())
      } else {
        this.orderedBlocksService.completeSessionCompaction(state.orderedBlocksState, Date.now())
        if (data.phase === 'thinking') {
          const hasThinking = this.orderedBlocksService.hasThinkingTranscript(
            state.orderedBlocksState,
          )
          if (!hasThinking && orderedBlocks.length === 0) {
            this.orderedBlocksService.upsertThinkingTranscript(state.orderedBlocksState, '')
          }
        } else {
          this.orderedBlocksService.completeThinkingTranscript(state.orderedBlocksState)
        }
      }
    }

    if (type === 'tool_start') {
      const tcId = typeof data.tool_call_id === 'string' ? data.tool_call_id : undefined
      this.orderedBlocksService.pushToolStart(
        state.orderedBlocksState,
        (data.name as string) ?? 'tool',
        (data.label as string) ?? 'Working...',
        data.action as string | undefined,
        Date.now(),
        tcId,
      )
    }

    if (type === 'tool_end') {
      const tcId = typeof data.tool_call_id === 'string' ? data.tool_call_id : undefined
      this.orderedBlocksService.completeTool(
        state.orderedBlocksState,
        (data.name as string) ?? 'tool',
        ((data.status as string) ?? 'completed') === 'completed' ? 'completed' : 'failed',
        Date.now(),
        tcId,
      )
      state.completedVisibleToolCount += 1
      const checkpointDueByCount =
        state.completedVisibleToolCount % this.toolCheckpointCountInterval === 0
      const checkpointDueByTime =
        Date.now() - state.lastToolCheckpointAt >= this.toolCheckpointMsInterval
      if (checkpointDueByCount || checkpointDueByTime) {
        state.lastToolCheckpointAt = Date.now()
        await input.recordToolCheckpoint({
          accumulatedContent: state.accumulatedContent,
          completedVisibleToolCount: state.completedVisibleToolCount,
          data,
          type,
        })
      }
    }

    if (type === 'tool_update') {
      const tcId = typeof data.tool_call_id === 'string' ? data.tool_call_id : undefined
      this.orderedBlocksService.appendToolProgress(
        state.orderedBlocksState,
        (data.name as string) ?? 'tool',
        ((data.detail as string) ?? '').trim(),
        Date.now(),
        tcId,
      )
    }

    if (type === 'generation_start') {
      this.orderedBlocksService.pushGenerationStart(
        state.orderedBlocksState,
        (data.label as string) ?? 'Generating...',
        Date.now(),
      )
    }
    if (type === 'generation_end') {
      this.orderedBlocksService.completeGeneration(state.orderedBlocksState, Date.now())
    }
    if (type === 'ui_block') {
      const block = data.block as Record<string, unknown> | undefined
      if (block && typeof block === 'object') {
        this.orderedBlocksService.pushUiBlock(state.orderedBlocksState, block, Date.now())
      }
    }
    if (type === 'a2a_message') {
      this.applyAgentConversationEvent(orderedBlocks, data)
    }
  }

  private applyAgentConversationEvent(
    orderedBlocks: OrderedBlock[],
    data: Record<string, unknown>,
  ): void {
    const delegationId = data.delegationId as string | undefined
    if (!delegationId) return

    const isTerminal = data.delegationStatus === 'completed' || data.delegationStatus === 'failed'
    const terminalStatus = data.delegationStatus === 'failed' ? 'failed' : 'completed'

    if (isTerminal) {
      for (const block of orderedBlocks) {
        if (
          block.type === 'agent_conversation' &&
          (block as Record<string, unknown>).status === 'active'
        ) {
          ;(block as Record<string, unknown>).status = terminalStatus
        }
      }
      return
    }

    const turn: Record<string, unknown> = {
      from: data.from,
      fromName: data.fromName,
      fromImage: data.fromImage,
      content: data.content ?? '',
      turnIndex: data.turnIndex ?? 0,
      turnType: data.turnType ?? 'message',
      timestamp: data.timestamp ?? Date.now(),
      ...(data.toolName ? { toolName: data.toolName } : {}),
    }
    const existingIdx = orderedBlocks.findIndex(
      (block) => block.type === 'agent_conversation' && block.delegationId === delegationId,
    )
    if (existingIdx !== -1) {
      const prev = orderedBlocks[existingIdx]!
      const prevTurns = (prev.turns as Array<Record<string, unknown>>) ?? []
      const dupIdx = prevTurns.findIndex(
        (candidate) =>
          candidate.turnIndex === turn.turnIndex && candidate.turnType === turn.turnType,
      )
      const updatedTurns =
        dupIdx !== -1
          ? prevTurns.map((candidate, index) => (index === dupIdx ? turn : candidate))
          : [...prevTurns, turn]
      orderedBlocks[existingIdx] = { ...prev, turns: updatedTurns, status: 'active' }
      return
    }

    if (!data.callerAgent) return
    orderedBlocks.push({
      type: 'agent_conversation',
      id: `a2a-${delegationId}`,
      delegationId,
      callerAgent: data.callerAgent,
      callerAgentName: (data.callerAgentName as string) ?? '',
      callerAgentImage: data.callerAgentImage,
      callerAgentRole: (data.callerAgentRole as string) ?? '',
      targetAgent: data.targetAgent,
      targetAgentName: (data.targetAgentName as string) ?? '',
      targetAgentImage: data.targetAgentImage,
      targetAgentRole: (data.targetAgentRole as string) ?? '',
      delegationType: (data.delegationType as string) ?? 'query',
      initialPrompt: (data.initialPrompt as string) ?? '',
      ...(Array.isArray(data.participants) ? { participants: data.participants } : {}),
      turns: [turn],
      status: 'active',
    })
  }

  private shouldFlushForStructuredEvent(type: string): boolean {
    return (
      type === 'tool_start' ||
      type === 'tool_end' ||
      type === 'generation_start' ||
      type === 'generation_end' ||
      type === 'ui_block' ||
      type === 'a2a_message' ||
      type === 'retrieval_receipt' ||
      type === 'web_source'
    )
  }

  private scheduleFlush(
    state: ChatProgressiveStreamState,
    flushContentToDB: () => Promise<void>,
  ): void {
    if (state.flushTimer) return
    state.flushTimer = setTimeout(async () => {
      state.flushTimer = null
      await flushContentToDB()
    }, this.flushIntervalMs)
  }

  private logFirstVisibleActivity(
    state: ChatProgressiveStreamState,
    input: ChatProgressiveStreamSendInput,
    type: string,
    data: Record<string, unknown>,
  ): void {
    if (state.firstVisibleActivityLogged || !this.isFirstVisibleActivity(type, data)) return
    state.firstVisibleActivityLogged = true
    const name =
      typeof data.name === 'string'
        ? data.name
        : typeof data.label === 'string'
          ? data.label
          : 'none'
    input.logChatFlow(
      `[ChatFlow] first_visible_after_ms=${Date.now() - input.streamStartedAt} ${input.chatDiag} messageId=${input.messageId} type=${type} name=${name}`,
    )
    input.recordTimingSpan?.(
      'first_visible_output',
      input.getFirstVisibleSpanStart?.() ?? input.streamStartedAt,
      {
        event_type: type,
        event_name: name,
      },
    )
  }

  private isFirstVisibleActivity(type: string, data: Record<string, unknown>): boolean {
    if (type === 'content_delta') {
      return typeof data.content === 'string' && data.content.length > 0
    }
    if (type === 'thinking_delta') {
      return (
        (typeof data.delta === 'string' && data.delta.length > 0) ||
        (typeof data.text === 'string' && data.text.length > 0)
      )
    }
    return (
      type === 'tool_start' ||
      type === 'generation_start' ||
      type === 'ui_block' ||
      type === 'tool_content_preview' ||
      type === 'a2a_message'
    )
  }
}
