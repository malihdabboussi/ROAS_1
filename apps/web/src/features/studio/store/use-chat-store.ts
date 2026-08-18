'use client'

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ContextBreakdown } from '@vibey/context-breakdown'
import type { PastedTextBlock } from '@/features/composer/pasted-text'
import {
  getChatCreditsExhausted,
  setChatCreditsExhausted as setSharedChatCreditsExhausted,
  subscribeChatCreditsExhausted,
} from '@/lib/chat/chat-credit-state'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import type { ChatStreamFailure } from '../config/chat-stream-errors.config'
import { shouldReconnectPersistedAssistant } from '../lib/chat-turn-completion'
import type {
  ChatStreamRunState,
  Conversation,
  DocumentAttachment,
  HighlightedArtifact,
  Message,
  MessageReference,
} from '../types'

// ============================================================================
// Store Types
// ============================================================================

export interface ArtifactEvent {
  type: string
  id: string
  timestamp: number
}

export interface ImageGeneratedEvent {
  url: string
  target: string
  targetId: string
  slideIndex: number
  timestamp: number
}

export type FlowGenerationStage =
  | 'connecting'
  | 'accepted'
  | 'thinking'
  | 'tooling'
  | 'streaming'
  | 'completing'
  | 'completed'
  | 'failed'

export interface FlowGenerationBlock {
  id: string
  type: 'generation'
  stage: FlowGenerationStage
  message: string
  timestamp: number
  state: 'active' | 'complete' | 'failed'
}

export interface FlowToolBlock {
  id: string
  type: 'tool'
  name: string
  label: string
  /** vibey_backend action (e.g. create_offer) for action-specific icons */
  action?: string
  toolCallId?: string
  state: 'active' | 'complete' | 'failed'
  startedAt: number
  endedAt?: number
  progress: Array<{ id: string; detail: string; timestamp: number }>
}

export interface FlowUpdateBlock {
  id: string
  type: 'update'
  message: string
  timestamp: number
  parentToolName?: string
}

export type FlowTimelineBlock = FlowGenerationBlock | FlowToolBlock | FlowUpdateBlock

export interface ConversationStreamUI {
  agentPhase: 'idle' | 'thinking' | 'executing' | 'streaming' | 'complete'
  agentStatusMessage: string | null
  activeTools: Array<{ name: string; label: string; toolCallId?: string }>
  flowTimeline: FlowTimelineBlock[]
  imageGeneratedEvents: ImageGeneratedEvent[]
  statusMessages: string[]
}

export const DEFAULT_STREAM_UI: ConversationStreamUI = {
  agentPhase: 'idle',
  agentStatusMessage: null,
  activeTools: [],
  flowTimeline: [],
  imageGeneratedEvents: [],
  statusMessages: [],
}

export interface QueueItem {
  id: string
  content: string
  documents?: DocumentAttachment[]
  artifacts?: HighlightedArtifact[]
  references?: MessageReference[]
  model?: string
  extraSystemContext?: string
  modelSettings?: {
    reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
    context_window_tokens?: number
    speed_mode?: 'standard' | 'fast'
    cortex_max?: boolean
  }
}

function getUiBlockSignature(block: Record<string, unknown>): string {
  const type = typeof block.type === 'string' ? block.type : ''
  if (!type) return ''
  if (type === 'integration_connect') {
    const provider = typeof block.provider === 'string' ? block.provider : ''
    const title = typeof block.title === 'string' ? block.title : ''
    const description = typeof block.description === 'string' ? block.description : ''
    const status = typeof block.status === 'string' ? block.status : ''
    const problem = typeof block.problem === 'string' ? block.problem : ''
    const primaryAction = JSON.stringify(block.primaryAction ?? null)
    const secondaryActions = JSON.stringify(block.secondaryActions ?? null)
    const doctor = JSON.stringify(block.doctor ?? null)
    return `${type}|${provider}|${title}|${description}|${status}|${problem}|${primaryAction}|${secondaryActions}|${doctor}`
  }
  if (type === 'meta_ad_accounts') {
    const adId = typeof block.adId === 'string' ? block.adId : ''
    const campaignName = typeof block.campaignName === 'string' ? block.campaignName : ''
    return `${type}|${adId}|${campaignName}`
  }
  if (type === 'meta_status') {
    const metaAdId = typeof block.metaAdId === 'string' ? block.metaAdId : ''
    const status = typeof block.status === 'string' ? block.status : ''
    return `${type}|${metaAdId}|${status}`
  }
  return ''
}

// ============================================================================
// Pure timeline helpers (used by per-conversation stream UI updates)
// ============================================================================

/** True if any non-tool block appears after this tool index (e.g. generation, update) — then a new same name+action tool must not reuse that row. */
function timelineHasInterveningBlocksAfterTool(
  timeline: FlowTimelineBlock[],
  toolIdx: number,
): boolean {
  for (let i = toolIdx + 1; i < timeline.length; i++) {
    if (timeline[i]?.type !== 'tool') return true
  }
  return false
}

export function upsertGenerationInTimeline(
  timeline: FlowTimelineBlock[],
  stage: FlowGenerationStage,
  message: string,
  ts: number,
): FlowTimelineBlock[] {
  const blockId = `generation-${stage}`
  const existingIndex = timeline.findIndex(
    (b): b is FlowGenerationBlock => b.type === 'generation' && b.id === blockId,
  )
  const nextState: FlowGenerationBlock['state'] =
    stage === 'completed' ? 'complete' : stage === 'failed' ? 'failed' : 'active'
  if (existingIndex === -1) {
    return [
      ...timeline,
      { id: blockId, type: 'generation', stage, message, timestamp: ts, state: nextState },
    ]
  }
  return timeline.map((b, idx) =>
    idx === existingIndex
      ? ({ ...b, stage, message, timestamp: ts, state: nextState } as FlowTimelineBlock)
      : b,
  )
}

export function startToolInTimeline(
  timeline: FlowTimelineBlock[],
  name: string,
  label: string,
  action: string | undefined,
  ts: number,
  toolCallId?: string,
): FlowTimelineBlock[] {
  if (toolCallId) {
    const dup = timeline.findIndex(
      (b): b is FlowToolBlock => b.type === 'tool' && b.toolCallId === toolCallId,
    )
    if (dup !== -1) return timeline
  } else {
    const dup = timeline.findIndex(
      (b): b is FlowToolBlock => b.type === 'tool' && b.name === name && b.state === 'active',
    )
    if (dup !== -1) return timeline
  }

  if (action) {
    let lastToolIdx = -1
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i]?.type === 'tool') {
        lastToolIdx = i
        break
      }
    }
    if (lastToolIdx !== -1) {
      const last = timeline[lastToolIdx] as FlowToolBlock
      if (
        last.name === name &&
        last.action === action &&
        last.state !== 'active' &&
        !timelineHasInterveningBlocksAfterTool(timeline, lastToolIdx)
      ) {
        return timeline.map((b, i) =>
          i === lastToolIdx
            ? ({
                ...b,
                label,
                toolCallId,
                state: 'active',
                startedAt: ts,
                endedAt: undefined,
                progress: [],
              } as FlowTimelineBlock)
            : b,
        )
      }
    }
  }

  return [
    ...timeline,
    {
      id: toolCallId || `tool-${name}-${ts}`,
      type: 'tool' as const,
      name,
      label,
      ...(action ? { action } : {}),
      ...(toolCallId ? { toolCallId } : {}),
      state: 'active' as const,
      startedAt: ts,
      progress: [],
    },
  ]
}

export function progressToolInTimeline(
  timeline: FlowTimelineBlock[],
  name: string,
  detail: string,
  ts: number,
  toolCallId?: string,
): FlowTimelineBlock[] {
  let idx = -1
  for (let i = timeline.length - 1; i >= 0; i--) {
    const block = timeline[i]
    if (block?.type !== 'tool') continue
    if (toolCallId && (block as FlowToolBlock).toolCallId === toolCallId) {
      idx = i
      break
    }
    if (!toolCallId && block.name === name && (block as FlowToolBlock).state === 'active') {
      idx = i
      break
    }
  }
  if (idx === -1) return timeline
  const block = timeline[idx] as FlowToolBlock
  return timeline.map((b, i) =>
    i === idx
      ? ({
          ...block,
          progress: capToolProgressEntries([
            ...block.progress,
            { id: `tp-${name}-${ts}`, detail, timestamp: ts },
          ]),
        } as FlowTimelineBlock)
      : b,
  )
}

export function endToolInTimeline(
  timeline: FlowTimelineBlock[],
  name: string,
  label: string,
  status: 'completed' | 'failed',
  ts: number,
  toolCallId?: string,
): FlowTimelineBlock[] {
  let idx = -1
  for (let i = timeline.length - 1; i >= 0; i--) {
    const block = timeline[i]
    if (block?.type !== 'tool') continue
    if (toolCallId && (block as FlowToolBlock).toolCallId === toolCallId) {
      idx = i
      break
    }
    if (!toolCallId && block.name === name && (block as FlowToolBlock).state === 'active') {
      idx = i
      break
    }
  }
  if (idx === -1) return timeline
  const block = timeline[idx] as FlowToolBlock
  return timeline.map((b, i) =>
    i === idx
      ? ({
          ...block,
          label,
          state: status === 'completed' ? 'complete' : 'failed',
          endedAt: ts,
        } as FlowTimelineBlock)
      : b,
  )
}

interface ChatState {
  // Conversations
  conversations: Conversation[]
  activeConversationId: string | null

  // Messages
  messagesByConversation: Record<string, Message[]>
  isLoadingMessages: boolean

  // Streaming
  streamingMessageId: string | null
  streamingMessageIdsByConversation: Record<string, string | null>
  streamingConversationIds: string[]
  stoppingConversationIds: string[]
  reconnectingConversationIds: string[]
  interruptedConversationIds: string[]
  streamRunsByConversation: Record<string, ChatStreamRunState>
  isStreaming: boolean
  lastAgentEventAtByConversation: Record<string, number>
  lastStreamActivityAtByConversation: Record<string, number>

  // UI
  isSidebarOpen: boolean

  // Artifact Events
  artifactEvents: ArtifactEvent[]

  // Agent lifecycle phase (drives orb state)
  agentPhase: 'idle' | 'thinking' | 'executing' | 'streaming' | 'complete'

  // Last status message (from SSE status.message)
  agentStatusMessage: string | null

  // Active tools (shown during executing phase, supports parallel tool calls)
  activeTools: Array<{ name: string; label: string; toolCallId?: string }>

  // Status Messages (progress indicators from Pixel)
  statusMessages: string[]
  flowTimeline: FlowTimelineBlock[]

  // Image generation events (SSE)
  imageGeneratedEvents: ImageGeneratedEvent[]

  // Per-conversation stream UI (isolates concurrent streams)
  conversationStreamUI: Record<string, ConversationStreamUI>

  // Unread indicators
  unreadConversationIds: string[]

  // New conversation intent
  wantsNewConversation: boolean

  // Credit balance (updated via SSE credit_update events)
  creditBalance: {
    totalAvailable: number
    totalUsed: number
    baseCredits: number
  } | null

  // Credit warnings
  creditsLow: boolean
  creditsLowRemaining: number
  creditsExhausted: boolean

  // Inline error (rate limit notice shown above composer)
  inlineError: { message: string; model?: string; reason?: 'overloaded' | 'rate_limited' } | null

  // Last user-facing stream failure (toast + interrupted bar)
  streamFailureByConversation: Record<string, ChatStreamFailure>

  // New artifact indicators (transient, not persisted)
  newArtifactIds: string[]
  hasUnreadArtifacts: boolean

  // Message queue (per-conversation)
  messageQueueByConversation: Record<string, QueueItem[]>

  // Composer drafts (per-context, persisted)
  composerDraftByContext: Record<string, string>
  composerPastedBlocksByContext: Record<string, PastedTextBlock[]>

  // Pending composer text (set by external triggers like bulk-test button)
  pendingComposerText: string | null

  // Context window usage (per-conversation, updated on each done event)
  contextUsageByConversation: Record<string, { inputTokens: number; contextWindow: number }>
  contextBreakdownByConversation: Record<string, ContextBreakdown>

  // Actions — Conversations
  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  removeConversation: (id: string) => void
  setActiveConversationId: (id: string | null) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  clearActiveConversation: () => void
  setWantsNewConversation: (wants: boolean) => void
  promoteConversation: (id: string) => void

  // Actions — Messages
  setMessages: (conversationId: string, messages: Message[]) => void
  addMessage: (conversationId: string, message: Message) => void
  removeMessage: (conversationId: string, messageId: string) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void
  appendToMessage: (conversationId: string, messageId: string, content: string) => void
  moveMessages: (fromConversationId: string, toConversationId: string) => void
  setIsLoadingMessages: (loading: boolean) => void

  // Actions — Streaming
  setStreamingMessageId: (id: string | null) => void
  setConversationStreamingMessageId: (conversationId: string, id: string | null) => void
  setConversationStreaming: (conversationId: string, streaming: boolean) => void
  setConversationStopping: (conversationId: string, stopping: boolean) => void
  setConversationReconnecting: (conversationId: string, reconnecting: boolean) => void
  setConversationInterrupted: (conversationId: string, interrupted: boolean) => void
  setConversationStreamRun: (
    conversationId: string,
    run: Omit<ChatStreamRunState, 'updatedAt'>,
  ) => void
  updateConversationStreamCursor: (
    conversationId: string,
    cursor: string,
    runId?: string | null,
  ) => void
  clearConversationStreamRun: (conversationId: string) => void
  setIsStreaming: (streaming: boolean) => void
  touchAgentEvent: (conversationId: string, timestamp?: number) => void

  // Actions — UI
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Actions — Artifact Events
  addArtifactEvent: (evt: ArtifactEvent) => void
  clearArtifactEvents: () => void

  // Actions — Agent Phase
  setAgentPhase: (phase: 'idle' | 'thinking' | 'executing' | 'streaming' | 'complete') => void
  setAgentStatusMessage: (message: string | null) => void
  setActiveTools: (tools: Array<{ name: string; label: string; toolCallId?: string }>) => void

  // Actions — Status Messages
  addStatusMessage: (text: string) => void
  clearStatusMessages: () => void
  upsertGenerationBlock: (stage: FlowGenerationStage, message: string, timestamp?: number) => void
  startToolBlock: (name: string, label: string, action?: string, timestamp?: number) => void
  progressToolBlock: (name: string, detail: string, timestamp?: number) => void
  endToolBlock: (
    name: string,
    label: string,
    status: 'completed' | 'failed',
    timestamp?: number,
  ) => void
  addFlowUpdate: (message: string, parentToolName?: string, timestamp?: number) => void
  clearFlowTimeline: () => void
  appendTextToOrderedBlocks: (conversationId: string, messageId: string, text: string) => void
  pushToolToOrderedBlocks: (
    conversationId: string,
    messageId: string,
    tool: {
      name: string
      label: string
      action?: string
      toolCallId?: string
      state: 'active' | 'complete' | 'failed'
      startedAt: number
      endedAt?: number
    },
  ) => void
  updateToolBlockByName: (
    conversationId: string,
    messageId: string,
    toolName: string,
    status: 'completed' | 'failed',
    endedAt?: number,
    toolCallId?: string,
  ) => void
  appendToolProgressToOrderedBlocks: (
    conversationId: string,
    messageId: string,
    toolName: string,
    detail: string,
    timestamp?: number,
    toolCallId?: string,
  ) => void
  setOrderedBlocks: (
    conversationId: string,
    messageId: string,
    blocks: Array<Record<string, unknown>>,
  ) => void
  pushGenerationStartToOrderedBlocks: (
    conversationId: string,
    messageId: string,
    generation: { label: string; timestamp: number },
  ) => void
  completeGenerationInOrderedBlocks: (
    conversationId: string,
    messageId: string,
    timestamp: number,
  ) => void
  pushSessionCompactionToOrderedBlocks: (
    conversationId: string,
    messageId: string,
    compaction: { label: string; timestamp: number },
  ) => void
  completeSessionCompactionInOrderedBlocks: (
    conversationId: string,
    messageId: string,
    timestamp: number,
  ) => void
  appendUiBlockToOrderedBlocks: (
    conversationId: string,
    messageId: string,
    block: Record<string, unknown>,
  ) => void
  upsertA2AConversationBlock: (
    conversationId: string,
    messageId: string,
    delegationId: string,
    turnData: Record<string, unknown>,
    blockMeta?: Record<string, unknown>,
  ) => void
  completeA2AConversationBlocks: (conversationId: string, messageId: string) => void
  setToolContentPreview: (
    conversationId: string,
    messageId: string,
    toolName: string,
    content: string,
    toolCallId?: string,
  ) => void
  upsertThinkingTranscriptInOrderedBlocks: (
    conversationId: string,
    messageId: string,
    fullText: string,
  ) => void
  completeThinkingTranscriptInOrderedBlocks: (conversationId: string, messageId: string) => void

  // Actions — Unread
  markUnread: (conversationId: string) => void
  markRead: (conversationId: string) => void

  // Actions — Image Events
  addImageGeneratedEvent: (evt: ImageGeneratedEvent) => void
  clearImageGeneratedEvents: () => void

  // Actions — Per-conversation Stream UI
  updateConversationStreamUI: (
    conversationId: string,
    updater: (current: ConversationStreamUI) => Partial<ConversationStreamUI>,
  ) => void
  clearConversationStreamUI: (conversationId: string) => void
  finalizeStreamWithMessages: (
    conversationId: string,
    messages: Message[] | null,
    hasOtherActiveStreams: boolean,
    markAsUnread: boolean,
  ) => void

  // Actions — Credit Balance
  setCreditBalance: (balance: {
    totalAvailable: number
    totalUsed: number
    baseCredits: number
  }) => void
  setCreditsLow: (low: boolean, remaining?: number) => void
  setCreditsExhausted: (exhausted: boolean) => void

  // Actions — Inline Error
  setInlineError: (
    error: { message: string; model?: string; reason?: 'overloaded' | 'rate_limited' } | null,
  ) => void

  setConversationStreamFailure: (conversationId: string, failure: ChatStreamFailure | null) => void
  touchStreamActivity: (conversationId: string, timestamp?: number) => void

  // Actions — New Artifact Indicators
  addNewArtifactId: (id: string) => void
  markArtifactSeen: (id: string) => void
  clearUnreadArtifacts: () => void
  clearNewArtifactIds: () => void

  // Actions — Message Queue
  enqueueMessage: (conversationId: string, item: QueueItem) => void
  dequeueMessage: (conversationId: string) => QueueItem | undefined
  removeQueueItem: (conversationId: string, itemId: string) => void
  updateQueueItem: (conversationId: string, itemId: string, updates: Partial<QueueItem>) => void
  clearQueue: (conversationId: string) => void

  // Actions — Composer Drafts
  setComposerDraft: (contextKey: string, text: string) => void
  clearComposerDraft: (contextKey: string) => void
  setComposerPastedBlocks: (contextKey: string, blocks: PastedTextBlock[]) => void
  clearComposerPastedBlocks: (contextKey: string) => void

  // Actions — Pending Composer Text
  setPendingComposerText: (text: string | null) => void

  // Actions — Context Usage
  setContextUsage: (
    conversationId: string,
    usage: { inputTokens: number; contextWindow: number },
  ) => void
  setContextBreakdown: (conversationId: string, breakdown: ContextBreakdown) => void
}

// ============================================================================
// Persistence limits
// ============================================================================

// localStorage holds ~5MB per origin and the whole store is serialized on every
// write, so persisted history must stay bounded. Older conversations reload
// their messages from the API on open; only recent ones keep a local copy.
const PERSISTED_CONVERSATIONS_LIMIT = 100
const PERSISTED_MESSAGE_HISTORY_CONVERSATIONS = 20
const PERSISTED_MESSAGES_PER_CONVERSATION = 50
/** Live heap: keep message arrays only for active/streaming + a few recent chats. */
const IN_MEMORY_MESSAGE_CONVERSATIONS = 6
/** Tool progress lines grow every few hundred ms during heavy turns — keep a tail only. */
export const MAX_TOOL_PROGRESS_ENTRIES = 20
/** Live tool markdown/JSON previews are uncapped from the backend — cap for renderer RAM. */
export const MAX_TOOL_PREVIEW_CHARS = 8_000

export function capToolProgressEntries<T>(progress: T[]): T[] {
  if (progress.length <= MAX_TOOL_PROGRESS_ENTRIES) return progress
  return progress.slice(progress.length - MAX_TOOL_PROGRESS_ENTRIES)
}

export function capToolPreviewContent(content: string): string {
  if (content.length <= MAX_TOOL_PREVIEW_CHARS) return content
  return content.slice(content.length - MAX_TOOL_PREVIEW_CHARS)
}

function pickPersistedConversationIds(state: ChatState): Set<string> {
  const keep = new Set<string>()
  for (const c of state.conversations.slice(0, PERSISTED_MESSAGE_HISTORY_CONVERSATIONS)) {
    keep.add(c.id)
  }
  if (state.activeConversationId) keep.add(state.activeConversationId)
  return keep
}

function pickInMemoryConversationIds(
  state: Pick<ChatState, 'conversations' | 'activeConversationId' | 'streamingConversationIds'>,
): Set<string> {
  const keep = new Set<string>()
  if (state.activeConversationId) keep.add(state.activeConversationId)
  for (const id of state.streamingConversationIds) keep.add(id)
  for (const c of state.conversations.slice(0, IN_MEMORY_MESSAGE_CONVERSATIONS)) {
    keep.add(c.id)
  }
  return keep
}

function capByConversation<T>(source: Record<string, T>, keepIds: Set<string>): Record<string, T> {
  const result: Record<string, T> = {}
  for (const [conversationId, value] of Object.entries(source)) {
    if (keepIds.has(conversationId) || conversationId.startsWith('pending-')) {
      result[conversationId] = value
    }
  }
  return result
}

function slimOrderedBlocksForPersist(
  blocks: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return blocks.map((block) => {
    if (block.type !== 'tool') return block
    const next: Record<string, unknown> = { ...block }
    delete next.preview
    if (Array.isArray(next.progress)) {
      next.progress = capToolProgressEntries(next.progress as unknown[])
    }
    return next
  })
}

function slimMessagesForPersist(messages: Message[]): Message[] {
  return messages.map((message) => {
    const ordered = message.metadata?.content_blocks_ordered
    if (!Array.isArray(ordered) || ordered.length === 0) return message
    return {
      ...message,
      metadata: {
        ...message.metadata,
        content_blocks_ordered: slimOrderedBlocksForPersist(
          ordered as Array<Record<string, unknown>>,
        ),
      },
    }
  })
}

// ============================================================================
// Store
// ============================================================================

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // State
      conversations: [],
      activeConversationId: null,
      messagesByConversation: {},
      isLoadingMessages: false,
      streamingMessageId: null,
      streamingMessageIdsByConversation: {},
      streamingConversationIds: [],
      stoppingConversationIds: [],
      reconnectingConversationIds: [],
      interruptedConversationIds: [],
      streamRunsByConversation: {},
      isStreaming: false,
      lastAgentEventAtByConversation: {},
      lastStreamActivityAtByConversation: {},
      isSidebarOpen: true,
      agentPhase: 'idle' as const,
      agentStatusMessage: null,
      activeTools: [],
      artifactEvents: [],
      statusMessages: [],
      flowTimeline: [],
      imageGeneratedEvents: [],
      conversationStreamUI: {},
      unreadConversationIds: [],
      wantsNewConversation: false,
      creditBalance: null,
      creditsLow: false,
      creditsLowRemaining: 0,
      creditsExhausted: getChatCreditsExhausted(),
      inlineError: null,
      streamFailureByConversation: {},
      newArtifactIds: [],
      hasUnreadArtifacts: false,
      messageQueueByConversation: {},
      composerDraftByContext: {},
      composerPastedBlocksByContext: {},
      pendingComposerText: null,
      contextUsageByConversation: {},
      contextBreakdownByConversation: {},

      // Conversations
      setConversations: (conversations) => {
        const ctxUsage: Record<string, { inputTokens: number; contextWindow: number }> = {}
        const ctxBreakdown: Record<string, ContextBreakdown> = {}
        const visibleConversationIds = new Set(conversations.map((conversation) => conversation.id))
        for (const c of conversations) {
          const meta = c.metadata as Record<string, unknown> | undefined
          const inputTokens = meta?.last_call_input_tokens as number | undefined
          const contextWindow = meta?.context_window_tokens as number | undefined
          if (inputTokens && inputTokens > 0 && contextWindow && contextWindow > 0) {
            ctxUsage[c.id] = { inputTokens, contextWindow }
          }
          if (
            meta?.context_breakdown &&
            typeof meta.context_breakdown === 'object' &&
            (meta.context_breakdown as ContextBreakdown).version === 1
          ) {
            ctxBreakdown[c.id] = meta.context_breakdown as ContextBreakdown
          }
        }
        set((state) => {
          const messagesByConversation: Record<string, Message[]> = {}
          for (const [conversationId, messages] of Object.entries(state.messagesByConversation)) {
            if (
              visibleConversationIds.has(conversationId) ||
              conversationId.startsWith('pending-')
            ) {
              messagesByConversation[conversationId] = messages
            }
          }
          const activeConversationId =
            state.activeConversationId &&
            (visibleConversationIds.has(state.activeConversationId) ||
              state.activeConversationId.startsWith('pending-'))
              ? state.activeConversationId
              : null

          return {
            conversations,
            activeConversationId,
            messagesByConversation,
            unreadConversationIds: state.unreadConversationIds.filter((id) =>
              visibleConversationIds.has(id),
            ),
            contextUsageByConversation: { ...state.contextUsageByConversation, ...ctxUsage },
            contextBreakdownByConversation: {
              ...state.contextBreakdownByConversation,
              ...ctxBreakdown,
            },
          }
        })
      },

      addConversation: (conversation) =>
        set((state) => ({
          conversations: state.conversations.some((c) => c.id === conversation.id)
            ? state.conversations.map((c) => (c.id === conversation.id ? conversation : c))
            : [conversation, ...state.conversations],
        })),

      removeConversation: (id) =>
        set((state) => {
          const { [id]: _removedMessages, ...messagesByConversation } = state.messagesByConversation
          const { [id]: _removedStreamUi, ...conversationStreamUI } = state.conversationStreamUI
          const { [id]: _removedQueue, ...messageQueueByConversation } =
            state.messageQueueByConversation
          const { [id]: _removedStreamingMsg, ...streamingMessageIdsByConversation } =
            state.streamingMessageIdsByConversation
          const { [id]: _removedRun, ...streamRunsByConversation } = state.streamRunsByConversation
          const { [id]: _removedFailure, ...streamFailureByConversation } =
            state.streamFailureByConversation
          const { [id]: _removedUsage, ...contextUsageByConversation } =
            state.contextUsageByConversation
          const { [id]: _removedBreakdown, ...contextBreakdownByConversation } =
            state.contextBreakdownByConversation
          const { [id]: _removedEventAt, ...lastAgentEventAtByConversation } =
            state.lastAgentEventAtByConversation
          const { [id]: _removedActivityAt, ...lastStreamActivityAtByConversation } =
            state.lastStreamActivityAtByConversation
          return {
            conversations: state.conversations.filter((c) => c.id !== id),
            activeConversationId:
              state.activeConversationId === id ? null : state.activeConversationId,
            messagesByConversation,
            conversationStreamUI,
            messageQueueByConversation,
            streamingMessageIdsByConversation,
            streamRunsByConversation,
            streamFailureByConversation,
            contextUsageByConversation,
            contextBreakdownByConversation,
            lastAgentEventAtByConversation,
            lastStreamActivityAtByConversation,
            interruptedConversationIds: state.interruptedConversationIds.filter((i) => i !== id),
            reconnectingConversationIds: state.reconnectingConversationIds.filter((i) => i !== id),
            streamingConversationIds: state.streamingConversationIds.filter((i) => i !== id),
            stoppingConversationIds: state.stoppingConversationIds.filter((i) => i !== id),
            unreadConversationIds: state.unreadConversationIds.filter((i) => i !== id),
          }
        }),

      setActiveConversationId: (id) =>
        set((state) => {
          const keepMessageIds = pickInMemoryConversationIds({
            conversations: state.conversations,
            activeConversationId: id,
            streamingConversationIds: state.streamingConversationIds,
          })
          const messagesByConversation = capByConversation(
            state.messagesByConversation,
            keepMessageIds,
          )
          const conversationStreamUI = capByConversation(state.conversationStreamUI, keepMessageIds)
          if (state.activeConversationId === id) {
            if (!id || !state.unreadConversationIds.includes(id)) {
              if (
                Object.keys(messagesByConversation).length ===
                  Object.keys(state.messagesByConversation).length &&
                Object.keys(conversationStreamUI).length ===
                  Object.keys(state.conversationStreamUI).length
              ) {
                return state
              }
              return { messagesByConversation, conversationStreamUI }
            }
          }
          return {
            activeConversationId: id,
            unreadConversationIds: id
              ? state.unreadConversationIds.filter((uid) => uid !== id)
              : state.unreadConversationIds,
            messagesByConversation,
            conversationStreamUI,
          }
        }),

      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      clearActiveConversation: () =>
        set({
          activeConversationId: null,
        }),

      setWantsNewConversation: (wants) => set({ wantsNewConversation: wants }),

      promoteConversation: (id) =>
        set((state) => {
          const idx = state.conversations.findIndex((c) => c.id === id)
          if (idx <= 0) return state
          const promoted = state.conversations[idx]!
          return {
            conversations: [promoted, ...state.conversations.filter((c) => c.id !== id)],
          }
        }),

      markUnread: (conversationId) =>
        set((state) => ({
          unreadConversationIds: state.unreadConversationIds.includes(conversationId)
            ? state.unreadConversationIds
            : [...state.unreadConversationIds, conversationId],
        })),

      markRead: (conversationId) =>
        set((state) => ({
          unreadConversationIds: state.unreadConversationIds.filter((id) => id !== conversationId),
        })),

      // Messages
      setMessages: (conversationId, messages) =>
        set((state) => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: messages,
          },
        })),

      addMessage: (conversationId, message) =>
        set((state) => {
          const existing = state.messagesByConversation[conversationId] ?? []
          // Prevent duplicates
          if (existing.some((m) => m.id === message.id)) return state
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: [...existing, message],
            },
          }
        }),

      removeMessage: (conversationId, messageId) =>
        set((state) => {
          const existing = state.messagesByConversation[conversationId] ?? []
          if (existing.length === 0) return state
          if (!existing.some((m) => m.id === messageId)) return state
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: existing.filter((m) => m.id !== messageId),
            },
          }
        }),

      updateMessage: (conversationId, messageId, updates) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m,
              ),
            },
          }
        }),

      appendToMessage: (conversationId, messageId, content) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m) =>
                m.id === messageId ? { ...m, content: (m.content ?? '') + content } : m,
              ),
            },
          }
        }),

      moveMessages: (fromId, toId) =>
        set((state) => {
          const messages = state.messagesByConversation[fromId]
          if (!messages) return state
          const updated = { ...state.messagesByConversation }
          delete updated[fromId]
          updated[toId] = messages.map((m) => ({ ...m, conversation_id: toId }))
          const streamingMessageIdsByConversation = { ...state.streamingMessageIdsByConversation }
          if (Object.prototype.hasOwnProperty.call(streamingMessageIdsByConversation, fromId)) {
            streamingMessageIdsByConversation[toId] =
              streamingMessageIdsByConversation[fromId] ?? null
            delete streamingMessageIdsByConversation[fromId]
          }
          const streamingConversationIds = state.streamingConversationIds.map((id) =>
            id === fromId ? toId : id,
          )
          const reconnectingConversationIds = state.reconnectingConversationIds.map((id) =>
            id === fromId ? toId : id,
          )
          const interruptedConversationIds = state.interruptedConversationIds.map((id) =>
            id === fromId ? toId : id,
          )
          const streamRunsByConversation = { ...state.streamRunsByConversation }
          if (Object.prototype.hasOwnProperty.call(streamRunsByConversation, fromId)) {
            streamRunsByConversation[toId] = streamRunsByConversation[fromId]!
            delete streamRunsByConversation[fromId]
          }
          return {
            messagesByConversation: updated,
            streamingMessageIdsByConversation,
            streamingConversationIds,
            reconnectingConversationIds,
            interruptedConversationIds,
            streamRunsByConversation,
            activeConversationId:
              state.activeConversationId === fromId ? toId : state.activeConversationId,
          }
        }),

      setIsLoadingMessages: (loading) => set({ isLoadingMessages: loading }),

      // Streaming
      setStreamingMessageId: (id) => set({ streamingMessageId: id }),
      setConversationStreamingMessageId: (conversationId, id) =>
        set((state) => ({
          streamingMessageId:
            state.activeConversationId === conversationId ? id : state.streamingMessageId,
          streamingMessageIdsByConversation: {
            ...state.streamingMessageIdsByConversation,
            [conversationId]: id,
          },
        })),
      setConversationStreaming: (conversationId, streaming) =>
        set((state) => {
          const exists = state.streamingConversationIds.includes(conversationId)
          const streamingConversationIds = streaming
            ? exists
              ? state.streamingConversationIds
              : [...state.streamingConversationIds, conversationId]
            : state.streamingConversationIds.filter((id) => id !== conversationId)
          return {
            streamingConversationIds,
            isStreaming: streamingConversationIds.length > 0,
          }
        }),
      setConversationStopping: (conversationId, stopping) =>
        set((state) => {
          const exists = state.stoppingConversationIds.includes(conversationId)
          const stoppingConversationIds = stopping
            ? exists
              ? state.stoppingConversationIds
              : [...state.stoppingConversationIds, conversationId]
            : state.stoppingConversationIds.filter((id) => id !== conversationId)
          return { stoppingConversationIds }
        }),
      setConversationReconnecting: (conversationId, reconnecting) =>
        set((state) => {
          const exists = state.reconnectingConversationIds.includes(conversationId)
          const reconnectingConversationIds = reconnecting
            ? exists
              ? state.reconnectingConversationIds
              : [...state.reconnectingConversationIds, conversationId]
            : state.reconnectingConversationIds.filter((id) => id !== conversationId)
          return { reconnectingConversationIds }
        }),
      setConversationInterrupted: (conversationId, interrupted) =>
        set((state) => {
          const exists = state.interruptedConversationIds.includes(conversationId)
          const interruptedConversationIds = interrupted
            ? exists
              ? state.interruptedConversationIds
              : [...state.interruptedConversationIds, conversationId]
            : state.interruptedConversationIds.filter((id) => id !== conversationId)
          return { interruptedConversationIds }
        }),
      setConversationStreamRun: (conversationId, run) =>
        set((state) => ({
          streamRunsByConversation: {
            ...state.streamRunsByConversation,
            [conversationId]: {
              ...run,
              updatedAt: Date.now(),
            },
          },
        })),
      updateConversationStreamCursor: (conversationId, cursor, runId) =>
        set((state) => {
          const existing = state.streamRunsByConversation[conversationId]
          if (!existing) return {}
          if (runId && existing.runId !== runId) return {}
          return {
            streamRunsByConversation: {
              ...state.streamRunsByConversation,
              [conversationId]: {
                ...existing,
                cursor,
                updatedAt: Date.now(),
              },
            },
          }
        }),
      clearConversationStreamRun: (conversationId) =>
        set((state) => {
          if (!state.streamRunsByConversation[conversationId]) return {}
          const next = { ...state.streamRunsByConversation }
          delete next[conversationId]
          return { streamRunsByConversation: next }
        }),
      setIsStreaming: (streaming) => set({ isStreaming: streaming }),
      touchAgentEvent: (conversationId, timestamp) =>
        set((state) => ({
          lastAgentEventAtByConversation: {
            ...state.lastAgentEventAtByConversation,
            [conversationId]: timestamp ?? Date.now(),
          },
        })),

      // UI
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),

      // Artifact Events
      addArtifactEvent: (evt) =>
        set((state) => ({
          artifactEvents: [...state.artifactEvents, evt],
        })),
      clearArtifactEvents: () => set({ artifactEvents: [] }),

      setAgentPhase: (phase) => set({ agentPhase: phase }),
      setAgentStatusMessage: (message) => set({ agentStatusMessage: message }),
      setActiveTools: (tools) => set({ activeTools: tools }),

      addStatusMessage: (text) =>
        set((state) => ({
          statusMessages: [...state.statusMessages, text],
        })),
      clearStatusMessages: () => set({ statusMessages: [], activeTools: [] }),
      upsertGenerationBlock: (stage, message, timestamp) =>
        set((state) => {
          const ts = timestamp ?? Date.now()
          const blockId = `generation-${stage}`
          const existingIndex = state.flowTimeline.findIndex(
            (b): b is FlowGenerationBlock => b.type === 'generation' && b.id === blockId,
          )
          const nextState: FlowGenerationBlock['state'] =
            stage === 'completed' ? 'complete' : stage === 'failed' ? 'failed' : 'active'
          if (existingIndex === -1) {
            return {
              flowTimeline: [
                ...state.flowTimeline,
                {
                  id: blockId,
                  type: 'generation',
                  stage,
                  message,
                  timestamp: ts,
                  state: nextState,
                },
              ],
            }
          }
          return {
            flowTimeline: state.flowTimeline.map((b, idx) =>
              idx === existingIndex
                ? ({ ...b, stage, message, timestamp: ts, state: nextState } as FlowTimelineBlock)
                : b,
            ),
          }
        }),
      startToolBlock: (name, label, action, timestamp) =>
        set((state) => {
          const ts = timestamp ?? Date.now()
          const existingIndex = state.flowTimeline.findIndex(
            (b): b is FlowToolBlock => b.type === 'tool' && b.name === name && b.state === 'active',
          )
          if (existingIndex !== -1) return state

          if (action) {
            let lastToolIdx = -1
            for (let i = state.flowTimeline.length - 1; i >= 0; i--) {
              if (state.flowTimeline[i]?.type === 'tool') {
                lastToolIdx = i
                break
              }
            }
            if (lastToolIdx !== -1) {
              const last = state.flowTimeline[lastToolIdx] as FlowToolBlock
              if (
                last.name === name &&
                last.action === action &&
                last.state !== 'active' &&
                !timelineHasInterveningBlocksAfterTool(state.flowTimeline, lastToolIdx)
              ) {
                return {
                  flowTimeline: state.flowTimeline.map((b, i) =>
                    i === lastToolIdx
                      ? ({
                          ...b,
                          label,
                          state: 'active',
                          startedAt: ts,
                          endedAt: undefined,
                          progress: [],
                        } as FlowTimelineBlock)
                      : b,
                  ),
                }
              }
            }
          }

          const id = `tool-${name}-${ts}`
          return {
            flowTimeline: [
              ...state.flowTimeline,
              {
                id,
                type: 'tool',
                name,
                label,
                ...(action ? { action } : {}),
                state: 'active',
                startedAt: ts,
                progress: [],
              },
            ],
          }
        }),
      progressToolBlock: (name, detail, timestamp) =>
        set((state) => {
          const ts = timestamp ?? Date.now()
          let idx = -1
          for (let i = state.flowTimeline.length - 1; i >= 0; i--) {
            const block = state.flowTimeline[i]
            if (block?.type === 'tool' && block.name === name) {
              idx = i
              break
            }
          }
          if (idx === -1) return state
          const block = state.flowTimeline[idx] as FlowToolBlock
          return {
            flowTimeline: state.flowTimeline.map((b, i) =>
              i === idx
                ? ({
                    ...block,
                    progress: [
                      ...block.progress,
                      { id: `tp-${name}-${ts}`, detail, timestamp: ts },
                    ],
                  } as FlowTimelineBlock)
                : b,
            ),
          }
        }),
      endToolBlock: (name, label, status, timestamp) =>
        set((state) => {
          const ts = timestamp ?? Date.now()
          let idx = -1
          for (let i = state.flowTimeline.length - 1; i >= 0; i--) {
            const block = state.flowTimeline[i]
            if (block?.type === 'tool' && block.name === name) {
              idx = i
              break
            }
          }
          if (idx === -1) return state
          const block = state.flowTimeline[idx] as FlowToolBlock
          return {
            flowTimeline: state.flowTimeline.map((b, i) =>
              i === idx
                ? ({
                    ...block,
                    label,
                    state: status === 'completed' ? 'complete' : 'failed',
                    endedAt: ts,
                  } as FlowTimelineBlock)
                : b,
            ),
          }
        }),
      addFlowUpdate: (message, parentToolName, timestamp) =>
        set((state) => ({
          flowTimeline: [
            ...state.flowTimeline,
            {
              id: `update-${timestamp ?? Date.now()}`,
              type: 'update',
              message,
              timestamp: timestamp ?? Date.now(),
              parentToolName,
            },
          ],
        })),
      clearFlowTimeline: () => set({ flowTimeline: [] }),

      appendTextToOrderedBlocks: (conversationId, messageId, text) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          const last = existing[existing.length - 1]
          const next =
            last?.type === 'text'
              ? [
                  ...existing.slice(0, -1),
                  { ...last, content: ((last.content as string) ?? '') + text },
                ]
              : [...existing, { type: 'text' as const, id: `text-${Date.now()}`, content: text }]
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      pushToolToOrderedBlocks: (conversationId, messageId, tool) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          const id = tool.toolCallId || `tool-${tool.name}-${tool.startedAt}`
          const duplicateIdx = tool.toolCallId
            ? existing.findIndex(
                (b) => b?.type === 'tool' && (b.toolCallId as string) === tool.toolCallId,
              )
            : existing.findIndex(
                (b) =>
                  b?.type === 'tool' &&
                  (b.name as string) === tool.name &&
                  (b.label as string) === tool.label &&
                  (b.action as string | undefined) === tool.action &&
                  (b.state as string) === 'active',
              )

          if (duplicateIdx !== -1) {
            const previous = existing[duplicateIdx]!
            const previousState = previous.state as string | undefined
            const isTerminal = previousState === 'complete' || previousState === 'failed'
            const updated: Record<string, unknown> = {
              ...previous,
              type: 'tool' as const,
              id: (previous.id as string | undefined) || id,
              name: tool.name,
              label: tool.label,
              state: isTerminal ? previousState : tool.state,
              startedAt:
                typeof previous.startedAt === 'number' ? previous.startedAt : tool.startedAt,
            }
            if (tool.action) updated.action = tool.action
            if (tool.toolCallId) updated.toolCallId = tool.toolCallId
            if (isTerminal) {
              if (previous.endedAt !== undefined) updated.endedAt = previous.endedAt
            } else if (tool.endedAt !== undefined) {
              updated.endedAt = tool.endedAt
            } else {
              delete updated.endedAt
            }
            const next = existing.map((b, i) => (i === duplicateIdx ? updated : b))
            return {
              messagesByConversation: {
                ...state.messagesByConversation,
                [conversationId]: messages.map((m, i) =>
                  i === msgIdx
                    ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                    : m,
                ),
              },
            }
          }

          if (tool.action) {
            let lastToolIdx = -1
            for (let i = existing.length - 1; i >= 0; i--) {
              if (existing[i]?.type === 'tool') {
                lastToolIdx = i
                break
              }
            }
            if (lastToolIdx !== -1) {
              const last = existing[lastToolIdx]!
              if (
                last.name === tool.name &&
                last.action === tool.action &&
                last.state !== 'active' &&
                lastToolIdx === existing.length - 1
              ) {
                const next = existing.map((b, i) =>
                  i === lastToolIdx ? { type: 'tool' as const, id, ...tool } : b,
                )
                return {
                  messagesByConversation: {
                    ...state.messagesByConversation,
                    [conversationId]: messages.map((m, i) =>
                      i === msgIdx
                        ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                        : m,
                    ),
                  },
                }
              }
            }
          }

          const next = [...existing, { type: 'tool' as const, id, ...tool }]
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      updateToolBlockByName: (conversationId, messageId, toolName, status, endedAt, toolCallId?) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          let targetIdx = -1
          for (let i = existing.length - 1; i >= 0; i--) {
            const b = existing[i]
            if (b?.type !== 'tool') continue
            if (toolCallId && (b.toolCallId as string) === toolCallId) {
              targetIdx = i
              break
            }
            if (
              !toolCallId &&
              (b.name as string) === toolName &&
              (b.state as string) === 'active'
            ) {
              targetIdx = i
              break
            }
          }
          // Match flowTimeline / tool_end: if the event carries tool_call_id but the ordered block
          // never stored it (or id drifted), strict id match leaves the tool stuck "active".
          if (targetIdx === -1 && toolCallId) {
            for (let i = existing.length - 1; i >= 0; i--) {
              const b = existing[i]
              if (b?.type !== 'tool') continue
              if ((b.name as string) === toolName && (b.state as string) === 'active') {
                targetIdx = i
                break
              }
            }
          }
          if (targetIdx === -1) {
            return state
          }
          const next = existing.map((b, i) => {
            if (i !== targetIdx) return b
            const updated: Record<string, unknown> = {
              ...b,
              state: (status === 'completed' ? 'complete' : 'failed') as 'complete' | 'failed',
              endedAt: endedAt ?? Date.now(),
            }
            delete updated.preview
            return updated
          })
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      appendToolProgressToOrderedBlocks: (
        conversationId,
        messageId,
        toolName,
        detail,
        timestamp,
        toolCallId?,
      ) =>
        set((state) => {
          if (!detail.trim()) return state
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          let targetIdx = -1
          for (let i = existing.length - 1; i >= 0; i--) {
            const b = existing[i]
            if (b?.type !== 'tool') continue
            if (toolCallId && (b.toolCallId as string) === toolCallId) {
              targetIdx = i
              break
            }
            if (
              !toolCallId &&
              (b.name as string) === toolName &&
              (b.state as string) === 'active'
            ) {
              targetIdx = i
              break
            }
          }
          if (targetIdx === -1 && toolCallId) {
            for (let i = existing.length - 1; i >= 0; i--) {
              const b = existing[i]
              if (b?.type !== 'tool') continue
              if ((b.name as string) === toolName && (b.state as string) === 'active') {
                targetIdx = i
                break
              }
            }
          }
          if (targetIdx === -1) return state
          const ts = timestamp ?? Date.now()
          const next = existing.map((b, i) => {
            if (i !== targetIdx) return b
            const progress = Array.isArray(b.progress)
              ? (b.progress as Array<Record<string, unknown>>)
              : []
            return {
              ...b,
              progress: capToolProgressEntries([
                ...progress,
                {
                  id: `tp-${toolName}-${ts}-${progress.length}`,
                  detail,
                  timestamp: ts,
                },
              ]),
            }
          })
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      setOrderedBlocks: (conversationId, messageId, blocks) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: blocks } }
                  : m,
              ),
            },
          }
        }),

      pushGenerationStartToOrderedBlocks: (conversationId, messageId, generation) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          const ts = generation.timestamp ?? Date.now()
          const activeIdx = existing.findIndex(
            (b) =>
              b?.type === 'generation' &&
              (b.state as string) === 'active' &&
              (b.label as string) === generation.label,
          )
          if (activeIdx !== -1) return state
          const next = [
            ...existing,
            {
              type: 'generation' as const,
              id: `gen-${ts}`,
              label: generation.label,
              state: 'active' as const,
              startedAt: ts,
            },
          ]
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      completeGenerationInOrderedBlocks: (conversationId, messageId, timestamp) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          const ts = timestamp ?? Date.now()
          let targetIdx = -1
          for (let i = existing.length - 1; i >= 0; i--) {
            const b = existing[i]
            if (b?.type === 'generation' && (b.state as string) === 'active') {
              targetIdx = i
              break
            }
          }
          if (targetIdx === -1) return state
          const next = existing.map((b, i) =>
            i === targetIdx ? { ...b, state: 'complete', endedAt: ts } : b,
          )
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      pushSessionCompactionToOrderedBlocks: (conversationId, messageId, compaction) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          const ts = compaction.timestamp ?? Date.now()
          const label = compaction.label.trim() || 'Summarizing our conversation'
          const activeIdx = existing.findIndex(
            (b) => b?.type === 'session_compaction' && (b.state as string) === 'active',
          )
          const next =
            activeIdx !== -1
              ? existing.map((b, i) => (i === activeIdx ? { ...b, label } : b))
              : [
                  ...existing,
                  {
                    type: 'session_compaction' as const,
                    id: `compaction-${ts}`,
                    label,
                    state: 'active' as const,
                    timestamp: ts,
                  },
                ]
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      completeSessionCompactionInOrderedBlocks: (conversationId, messageId, timestamp) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          const ts = timestamp ?? Date.now()
          let targetIdx = -1
          for (let i = existing.length - 1; i >= 0; i--) {
            const b = existing[i]
            if (b?.type === 'session_compaction' && (b.state as string) === 'active') {
              targetIdx = i
              break
            }
          }
          if (targetIdx === -1) return state
          const next = existing.map((b, i) =>
            i === targetIdx ? { ...b, state: 'complete', completedAt: ts } : b,
          )
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      appendUiBlockToOrderedBlocks: (conversationId, messageId, block) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) {
            return state
          }
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          const type = typeof block.type === 'string' ? block.type : ''
          if (!type) return state
          const incomingSignature = getUiBlockSignature(block)
          if (
            incomingSignature &&
            existing.some((candidate) => getUiBlockSignature(candidate) === incomingSignature)
          ) {
            return state
          }
          const ts = Date.now()
          const next = [
            ...existing,
            {
              ...block,
              type,
              id:
                typeof block.id === 'string' && block.id.trim().length > 0
                  ? block.id
                  : `ui-${ts}-${existing.length}`,
            },
          ]
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      upsertA2AConversationBlock: (conversationId, messageId, delegationId, turnData, blockMeta) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []

          const blockIdx = existing.findIndex(
            (b) => b.type === 'agent_conversation' && b.delegationId === delegationId,
          )

          const turn: Record<string, unknown> = {
            from: turnData.from,
            fromName: turnData.fromName,
            fromImage: turnData.fromImage,
            content: turnData.content ?? '',
            turnIndex: turnData.turnIndex ?? 0,
            turnType: turnData.turnType ?? 'message',
            timestamp: turnData.timestamp ?? Date.now(),
            ...(turnData.blockData ? { blockData: turnData.blockData } : {}),
          }

          let next: Array<Record<string, unknown>>
          if (blockIdx !== -1) {
            const prev = existing[blockIdx]!
            const prevTurns = (prev.turns as Array<Record<string, unknown>>) ?? []
            const existingTurnIdx = prevTurns.findIndex(
              (t) => t.turnIndex === turn.turnIndex && t.turnType === turn.turnType,
            )
            const updatedTurns =
              existingTurnIdx !== -1
                ? prevTurns.map((t, i) => (i === existingTurnIdx ? turn : t))
                : [...prevTurns, turn]
            next = existing.map((b, i) =>
              i === blockIdx ? { ...prev, turns: updatedTurns, status: 'active' } : b,
            )
          } else {
            next = [
              ...existing,
              {
                type: 'agent_conversation',
                id: `a2a-${delegationId}`,
                delegationId,
                callerAgent: blockMeta?.callerAgent ?? '',
                callerAgentName: blockMeta?.callerAgentName ?? '',
                callerAgentImage: blockMeta?.callerAgentImage,
                callerAgentRole: blockMeta?.callerAgentRole ?? '',
                targetAgent: blockMeta?.targetAgent ?? '',
                targetAgentName: blockMeta?.targetAgentName ?? '',
                targetAgentImage: blockMeta?.targetAgentImage,
                targetAgentRole: blockMeta?.targetAgentRole ?? '',
                delegationType: blockMeta?.delegationType ?? 'query',
                initialPrompt: blockMeta?.initialPrompt ?? '',
                ...(Array.isArray(blockMeta?.participants)
                  ? { participants: blockMeta.participants }
                  : {}),
                turns: [turn],
                status: 'active',
              },
            ]
          }

          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      completeA2AConversationBlocks: (conversationId, messageId) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          const hasActive = existing.some(
            (b) => b.type === 'agent_conversation' && b.status === 'active',
          )
          if (!hasActive) return state
          const next = existing.map((b) =>
            b.type === 'agent_conversation' && b.status === 'active'
              ? { ...b, status: 'completed' }
              : b,
          )
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      setToolContentPreview: (conversationId, messageId, toolName, content, toolCallId?) =>
        set((state) => {
          const cappedContent = capToolPreviewContent(content)
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) {
            return state
          }
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          let targetIdx = -1
          for (let i = existing.length - 1; i >= 0; i--) {
            const b = existing[i]
            if (b?.type !== 'tool') continue
            if (toolCallId && (b.toolCallId as string) === toolCallId) {
              targetIdx = i
              break
            }
            if ((b.name as string) === toolName && (b.state as string) === 'active') {
              targetIdx = i
              break
            }
          }
          if (targetIdx === -1) {
            for (let i = existing.length - 1; i >= 0; i--) {
              const b = existing[i]
              if (b?.type !== 'tool') continue
              if ((b.name as string) === toolName) {
                targetIdx = i
                break
              }
            }
          }
          if (targetIdx === -1) {
            const ts = Date.now()
            const fallbackToolBlock: Record<string, unknown> = {
              type: 'tool',
              id: `ui-preview-${ts}-${existing.length}`,
              name: toolName || 'campaign_capability',
              label: 'Working...',
              state: 'active',
              startedAt: ts,
              ...(toolCallId ? { toolCallId } : {}),
              preview: cappedContent,
            }
            const next = [...existing, fallbackToolBlock]
            return {
              messagesByConversation: {
                ...state.messagesByConversation,
                [conversationId]: messages.map((m, i) =>
                  i === msgIdx
                    ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                    : m,
                ),
              },
            }
          }
          const next = existing.map((b, i) =>
            i === targetIdx ? { ...b, preview: cappedContent } : b,
          )
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      upsertThinkingTranscriptInOrderedBlocks: (conversationId, messageId, fullText) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          const MAX_THINKING_CHARS = 10_000
          const capped =
            fullText.length > MAX_THINKING_CHARS
              ? fullText.slice(fullText.length - MAX_THINKING_CHARS)
              : fullText
          const now = Date.now()
          let activeIdx = -1
          for (let i = existing.length - 1; i >= 0; i--) {
            const block = existing[i]
            if (block?.type === 'thinking_transcript' && block.state === 'active') {
              activeIdx = i
              break
            }
          }
          const next =
            activeIdx !== -1
              ? existing.map((b, i) =>
                  i === activeIdx ? { ...b, content: capped, updatedAt: now } : b,
                )
              : [
                  ...existing,
                  {
                    type: 'thinking_transcript' as const,
                    id: `thinking-transcript-${messageId}-${now}-${existing.length}`,
                    content: capped,
                    state: 'active' as const,
                    updatedAt: now,
                  },
                ]
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      completeThinkingTranscriptInOrderedBlocks: (conversationId, messageId) =>
        set((state) => {
          const messages = state.messagesByConversation[conversationId]
          if (!messages) return state
          const msgIdx = messages.findIndex((m) => m.id === messageId)
          if (msgIdx === -1) return state
          const msg = messages[msgIdx]!
          const existing =
            (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
          let idx = -1
          for (let i = existing.length - 1; i >= 0; i--) {
            const block = existing[i]
            if (block?.type === 'thinking_transcript' && block.state === 'active') {
              idx = i
              break
            }
          }
          if (idx === -1) return state
          const next = existing.map((b, i) => (i === idx ? { ...b, state: 'complete' } : b))
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: messages.map((m, i) =>
                i === msgIdx
                  ? { ...m, metadata: { ...m.metadata, content_blocks_ordered: next } }
                  : m,
              ),
            },
          }
        }),

      addImageGeneratedEvent: (evt) =>
        set((state) => ({
          imageGeneratedEvents: [...state.imageGeneratedEvents, evt],
        })),
      clearImageGeneratedEvents: () => set({ imageGeneratedEvents: [] }),

      // Per-conversation Stream UI
      updateConversationStreamUI: (conversationId, updater) =>
        set((state) => {
          const current = state.conversationStreamUI[conversationId] ?? DEFAULT_STREAM_UI
          const patch = updater(current)
          const next = { ...current, ...patch }
          const isActive = state.activeConversationId === conversationId
          return {
            conversationStreamUI: {
              ...state.conversationStreamUI,
              [conversationId]: next,
            },
            ...(isActive
              ? {
                  agentPhase: next.agentPhase,
                  agentStatusMessage: next.agentStatusMessage,
                  activeTools: next.activeTools,
                  flowTimeline: next.flowTimeline,
                  imageGeneratedEvents: next.imageGeneratedEvents,
                  statusMessages: next.statusMessages,
                }
              : {}),
          }
        }),
      clearConversationStreamUI: (conversationId) =>
        set((state) => {
          const isActive = state.activeConversationId === conversationId
          const updated = { ...state.conversationStreamUI }
          delete updated[conversationId]
          return {
            conversationStreamUI: updated,
            ...(isActive
              ? {
                  agentPhase: 'idle' as const,
                  agentStatusMessage: null,
                  activeTools: [],
                  flowTimeline: [],
                  imageGeneratedEvents: [],
                  statusMessages: [],
                }
              : {}),
          }
        }),

      finalizeStreamWithMessages: (conversationId, messages, hasOtherActiveStreams, markAsUnread) =>
        set((state) => {
          const isActive = state.activeConversationId === conversationId
          const streamUI = { ...state.conversationStreamUI }
          delete streamUI[conversationId]
          const streamingMsgIds = { ...state.streamingMessageIdsByConversation }
          delete streamingMsgIds[conversationId]
          return {
            ...(messages
              ? {
                  messagesByConversation: {
                    ...state.messagesByConversation,
                    [conversationId]: messages,
                  },
                }
              : {}),
            streamingMessageId: isActive ? null : state.streamingMessageId,
            streamingMessageIdsByConversation: streamingMsgIds,
            streamingConversationIds: state.streamingConversationIds.filter(
              (id) => id !== conversationId,
            ),
            stoppingConversationIds: state.stoppingConversationIds.filter(
              (id) => id !== conversationId,
            ),
            isStreaming: hasOtherActiveStreams,
            conversationStreamUI: streamUI,
            ...(isActive
              ? {
                  agentPhase: 'idle' as const,
                  agentStatusMessage: null,
                  activeTools: [],
                  flowTimeline: [],
                  imageGeneratedEvents: [],
                  statusMessages: [],
                }
              : {}),
            ...(markAsUnread
              ? {
                  unreadConversationIds: state.unreadConversationIds.includes(conversationId)
                    ? state.unreadConversationIds
                    : [...state.unreadConversationIds, conversationId],
                }
              : {}),
          }
        }),

      // Credit Balance
      setCreditBalance: (balance) => set({ creditBalance: balance }),
      setCreditsLow: (low, remaining) =>
        set({ creditsLow: low, creditsLowRemaining: remaining ?? 0 }),
      setCreditsExhausted: (exhausted) => {
        set({ creditsExhausted: exhausted })
        setSharedChatCreditsExhausted(exhausted)
      },

      // Inline Error
      setInlineError: (error) => set({ inlineError: error }),

      setConversationStreamFailure: (conversationId, failure) =>
        set((state) => {
          const next = { ...state.streamFailureByConversation }
          if (failure) next[conversationId] = failure
          else delete next[conversationId]
          return { streamFailureByConversation: next }
        }),
      touchStreamActivity: (conversationId, timestamp) =>
        set((state) => ({
          lastStreamActivityAtByConversation: {
            ...state.lastStreamActivityAtByConversation,
            [conversationId]: timestamp ?? Date.now(),
          },
        })),

      // New Artifact Indicators
      addNewArtifactId: (id) =>
        set((state) => ({
          newArtifactIds: state.newArtifactIds.includes(id)
            ? state.newArtifactIds
            : [...state.newArtifactIds, id],
          hasUnreadArtifacts: true,
        })),
      markArtifactSeen: (id) =>
        set((state) => ({
          newArtifactIds: state.newArtifactIds.filter((aid) => aid !== id),
        })),
      clearUnreadArtifacts: () => set({ hasUnreadArtifacts: false }),
      clearNewArtifactIds: () => set({ newArtifactIds: [], hasUnreadArtifacts: false }),

      // Message Queue
      enqueueMessage: (conversationId, item) =>
        set((state) => ({
          messageQueueByConversation: {
            ...state.messageQueueByConversation,
            [conversationId]: [...(state.messageQueueByConversation[conversationId] ?? []), item],
          },
        })),

      dequeueMessage: (conversationId: string): QueueItem | undefined => {
        const queue = get().messageQueueByConversation[conversationId] ?? []
        if (queue.length === 0) return undefined
        const [first, ...rest] = queue
        set((state) => ({
          messageQueueByConversation: {
            ...state.messageQueueByConversation,
            [conversationId]: rest,
          },
        }))
        return first
      },

      removeQueueItem: (conversationId, itemId) =>
        set((state) => ({
          messageQueueByConversation: {
            ...state.messageQueueByConversation,
            [conversationId]: (state.messageQueueByConversation[conversationId] ?? []).filter(
              (item) => item.id !== itemId,
            ),
          },
        })),

      updateQueueItem: (conversationId, itemId, updates) =>
        set((state) => ({
          messageQueueByConversation: {
            ...state.messageQueueByConversation,
            [conversationId]: (state.messageQueueByConversation[conversationId] ?? []).map(
              (item) => (item.id === itemId ? { ...item, ...updates } : item),
            ),
          },
        })),

      clearQueue: (conversationId) =>
        set((state) => ({
          messageQueueByConversation: {
            ...state.messageQueueByConversation,
            [conversationId]: [],
          },
        })),

      setComposerDraft: (contextKey, text) =>
        set((state) => {
          if (state.composerDraftByContext[contextKey] === text) return state
          return {
            composerDraftByContext: {
              ...state.composerDraftByContext,
              [contextKey]: text,
            },
          }
        }),

      clearComposerDraft: (contextKey) =>
        set((state) => {
          if (!(contextKey in state.composerDraftByContext)) return state
          const updated = { ...state.composerDraftByContext }
          delete updated[contextKey]
          return { composerDraftByContext: updated }
        }),

      setComposerPastedBlocks: (contextKey, blocks) =>
        set((state) => {
          const current = state.composerPastedBlocksByContext[contextKey]
          if (
            current === blocks ||
            (current?.length === blocks.length &&
              current.every(
                (block, index) =>
                  block.id === blocks[index]?.id && block.text === blocks[index]?.text,
              ))
          ) {
            return state
          }
          return {
            composerPastedBlocksByContext: {
              ...state.composerPastedBlocksByContext,
              [contextKey]: blocks,
            },
          }
        }),

      clearComposerPastedBlocks: (contextKey) =>
        set((state) => {
          if (!(contextKey in state.composerPastedBlocksByContext)) return state
          const updated = { ...state.composerPastedBlocksByContext }
          delete updated[contextKey]
          return { composerPastedBlocksByContext: updated }
        }),

      setPendingComposerText: (text) => set({ pendingComposerText: text }),

      setContextUsage: (conversationId, usage) =>
        set((state) => ({
          contextUsageByConversation: {
            ...state.contextUsageByConversation,
            [conversationId]: usage,
          },
        })),

      setContextBreakdown: (conversationId, breakdown) =>
        set((state) => ({
          contextBreakdownByConversation: {
            ...state.contextBreakdownByConversation,
            [conversationId]: breakdown,
          },
        })),
    }),
    {
      name: getOrgScopedKey('vibey-web-chat-store'),
      storage: createJSONStorage(() => {
        // Throws on the server, which makes zustand skip persistence — same as
        // the default `() => localStorage` factory.
        const base = window.localStorage
        return {
          getItem: (name) => base.getItem(name),
          setItem: (name, value) => {
            // Mid-stream writes stringify multi‑MB graphs on every token. Keep the
            // previous blob and resume persisting when streamingConversationIds clears.
            if (useChatStore.getState().streamingConversationIds.length > 0) return
            try {
              base.setItem(name, value)
            } catch {
              // Quota exceeded: the stale oversized blob under this key is the
              // usual culprit — drop it and retry once. If the write still
              // fails, skip persistence rather than crash the app mid-chat.
              try {
                base.removeItem(name)
                base.setItem(name, value)
              } catch {
                /* persistence skipped for this write */
              }
            }
          },
          removeItem: (name) => base.removeItem(name),
        }
      }),
      partialize: (state) => {
        // Avoid allocating a huge JSON string while a turn is streaming; setItem
        // also no-ops so the previous localStorage snapshot stays intact.
        if (state.streamingConversationIds.length > 0) {
          return { activeConversationId: state.activeConversationId } as unknown as ChatState
        }
        const keepIds = pickPersistedConversationIds(state)
        const messagesByConversation: Record<string, Message[]> = {}
        for (const [conversationId, messages] of Object.entries(
          capByConversation(state.messagesByConversation, keepIds),
        )) {
          const capped =
            messages.length > PERSISTED_MESSAGES_PER_CONVERSATION
              ? messages.slice(-PERSISTED_MESSAGES_PER_CONVERSATION)
              : messages
          messagesByConversation[conversationId] = slimMessagesForPersist(capped)
        }
        return {
          conversations: state.conversations.slice(0, PERSISTED_CONVERSATIONS_LIMIT),
          activeConversationId: state.activeConversationId,
          messagesByConversation,
          messageQueueByConversation: capByConversation(state.messageQueueByConversation, keepIds),
          streamRunsByConversation: capByConversation(state.streamRunsByConversation, keepIds),
          composerDraftByContext: state.composerDraftByContext,
          composerPastedBlocksByContext: state.composerPastedBlocksByContext,
          creditBalance: state.creditBalance,
        } as unknown as ChatState
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<ChatState>
        const seen = new Set<string>()
        const conversations = (p.conversations ?? []).filter((c) => {
          if (seen.has(c.id)) return false
          seen.add(c.id)
          return true
        })
        return { ...(current as ChatState), ...p, conversations } as ChatState
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const activeId = state.activeConversationId
        if (!activeId) return
        const msgs = state.messagesByConversation[activeId]
        if (!msgs || msgs.length === 0) return
        const last = msgs[msgs.length - 1]
        if (shouldReconnectPersistedAssistant(last)) {
          useChatStore.setState((s) => ({
            reconnectingConversationIds: s.reconnectingConversationIds.includes(activeId)
              ? s.reconnectingConversationIds
              : [...s.reconnectingConversationIds, activeId],
          }))
        }
      },
    },
  ),
)

subscribeChatCreditsExhausted((creditsExhausted) => {
  if (useChatStore.getState().creditsExhausted === creditsExhausted) return
  useChatStore.setState({ creditsExhausted })
})

// ============================================================================
// Hydration Hook (gates UI until localStorage data is loaded)
// ============================================================================

export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useChatStore.persist?.hasHydrated() ?? false)
  useEffect(() => {
    const unsub = useChatStore.persist?.onFinishHydration(() => setHydrated(true))
    return () => {
      unsub?.()
    }
  }, [])
  return hydrated
}

// ============================================================================
// Selectors (for component use)
// ============================================================================

/** Stable empty array — prevents useSyncExternalStore infinite loop from [] !== [] */
const EMPTY_MESSAGES: Message[] = []

export function useActiveMessages(): Message[] {
  const activeId = useChatStore((s) => s.activeConversationId)
  const messages = useChatStore((s) =>
    activeId ? (s.messagesByConversation[activeId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
  )
  if (messages.length === 0) return messages
  const visible = messages.filter((m) => !(m.metadata as Record<string, unknown>)?.hidden)
  return visible.length === messages.length ? messages : visible
}

const EMPTY_QUEUE: QueueItem[] = []

export function useActiveQueue(): QueueItem[] {
  const activeId = useChatStore((s) => s.activeConversationId)
  const queueByConversation = useChatStore((s) => s.messageQueueByConversation)
  if (!activeId) return EMPTY_QUEUE
  return queueByConversation[activeId] ?? EMPTY_QUEUE
}

export function useActiveContextUsage(): {
  inputTokens: number
  contextWindow: number
} | null {
  const activeId = useChatStore((s) => s.activeConversationId)
  const contextUsageByConversation = useChatStore((s) => s.contextUsageByConversation)
  if (!activeId) return null
  return contextUsageByConversation[activeId] ?? null
}

export function useActiveContextBreakdown(): ContextBreakdown | null {
  const activeId = useChatStore((s) => s.activeConversationId)
  const contextBreakdownByConversation = useChatStore((s) => s.contextBreakdownByConversation)
  if (!activeId) return null
  return contextBreakdownByConversation[activeId] ?? null
}
