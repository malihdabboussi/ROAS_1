'use client'

import type { ContextBreakdown } from '@vibey/context-breakdown'
import {
  backendDelete,
  backendFetch,
  backendGet,
  backendPatch,
  backendPost,
} from '@/lib/api/backend-client'
import type { ChatModelSettings } from '@/lib/chat/chat-model-settings'
import {
  canApplyFirstMessageTitle,
  titleFromFirstUserMessage,
} from '@/lib/conversations/conversation-title'
import {
  duplicateConversation as duplicateConversationViaApi,
  fetchConversations,
} from '@/lib/conversations/conversations-api'
import { stripEmoji } from '@/lib/utils/text'
import { ChatStreamUserError, resolveChatStreamFailure } from '../config/chat-stream-errors.config'
import {
  assistantHasRenderableText,
  assistantHasVisibleOutput,
  getLastAssistantMessage,
  isAssistantTurnComplete,
} from '../lib/chat-turn-completion'
import { reportStudioError } from '../lib/report-studio-error'
import {
  endToolInTimeline,
  progressToolInTimeline,
  startToolInTimeline,
  upsertGenerationInTimeline,
  useChatStore,
} from '../store/use-chat-store'
import type {
  ChatStatusResponse,
  ChatTimelineEvent,
  Conversation,
  Message,
  SendMessageParams,
} from '../types'
import { applySourcePanelEvent } from './apply-retrieval-receipt-event'
import { ensureGeneralCampaign } from './campaign.service'
import { buildChatResumeContext } from './chat-resume-context'
import { isConversationUnavailableError } from './conversation-load-errors'

export {
  ChatStreamUserError,
  toastMessageForChatSendError,
} from '../config/chat-stream-errors.config'
export {
  assignConversationCampaign,
  deleteConversation,
  deleteConversationShare,
  fetchConversations,
  fetchConversationShares,
  renameConversation,
  setConversationArchived,
  setConversationPinned,
  upsertConversationShare,
} from '@/lib/conversations/conversations-api'
export { readConversationModelSettings } from '@/lib/chat/chat-model-settings'
export type { ChatModelSettings, ModelReasoningEffort } from '@/lib/chat/chat-model-settings'
export type { LlmModelOption } from '../types'

function normalizeUiBlock(block: unknown): Record<string, unknown> | null {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return null
  const record = block as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type.trim() : ''
  if (!type) return null
  return {
    ...record,
    type,
    id:
      typeof record.id === 'string' && record.id.trim().length > 0 ? record.id : `ui-${Date.now()}`,
  }
}

const appliedTimelineSeqByMessage = new Map<string, number>()

function upsertRecoveredMessage(conversationId: string, message: Message): void {
  const store = useChatStore.getState()
  const localMessages = store.messagesByConversation[conversationId] ?? []
  const existing = localMessages.find((m) => m.id === message.id)
  if (!existing) {
    store.setMessages(conversationId, [...localMessages, message])
    return
  }
  store.setMessages(
    conversationId,
    preserveLatestAssistantContent(
      localMessages.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
      localMessages,
    ),
  )
}

export function applyRecoveredTimelineEvents(
  conversationId: string,
  messageId: string,
  events: ChatTimelineEvent[] | undefined,
): void {
  if (!events?.length) return
  const store = useChatStore.getState()
  const currentMessage = (store.messagesByConversation[conversationId] ?? []).find(
    (m) => m.id === messageId,
  )
  const currentBlocks =
    (currentMessage?.metadata?.content_blocks_ordered as
      | Array<Record<string, unknown>>
      | undefined) ?? []
  const key = `${conversationId}:${messageId}`
  const orderedEvents = [...events].sort((a, b) => a.seq - b.seq)
  const maxSeq = orderedEvents[orderedEvents.length - 1]?.seq ?? 0
  if (currentBlocks.length > 0 && !appliedTimelineSeqByMessage.has(key)) {
    appliedTimelineSeqByMessage.set(key, maxSeq)
    return
  }

  const lastAppliedSeq = appliedTimelineSeqByMessage.get(key) ?? 0
  for (const event of orderedEvents) {
    if (event.seq <= lastAppliedSeq) continue
    const payload = event.payload ?? {}
    const ts = new Date(event.created_at).getTime() || Date.now()
    switch (event.type) {
      case 'status': {
        const phase = (payload.phase as string) ?? 'thinking'
        const message =
          typeof payload.message === 'string' && payload.message.trim().length > 0
            ? payload.message.trim()
            : null
        if (phase === 'compacting') {
          store.pushSessionCompactionToOrderedBlocks(conversationId, messageId, {
            label: message ?? 'Summarizing our conversation',
            timestamp: ts,
          })
          break
        }
        store.completeSessionCompactionInOrderedBlocks(conversationId, messageId, ts)
        const mapped =
          phase === 'streaming' ? 'streaming' : phase === 'executing' ? 'executing' : 'thinking'
        store.updateConversationStreamUI(conversationId, () => ({
          agentPhase: mapped as 'streaming' | 'executing' | 'thinking',
          ...(message !== null ? { agentStatusMessage: message } : {}),
        }))
        break
      }
      case 'tool_start': {
        const name = (payload.name as string) ?? 'tool'
        const label = stripEmoji((payload.label as string) ?? 'Working...')
        const action = payload.action as string | undefined
        const toolCallId =
          typeof payload.tool_call_id === 'string' ? payload.tool_call_id : undefined
        store.pushToolToOrderedBlocks(conversationId, messageId, {
          name,
          label,
          ...(action ? { action } : {}),
          ...(toolCallId ? { toolCallId } : {}),
          state: 'active',
          startedAt: ts,
        })
        break
      }
      case 'tool_update': {
        const detail = stripEmoji((payload.detail as string) ?? '').trim()
        if (!detail) break
        store.appendToolProgressToOrderedBlocks(
          conversationId,
          messageId,
          (payload.name as string) ?? 'tool',
          detail,
          ts,
          typeof payload.tool_call_id === 'string' ? payload.tool_call_id : undefined,
        )
        break
      }
      case 'tool_end': {
        store.updateToolBlockByName(
          conversationId,
          messageId,
          (payload.name as string) ?? 'tool',
          ((payload.status as string) ?? 'completed') === 'completed' ? 'completed' : 'failed',
          ts,
          typeof payload.tool_call_id === 'string' ? payload.tool_call_id : undefined,
        )
        break
      }
      case 'generation_start':
        store.pushGenerationStartToOrderedBlocks(conversationId, messageId, {
          label: (payload.label as string) ?? 'Generating...',
          timestamp: ts,
        })
        break
      case 'generation_end':
        store.completeGenerationInOrderedBlocks(conversationId, messageId, ts)
        break
      case 'ui_block': {
        const block = normalizeUiBlock(payload.block)
        if (block) store.appendUiBlockToOrderedBlocks(conversationId, messageId, block)
        break
      }
      case 'a2a_message': {
        const delegationId = payload.delegationId as string | undefined
        if (!delegationId) break
        if (payload.delegationStatus === 'completed' || payload.delegationStatus === 'failed') {
          store.completeA2AConversationBlocks(conversationId, messageId)
          break
        }
        store.upsertA2AConversationBlock(
          conversationId,
          messageId,
          delegationId,
          {
            from: payload.from,
            fromName: payload.fromName,
            fromImage: payload.fromImage,
            content: payload.content ?? '',
            turnIndex: payload.turnIndex ?? 0,
            turnType: payload.turnType ?? 'message',
            timestamp: payload.timestamp ?? ts,
            ...(payload.blockData ? { blockData: payload.blockData } : {}),
          },
          payload.callerAgent
            ? {
                callerAgent: payload.callerAgent,
                callerAgentName: payload.callerAgentName ?? payload.callerAgent,
                callerAgentImage: payload.callerAgentImage,
                callerAgentRole: payload.callerAgentRole ?? '',
                targetAgent: payload.targetAgent,
                targetAgentName: payload.targetAgentName ?? payload.targetAgent,
                targetAgentImage: payload.targetAgentImage,
                targetAgentRole: payload.targetAgentRole ?? '',
                delegationType: payload.delegationType ?? 'query',
                initialPrompt: payload.initialPrompt ?? '',
                ...(Array.isArray(payload.participants)
                  ? { participants: payload.participants }
                  : {}),
              }
            : undefined,
        )
        break
      }
      case 'retrieval_receipt':
      case 'web_source':
        applySourcePanelEvent(conversationId, messageId, payload)
        break
    }
    appliedTimelineSeqByMessage.set(key, event.seq)
  }
}

function blockRecord(block: unknown): Record<string, unknown> | null {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return null
  return block as Record<string, unknown>
}

function blockId(block: unknown): string | null {
  const record = blockRecord(block)
  const id = record?.id
  return typeof id === 'string' && id.length > 0 ? id : null
}

function isPendingClarificationBlock(block: unknown): boolean {
  const record = blockRecord(block)
  if (!record || record.type !== 'clarification') return false
  const status = record.status
  return status !== 'submitted' && status !== 'skipped'
}

function hasAssistantDisplayContent(message: Message | undefined): boolean {
  return assistantHasVisibleOutput(message)
}

export function mergeOrderedContentBlocks(
  localOrdered: unknown[],
  backendOrdered: unknown[],
): unknown[] {
  if (backendOrdered.length === 0) return localOrdered
  if (localOrdered.length === 0) return backendOrdered

  const backendIds = new Set(
    backendOrdered.map((block) => blockId(block)).filter((id): id is string => Boolean(id)),
  )
  const merged = [...backendOrdered]

  for (const block of localOrdered) {
    if (!isPendingClarificationBlock(block)) continue
    const id = blockId(block)
    if (id && backendIds.has(id)) continue
    merged.push(block)
    if (id) backendIds.add(id)
  }

  return merged
}

function resolveLocalAssistantMessageForMerge(
  backendMsg: Message,
  localMessages: Message[],
  backendMessages: Message[],
): Message | undefined {
  const direct = localMessages.find((message) => message.id === backendMsg.id)
  if (direct) return direct

  const isLatestBackendAssistant =
    backendMsg === [...backendMessages].reverse().find((message) => message.role === 'assistant')
  if (!isLatestBackendAssistant) return undefined

  const latestLocalAssistant = [...localMessages].reverse().find(hasAssistantDisplayContent)
  if (!latestLocalAssistant || latestLocalAssistant.id === backendMsg.id) return undefined

  const localOrdered =
    (latestLocalAssistant.metadata?.content_blocks_ordered as unknown[] | undefined) ?? []
  if (localOrdered.some(isPendingClarificationBlock)) return latestLocalAssistant

  // Streamed content can live on a temp/local id while the DB row uses the canonical id.
  if (!hasAssistantDisplayContent(backendMsg) && hasAssistantDisplayContent(latestLocalAssistant)) {
    return latestLocalAssistant
  }

  return undefined
}

export function mergeMessagesPreservingOrderedBlocks(
  localMessages: Message[],
  backendMessages: Message[],
): Message[] {
  if (localMessages.length === 0) return backendMessages
  if (backendMessages.length === 0) return localMessages

  const mergedMessages = backendMessages.map((backendMsg) => {
    if (backendMsg.role !== 'assistant') return backendMsg

    const localMsg = resolveLocalAssistantMessageForMerge(
      backendMsg,
      localMessages,
      backendMessages,
    )
    if (!localMsg) return backendMsg

    const backendOrdered =
      (backendMsg.metadata?.content_blocks_ordered as unknown[] | undefined) ?? []
    const localOrdered = (localMsg.metadata?.content_blocks_ordered as unknown[] | undefined) ?? []
    const shouldPreserveLocalContent =
      (backendMsg.content ?? '').trim().length === 0 && (localMsg.content ?? '').trim().length > 0
    if (localOrdered.length === 0) {
      return shouldPreserveLocalContent ? { ...backendMsg, content: localMsg.content } : backendMsg
    }

    const mergedOrdered =
      backendOrdered.length === 0
        ? localOrdered
        : mergeOrderedContentBlocks(localOrdered, backendOrdered)

    if (mergedOrdered === backendOrdered && !shouldPreserveLocalContent) return backendMsg

    return {
      ...backendMsg,
      ...(shouldPreserveLocalContent ? { content: localMsg.content } : {}),
      metadata: {
        ...(backendMsg.metadata ?? {}),
        content_blocks_ordered: mergedOrdered,
      },
    }
  })

  const backendIds = new Set(backendMessages.map((message) => message.id))
  const backendLastMessage = backendMessages[backendMessages.length - 1]
  const latestLocalAssistant = [...localMessages].reverse().find(hasAssistantDisplayContent)
  if (latestLocalAssistant && !backendIds.has(latestLocalAssistant.id)) {
    if (backendLastMessage?.role === 'user') {
      return preserveLatestAssistantContent(
        [...mergedMessages, latestLocalAssistant],
        localMessages,
      )
    }
    if (
      backendLastMessage?.role === 'assistant' &&
      !hasAssistantDisplayContent(backendLastMessage) &&
      hasAssistantDisplayContent(latestLocalAssistant)
    ) {
      const lastMerged = mergedMessages[mergedMessages.length - 1]
      if (lastMerged?.role === 'assistant' && !hasAssistantDisplayContent(lastMerged)) {
        const localOrdered =
          (latestLocalAssistant.metadata?.content_blocks_ordered as unknown[] | undefined) ?? []
        const backendOrdered =
          (lastMerged.metadata?.content_blocks_ordered as unknown[] | undefined) ?? []
        const mergedOrdered =
          localOrdered.length === 0
            ? backendOrdered
            : backendOrdered.length === 0
              ? localOrdered
              : mergeOrderedContentBlocks(localOrdered, backendOrdered)
        return preserveLatestAssistantContent(
          [
            ...mergedMessages.slice(0, -1),
            {
              ...lastMerged,
              content: latestLocalAssistant.content,
              metadata: {
                ...(lastMerged.metadata ?? {}),
                ...(mergedOrdered.length > 0 ? { content_blocks_ordered: mergedOrdered } : {}),
              },
            },
          ],
          localMessages,
        )
      }
    }
  }

  return preserveLatestAssistantContent(mergedMessages, localMessages)
}

function preserveLatestAssistantContent(
  mergedMessages: Message[],
  localMessages: Message[],
): Message[] {
  const localAssistant = getLastAssistantMessage(localMessages)
  if (!localAssistant || !hasAssistantDisplayContent(localAssistant)) return mergedMessages

  let assistantIndex = -1
  for (let index = mergedMessages.length - 1; index >= 0; index -= 1) {
    if (mergedMessages[index]?.role === 'assistant') {
      assistantIndex = index
      break
    }
  }

  if (assistantIndex < 0) {
    const lastMessage = mergedMessages[mergedMessages.length - 1]
    if (lastMessage?.role === 'user') {
      return [...mergedMessages, localAssistant]
    }
    return mergedMessages
  }

  const mergedAssistant = mergedMessages[assistantIndex]
  if (!mergedAssistant) return mergedMessages
  const mergedHasText = assistantHasRenderableText(mergedAssistant)
  const localHasText = assistantHasRenderableText(localAssistant)
  if (hasAssistantDisplayContent(mergedAssistant) && (mergedHasText || !localHasText)) {
    return mergedMessages
  }

  const localOrdered =
    (localAssistant.metadata?.content_blocks_ordered as unknown[] | undefined) ?? []
  const mergedOrdered =
    (mergedAssistant.metadata?.content_blocks_ordered as unknown[] | undefined) ?? []
  const nextOrdered =
    localOrdered.length === 0
      ? mergedOrdered
      : mergedOrdered.length === 0
        ? localOrdered
        : mergeOrderedContentBlocks(localOrdered, mergedOrdered)

  const next = [...mergedMessages]
  const localMetadata = localAssistant.metadata as Record<string, unknown> | undefined
  const mergedMetadata = mergedAssistant.metadata as Record<string, unknown> | undefined
  next[assistantIndex] = {
    ...mergedAssistant,
    content: localAssistant.content ?? mergedAssistant.content,
    content_blocks: localAssistant.content_blocks ?? mergedAssistant.content_blocks,
    metadata: {
      ...(mergedAssistant.metadata ?? {}),
      ...(nextOrdered.length > 0 ? { content_blocks_ordered: nextOrdered } : {}),
      ...(localMetadata?.duration_ms != null && mergedMetadata?.duration_ms == null
        ? { duration_ms: localMetadata.duration_ms }
        : {}),
    },
  }
  return next
}

function finalizeStreamEndMessages(
  localMessages: Message[],
  backendMessages: Message[],
): Message[] {
  const merged = preserveLatestAssistantContent(
    mergeMessagesPreservingOrderedBlocks(localMessages, backendMessages),
    localMessages,
  )
  const localAssistant = getLastAssistantMessage(localMessages)
  const mergedAssistant = getLastAssistantMessage(merged)
  if (!localAssistant || !mergedAssistant || !isAssistantTurnComplete(localAssistant, true)) {
    return merged
  }

  const assistantIndex = merged.findIndex((message) => message.id === mergedAssistant.id)
  if (assistantIndex < 0) return merged

  const mergedMetadata = mergedAssistant.metadata as Record<string, unknown> | undefined
  if (mergedMetadata?.duration_ms != null && assistantHasRenderableText(mergedAssistant)) {
    return merged
  }

  const next = [...merged]
  next[assistantIndex] = {
    ...mergedAssistant,
    content: assistantHasRenderableText(localAssistant)
      ? localAssistant.content
      : mergedAssistant.content,
    metadata: {
      ...(mergedAssistant.metadata ?? {}),
      duration_ms: mergedMetadata?.duration_ms ?? 1,
    },
  }
  return preserveLatestAssistantContent(next, localMessages)
}

export function finalizeCompletedConversationTurn(conversationId: string): void {
  abortRecovery(conversationId)
  if (shouldSkipStreamRecovery(conversationId)) {
    clearCompletedConversationRecoveryState(conversationId)
  }
}

function getAssistantOrderedBlockMessageIds(messages: Message[]): Set<string> {
  const ids = new Set<string>()
  for (const msg of messages) {
    if (msg.role !== 'assistant') continue
    const blocks = (msg.metadata?.content_blocks_ordered as unknown[] | undefined) ?? []
    if (blocks.length > 0) ids.add(msg.id)
  }
  return ids
}

export function isRealAgentStreamEvent(type: string): boolean {
  return (
    type === 'message_start' ||
    type === 'tool_start' ||
    type === 'tool_update' ||
    type === 'tool_content_preview' ||
    type === 'tool_end' ||
    type === 'generation_start' ||
    type === 'generation_end' ||
    type === 'ui_block' ||
    type === 'a2a_message' ||
    type === 'thinking_delta' ||
    type === 'content_delta' ||
    type === 'done'
  )
}

export function shouldMarkConversationInterruptedForStreamError(
  _hasRealAgentEventStarted: boolean,
): boolean {
  return true
}

export interface PrewarmChatContextParams {
  conversation_id: string | null | undefined
  campaign_id?: string | null
  space_id?: string | null
  scope_kind?: string | null
  model?: string | null
  model_settings?: ChatModelSettings | null
  source?: string | null
}

export const CHAT_WORKING_LABELS = [
  'Working',
  'Getting oriented',
  'Planning next moves',
  'Thinking through it',
  'Connecting the dots',
  'Moving things along',
  'Checking the next step',
  'Keeping the thread moving',
  'Sorting the pieces',
  'Getting ready',
] as const

export const CHAT_STATUS_MIN_DISPLAY_MS = 900
const CHAT_SEND_CONFLICT_RETRY_DELAYS_MS = [100, 250, 500] as const

const CHAT_STATUS_BUCKET_LABELS = {
  working: 'Working',
  loading_conversation: 'Getting oriented',
  preparing_context: 'Connecting the dots',
  checking_access: 'Checking the next step',
  starting_response: 'Moving to the next step',
  planning_response: 'Planning next moves',
} as const

const CHAT_BRAIN_CONTEXT_STATUS_LABELS = [
  'Reading your Brain',
  'Searching your Brain',
  'Finding useful memories',
  'Reviewing relevant Brain context',
  'Pulling relevant Brain context',
] as const

const CHAT_CONTEXT_READY_STATUS_LABELS = [
  'Connecting the dots',
  'Planning next moves',
  'Thinking through it',
  'Moving things along',
  'Checking the next step',
] as const

const CHAT_EXACT_STATUS_LABELS = new Set(
  [...CHAT_BRAIN_CONTEXT_STATUS_LABELS, ...CHAT_CONTEXT_READY_STATUS_LABELS].map((label) =>
    label.toLowerCase(),
  ),
)

let activePrewarm: {
  key: string
  controller: AbortController
} | null = null
let lastPrewarm: { key: string; at: number } | null = null
const PREWARM_REPEAT_SUPPRESSION_MS = 60_000

function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stableJson(item))
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    out[key] = stableJson((value as Record<string, unknown>)[key])
  }
  return out
}

function normalizePrewarmString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function buildChatPrewarmKey(params: PrewarmChatContextParams): string {
  return JSON.stringify({
    conversation_id: normalizePrewarmString(params.conversation_id),
    campaign_id: normalizePrewarmString(params.campaign_id),
    space_id: normalizePrewarmString(params.space_id),
    scope_kind: normalizePrewarmString(params.scope_kind),
    model: normalizePrewarmString(params.model),
    model_settings: stableJson(params.model_settings ?? null),
    source: normalizePrewarmString(params.source),
  })
}

export function resetChatPrewarmForTests(): void {
  activePrewarm?.controller.abort()
  activePrewarm = null
  lastPrewarm = null
}

export function prewarmChatContext(params: PrewarmChatContextParams): void {
  if (!params.conversation_id || isPendingConversationId(params.conversation_id)) return

  const key = buildChatPrewarmKey(params)
  if (activePrewarm?.key === key && !activePrewarm.controller.signal.aborted) return
  const now = Date.now()
  if (lastPrewarm?.key === key && now - lastPrewarm.at < PREWARM_REPEAT_SUPPRESSION_MS) return

  activePrewarm?.controller.abort()
  const controller = new AbortController()
  activePrewarm = { key, controller }
  lastPrewarm = { key, at: now }
  const payload = {
    conversation_id: params.conversation_id,
    ...(params.campaign_id !== undefined ? { campaign_id: params.campaign_id } : {}),
    ...(params.space_id !== undefined ? { space_id: params.space_id } : {}),
    ...(params.scope_kind !== undefined ? { scope_kind: params.scope_kind } : {}),
    ...(params.model !== undefined ? { model: params.model } : {}),
    ...(params.model_settings !== undefined ? { model_settings: params.model_settings } : {}),
    ...(params.source !== undefined ? { source: params.source } : {}),
  }
  void backendPost<{ ok: true; reused?: boolean; duration_ms?: number }>(
    '/api/chat/prewarm',
    payload,
    {
      signal: controller.signal,
      skipClientErrorLog: true,
    },
  )
    .catch(() => {
      if (lastPrewarm?.key === key) lastPrewarm = null
    })
    .finally(() => {
      if (activePrewarm?.key === key) activePrewarm = null
    })
}

export function createChatPrewarmScheduler(options?: {
  debounceMs?: number
  prewarm?: (params: PrewarmChatContextParams) => void
}) {
  const debounceMs = options?.debounceMs ?? 500
  const runPrewarm = options?.prewarm ?? prewarmChatContext
  let timer: ReturnType<typeof setTimeout> | null = null
  let latest: PrewarmChatContextParams | null = null
  const clear = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return {
    onFocus(params: PrewarmChatContextParams) {
      clear()
      runPrewarm(params)
    },
    onInput(params: PrewarmChatContextParams) {
      latest = params
      clear()
      timer = setTimeout(() => {
        timer = null
        if (latest) runPrewarm(latest)
      }, debounceMs)
    },
    cancel() {
      clear()
      latest = null
    },
  }
}

export function pickInitialWorkingStatus(seed = Date.now()): string {
  const index = Math.abs(Math.floor(seed)) % CHAT_WORKING_LABELS.length
  return CHAT_WORKING_LABELS[index] ?? 'Working'
}

export function bucketChatStatusMessage(input: {
  phase?: string | null
  message?: string | null
}): { phase: 'thinking' | 'executing' | 'streaming'; message: string | null } {
  const phase =
    input.phase === 'streaming'
      ? 'streaming'
      : input.phase === 'executing'
        ? 'executing'
        : 'thinking'
  const message = input.message?.trim() ?? ''
  if (!message) return { phase, message: null }
  if (phase !== 'thinking') return { phase, message }

  const lower = message.toLowerCase()
  if (CHAT_EXACT_STATUS_LABELS.has(lower)) {
    return { phase, message }
  }
  if (lower.includes('load') && lower.includes('conversation')) {
    return { phase, message: CHAT_STATUS_BUCKET_LABELS.loading_conversation }
  }
  if (lower.includes('access') || lower.includes('policy')) {
    return { phase, message: CHAT_STATUS_BUCKET_LABELS.checking_access }
  }
  if (lower.includes('start') && lower.includes('response')) {
    return { phase, message: CHAT_STATUS_BUCKET_LABELS.starting_response }
  }
  if (lower.includes('plan') && lower.includes('response')) {
    return { phase, message: CHAT_STATUS_BUCKET_LABELS.planning_response }
  }
  if (
    lower.includes('context') ||
    lower.includes('attachment') ||
    lower.includes('artifact') ||
    lower.includes('reference') ||
    lower.includes('skill') ||
    lower.includes('request') ||
    lower.includes('model') ||
    lower.includes('agent')
  ) {
    return { phase, message: CHAT_STATUS_BUCKET_LABELS.preparing_context }
  }
  return { phase, message: CHAT_STATUS_BUCKET_LABELS.working }
}

export function shouldApplyStatusUpdate(params: {
  currentPhase?: string | null
  nextPhase: string
  currentShownAt: number
  now: number
  minDurationMs?: number
}): boolean {
  if (params.nextPhase === 'executing' || params.nextPhase === 'streaming') return true
  if (params.currentPhase !== params.nextPhase && params.currentPhase !== undefined) return true
  const minDurationMs = params.minDurationMs ?? CHAT_STATUS_MIN_DISPLAY_MS
  return params.now - params.currentShownAt >= minDurationMs
}

async function waitWithAbort(ms: number, signal?: AbortSignal): Promise<boolean> {
  if (!signal) {
    await new Promise((resolve) => setTimeout(resolve, ms))
    return true
  }
  if (signal.aborted) return false
  return await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve(true)
    }, ms)
    const onAbort = () => {
      clearTimeout(timeout)
      signal.removeEventListener('abort', onAbort)
      resolve(false)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

async function reconcileCanonicalOrderedBlocks(params: {
  conversationId: string
  expectedMessageIds: Set<string>
  signal?: AbortSignal
}): Promise<void> {
  const { conversationId, expectedMessageIds, signal } = params
  if (expectedMessageIds.size === 0) return

  const delaysMs = [1000, 3000]
  for (const delayMs of delaysMs) {
    const shouldContinue = await waitWithAbort(delayMs, signal)
    if (!shouldContinue) return

    try {
      const store = useChatStore.getState()
      const localMessages = store.messagesByConversation[conversationId] ?? []
      const backendMessages = await fetchMessages(conversationId)
      const merged = mergeMessagesPreservingOrderedBlocks(localMessages, backendMessages)
      store.setMessages(conversationId, merged)

      const backendHasAllExpected = [...expectedMessageIds].every((id) => {
        const backendMsg = backendMessages.find((m) => m.id === id)
        if (!backendMsg || backendMsg.role !== 'assistant') return false
        const blocks = (backendMsg.metadata?.content_blocks_ordered as unknown[] | undefined) ?? []
        return blocks.length > 0
      })
      if (backendHasAllExpected) return
    } catch {
      // Best-effort canonical reconciliation; don't block UX.
    }
  }
}

// ============================================================================
// Active stream controllers (keyed by conversation ID)
// ============================================================================

const activeControllers = new Map<string, AbortController>()

function isPendingConversationId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('pending-')
}

export function abortStream(conversationId: string, options: { preserveRun?: boolean } = {}): void {
  const store = useChatStore.getState()
  const controller = activeControllers.get(conversationId)
  if (controller) {
    controller.abort()
    activeControllers.delete(conversationId)
  }
  // Also clear any lingering streaming state
  store.setConversationStreamingMessageId(conversationId, null)
  store.setConversationStreaming(conversationId, false)
  if (!options.preserveRun) {
    store.clearConversationStreamRun(conversationId)
  }
  if (store.activeConversationId === conversationId) {
    store.setStreamingMessageId(null)
  }
}

export function abortAllStreams(): void {
  activeControllers.forEach((controller) => controller.abort())
  activeControllers.clear()
  const store = useChatStore.getState()
  store.setStreamingMessageId(null)
  store.setIsStreaming(false)
  for (const conversationId of store.streamingConversationIds) {
    store.setConversationStreamingMessageId(conversationId, null)
    store.setConversationStreaming(conversationId, false)
    store.setConversationStopping(conversationId, false)
    store.clearConversationStreamRun(conversationId)
  }
}

export function isStreamActive(conversationId: string): boolean {
  return activeControllers.has(conversationId)
}

export async function requestStopStream(conversationId: string): Promise<boolean> {
  const store = useChatStore.getState()
  const runId = store.streamRunsByConversation[conversationId]?.runId ?? null
  store.setConversationStopping(conversationId, true)
  abortStream(conversationId)
  try {
    const result = await backendPost<{ stopped?: boolean }>('/api/chat/stop', {
      conversation_id: conversationId,
      ...(runId ? { run_id: runId } : {}),
    })
    return result.stopped === true
  } catch {
    return false
  } finally {
    store.setConversationStopping(conversationId, false)
  }
}

export async function fetchContextBaseline(
  conversationId: string,
): Promise<ContextBreakdown | null> {
  const result = await backendGet<{ context_breakdown?: ContextBreakdown | null }>(
    `/api/chat/conversations/${conversationId}/context-baseline`,
  )
  return result.context_breakdown ?? null
}

// ============================================================================
// Stream Recovery — DB-polling catch-up after disconnect
// ============================================================================

const RECOVER_POLL_INTERVAL_MS = 2_000
const RECOVER_RETRY_INTERVAL_MS = 3_000
const RECOVER_MAX_DURATION_MS = 90_000
const RECOVER_MAX_MESSAGE_AGE_MS = 5 * 60 * 1_000

export function needsStreamRecovery(messages: Message[]): boolean {
  const lastAssistant = getLastAssistantMessage(messages)
  if (!lastAssistant) return false
  if ((lastAssistant.metadata as Record<string, unknown> | undefined)?.duration_ms != null)
    return false
  return true
}

function clearCompletedConversationRecoveryState(conversationId: string): void {
  const store = useChatStore.getState()
  automaticRecoveryTurnIds.delete(conversationId)
  store.setConversationReconnecting(conversationId, false)
  store.setConversationStreaming(conversationId, false)
  store.setConversationInterrupted(conversationId, false)
  store.setConversationStreamFailure(conversationId, null)
  store.clearConversationStreamRun(conversationId)
  store.clearConversationStreamUI(conversationId)
  store.setIsStreaming(
    store.streamingConversationIds.filter((id) => id !== conversationId).length > 0 ||
      activeControllers.size > 0,
  )
}

function markConversationRecoveryRequired(
  conversationId: string,
  code: 'stream_interrupted' | 'context_window_exceeded' = 'stream_interrupted',
): void {
  const store = useChatStore.getState()
  store.setConversationReconnecting(conversationId, false)
  store.setConversationStreaming(conversationId, false)
  store.setConversationInterrupted(conversationId, true)
  store.setConversationStreamFailure(conversationId, resolveChatStreamFailure({ code }))
  store.setIsStreaming(activeControllers.size > 0)
}

export function shouldSkipStreamRecovery(conversationId: string): boolean {
  const store = useChatStore.getState()
  if (store.streamFailureByConversation[conversationId]?.showInterruptedBar) {
    return false
  }
  const messages = store.messagesByConversation[conversationId] ?? []
  return isAssistantTurnComplete(getLastAssistantMessage(messages), false)
}

const activeRecoveries = new Set<string>()
const activeRecoveryContinuations = new Set<string>()
const automaticRecoveryTurnIds = new Map<string, string>()
const recoveryAbortControllers = new Map<string, AbortController>()

function rememberStreamCursor(
  conversationId: string,
  event: Record<string, unknown>,
  fallbackMessageId?: string | null,
): void {
  const runId = typeof event.run_id === 'string' ? event.run_id : null
  const cursor = typeof event.cursor === 'string' ? event.cursor : null
  if (!runId && !cursor) return

  const messageId =
    typeof event.message_id === 'string'
      ? event.message_id
      : fallbackMessageId && !fallbackMessageId.startsWith('temp-')
        ? fallbackMessageId
        : null
  const store = useChatStore.getState()
  if (runId && messageId) {
    store.setConversationStreamRun(conversationId, {
      runId,
      messageId,
      cursor,
    })
    return
  }
  if (cursor) {
    store.updateConversationStreamCursor(conversationId, cursor, runId)
  }
}

export function abortRecovery(conversationId: string): void {
  recoveryAbortControllers.get(conversationId)?.abort()
  recoveryAbortControllers.delete(conversationId)
}

export async function recoverStalledConversation(conversationId: string): Promise<void> {
  const store = useChatStore.getState()
  store.setConversationStreamFailure(
    conversationId,
    resolveChatStreamFailure({ code: 'stream_interrupted' }),
  )
  store.setConversationReconnecting(conversationId, true)

  if (isStreamActive(conversationId)) {
    abortStream(conversationId, { preserveRun: true })
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  await recoverConversation(conversationId, { stalled: true })
}

export async function recoverConversation(
  conversationId: string,
  options: { manual?: boolean; stalled?: boolean } = {},
): Promise<void> {
  if (activeRecoveries.has(conversationId) || activeRecoveryContinuations.has(conversationId))
    return
  if (isStreamActive(conversationId)) return

  const storeAtStart = useChatStore.getState()
  const failureAtStart = storeAtStart.streamFailureByConversation[conversationId]
  const continuationFailureCode =
    failureAtStart?.code === 'stream_interrupted' ||
    failureAtStart?.code === 'context_window_exceeded'
      ? failureAtStart.code
      : null
  const shouldStartContinuation =
    continuationFailureCode === 'context_window_exceeded' ||
    (options.stalled === true && continuationFailureCode === 'stream_interrupted') ||
    (options.manual === true && continuationFailureCode === 'stream_interrupted')
  if (shouldStartContinuation && continuationFailureCode) {
    await continueInterruptedConversation(
      conversationId,
      continuationFailureCode,
      options.manual === true,
    )
    return
  }

  if (shouldSkipStreamRecovery(conversationId)) {
    clearCompletedConversationRecoveryState(conversationId)
    return
  }
  activeRecoveries.add(conversationId)

  abortRecovery(conversationId)
  const recoveryAbort = new AbortController()
  recoveryAbortControllers.set(conversationId, recoveryAbort)
  const signal = recoveryAbort.signal

  const store = useChatStore.getState()
  store.setConversationInterrupted(conversationId, false)

  const recoveryStartedAt = Date.now()
  let shownReconnecting = false
  let contactEstablished = false

  const pollOnce = async (streamInactive: boolean): Promise<'completed' | 'active' | 'dead'> => {
    const localBeforeFetch = useChatStore.getState().messagesByConversation[conversationId] ?? []
    const localAssistantBefore = getLastAssistantMessage(localBeforeFetch)
    const msgs = await fetchMessages(conversationId)
    if (signal.aborted) return 'dead'
    const merged = preserveLatestAssistantContent(
      mergeMessagesPreservingOrderedBlocks(localBeforeFetch, msgs),
      localBeforeFetch,
    )
    store.setMessages(conversationId, merged)

    const lastAssistant = getLastAssistantMessage(merged)
    if (!lastAssistant) return 'dead'
    if (isAssistantTurnComplete(lastAssistant, streamInactive)) return 'completed'
    if (streamInactive && isAssistantTurnComplete(localAssistantBefore, true)) {
      if (localAssistantBefore) {
        const restored = preserveLatestAssistantContent(merged, localBeforeFetch)
        store.setMessages(conversationId, restored)
      }
      return 'completed'
    }

    const age = Date.now() - new Date(lastAssistant.created_at).getTime()
    if (age > RECOVER_MAX_MESSAGE_AGE_MS) return 'dead'
    return 'active'
  }

  try {
    while (Date.now() - recoveryStartedAt < RECOVER_MAX_DURATION_MS) {
      if (signal.aborted || isStreamActive(conversationId)) {
        if (shownReconnecting) store.setConversationReconnecting(conversationId, false)
        return
      }
      try {
        const status = await backendGet<ChatStatusResponse>(`/api/chat/status/${conversationId}`)
        if (signal.aborted) return

        if (
          status.failureCode === 'stream_interrupted' ||
          status.failureCode === 'context_window_exceeded'
        ) {
          if (status.runId && status.messageId) {
            store.setConversationStreamRun(conversationId, {
              runId: status.runId,
              messageId: status.messageId,
              cursor: status.resumeCursor ?? null,
            })
          }
          await continueInterruptedConversation(conversationId, status.failureCode, false)
          return
        }

        if (!status.active) {
          const hasKnownInterruption =
            store.streamFailureByConversation[conversationId]?.code === 'stream_interrupted'
          const result = await pollOnce(!hasKnownInterruption)
          if (signal.aborted) return

          if (result === 'completed') {
            if (shownReconnecting) store.setConversationReconnecting(conversationId, false)
            store.setConversationStreaming(conversationId, false)
            store.setConversationInterrupted(conversationId, false)
            store.setConversationStreamFailure(conversationId, null)
            store.clearConversationStreamRun(conversationId)
            store.setIsStreaming(activeControllers.size > 0)
            return
          }

          if (hasKnownInterruption) {
            await continueInterruptedConversation(conversationId, 'stream_interrupted', false)
            return
          }

          if (result === 'active') {
            if (shouldSkipStreamRecovery(conversationId)) {
              clearCompletedConversationRecoveryState(conversationId)
              return
            }
            store.setConversationStreaming(conversationId, true)
            store.setIsStreaming(true)
            if (!shownReconnecting) {
              store.setConversationReconnecting(conversationId, true)
              shownReconnecting = true
            }
            store.touchAgentEvent(conversationId, Date.now())
            store.updateConversationStreamUI(conversationId, () => ({
              agentPhase: 'executing',
              agentStatusMessage: 'Resuming…',
            }))
            await new Promise((r) => setTimeout(r, RECOVER_POLL_INTERVAL_MS))
            continue
          }

          if (shownReconnecting) store.setConversationReconnecting(conversationId, false)
          store.setConversationStreaming(conversationId, false)
          store.setConversationInterrupted(conversationId, false)
          store.setConversationStreamFailure(conversationId, null)
          store.clearConversationStreamRun(conversationId)
          store.setIsStreaming(activeControllers.size > 0)
          return
        }

        store.setConversationStreaming(conversationId, true)
        store.setIsStreaming(true)
        if (status.messageId) {
          store.setConversationStreamingMessageId(conversationId, status.messageId)
        }
        if (status.message) {
          upsertRecoveredMessage(conversationId, status.message)
        }
        if (status.messageId) {
          applyRecoveredTimelineEvents(conversationId, status.messageId, status.timelineEvents)
        }

        if (status.runId && status.messageId) {
          const streamRun = useChatStore.getState().streamRunsByConversation[conversationId]
          const afterCursor = streamRun?.runId === status.runId ? streamRun.cursor : '0-0'
          try {
            const resumed = await resumeConversationStream({
              conversationId,
              runId: status.runId,
              messageId: status.messageId,
              afterCursor: afterCursor ?? '0-0',
              signal,
            })
            if (resumed === 'completed') {
              store.setConversationReconnecting(conversationId, false)
              store.setConversationStreaming(conversationId, false)
              store.setConversationInterrupted(conversationId, false)
              store.setConversationStreamFailure(conversationId, null)
              store.setIsStreaming(activeControllers.size > 0)
              return
            }
            if (resumed === 'failed') {
              await continueInterruptedConversation(conversationId, 'stream_interrupted', false)
              return
            }
          } catch {
            // Fall back to DB polling recovery below.
          }
        }

        if (!contactEstablished) {
          store.setConversationReconnecting(conversationId, true)
          shownReconnecting = true
        }

        const result = await pollOnce(!status.runId)
        if (signal.aborted) return
        if (result === 'completed') {
          store.setConversationReconnecting(conversationId, false)
          store.setConversationStreaming(conversationId, false)
          store.setConversationInterrupted(conversationId, false)
          store.setConversationStreamFailure(conversationId, null)
          store.setIsStreaming(activeControllers.size > 0)
          return
        }

        if (!contactEstablished) {
          contactEstablished = true
          store.setConversationReconnecting(conversationId, false)
          shownReconnecting = false
          store.touchAgentEvent(conversationId, Date.now())
          store.updateConversationStreamUI(conversationId, () => ({
            agentPhase: 'executing',
            agentStatusMessage: 'Resuming…',
          }))
        } else {
          store.touchAgentEvent(conversationId, Date.now())
        }

        await new Promise((r) => setTimeout(r, RECOVER_POLL_INTERVAL_MS))
      } catch {
        if (signal.aborted) return
        await new Promise((r) => setTimeout(r, RECOVER_RETRY_INTERVAL_MS))
      }
    }

    if (!signal.aborted) {
      await continueInterruptedConversation(conversationId, 'stream_interrupted', false)
    }
  } finally {
    activeRecoveries.delete(conversationId)
    recoveryAbortControllers.delete(conversationId)
    if (!signal.aborted) {
      if (shouldSkipStreamRecovery(conversationId)) {
        clearCompletedConversationRecoveryState(conversationId)
      } else {
        store.setConversationReconnecting(conversationId, false)
        if (!isStreamActive(conversationId)) {
          store.clearConversationStreamUI(conversationId)
        }
      }
    }
  }
}

async function continueInterruptedConversation(
  conversationId: string,
  failureCode: 'stream_interrupted' | 'context_window_exceeded',
  manual: boolean,
): Promise<void> {
  if (activeRecoveryContinuations.has(conversationId)) return
  activeRecoveryContinuations.add(conversationId)
  const storeAtStart = useChatStore.getState()
  try {
    let resumeMessages = storeAtStart.messagesByConversation[conversationId] ?? []
    try {
      const canonicalMessages = await fetchMessages(conversationId)
      resumeMessages = mergeMessagesPreservingOrderedBlocks(resumeMessages, canonicalMessages)
      storeAtStart.setMessages(conversationId, resumeMessages)
    } catch {
      // The local thread still contains the visible task and partial answer.
    }
    const latestAssistant = getLastAssistantMessage(resumeMessages)
    if (isAssistantTurnComplete(latestAssistant, false)) {
      clearCompletedConversationRecoveryState(conversationId)
      return
    }
    const visibleUserTurn = [...resumeMessages]
      .reverse()
      .find((message) => message.role === 'user' && message.metadata?.hidden !== true)
    const recoveryTurnId = visibleUserTurn?.id ?? `assistant:${latestAssistant?.id ?? 'unknown'}`
    if (!manual && automaticRecoveryTurnIds.get(conversationId) === recoveryTurnId) {
      markConversationRecoveryRequired(conversationId, failureCode)
      return
    }
    if (!manual) {
      automaticRecoveryTurnIds.set(conversationId, recoveryTurnId)
    }
    const resumeContext = buildChatResumeContext(resumeMessages)
    if (!resumeContext) {
      throw new Error('Cannot resume without the original user request')
    }
    if (failureCode === 'stream_interrupted') {
      await requestStopStream(conversationId)
    }
    storeAtStart.setConversationInterrupted(conversationId, false)
    storeAtStart.setConversationStreamFailure(conversationId, null)
    storeAtStart.setConversationReconnecting(conversationId, true)
    try {
      await sendMessageStreaming({
        conversation_id: conversationId,
        ...resumeContext,
        suppressUserMessage: true,
      })
      const recoveryFailure = useChatStore.getState().streamFailureByConversation[conversationId]
      if (recoveryFailure?.showInterruptedBar) {
        markConversationRecoveryRequired(conversationId, failureCode)
      } else {
        clearCompletedConversationRecoveryState(conversationId)
      }
    } catch (error) {
      markConversationRecoveryRequired(conversationId, failureCode)
      if (manual) throw error
    } finally {
      useChatStore.getState().setConversationReconnecting(conversationId, false)
    }
  } catch (error) {
    markConversationRecoveryRequired(conversationId, failureCode)
    if (manual) throw error
  } finally {
    activeRecoveryContinuations.delete(conversationId)
  }
}

async function resumeConversationStream(params: {
  conversationId: string
  runId: string
  messageId: string
  afterCursor: string
  signal: AbortSignal
}): Promise<'completed' | 'interrupted' | 'failed'> {
  const { conversationId, runId, messageId, afterCursor, signal } = params
  if (signal.aborted) return 'interrupted'

  const store = useChatStore.getState()
  const controller = new AbortController()
  activeControllers.set(conversationId, controller)
  const abort = () => controller.abort(signal.reason)
  signal.addEventListener('abort', abort, { once: true })

  let sawDone = false
  let activeMessageId = messageId
  const completeActiveThinkingTranscript = () => {
    store.completeThinkingTranscriptInOrderedBlocks(conversationId, activeMessageId)
  }

  try {
    store.setConversationStreamRun(conversationId, {
      runId,
      messageId,
      cursor: afterCursor || null,
    })
    store.setConversationStreamingMessageId(conversationId, messageId)
    store.setConversationStreaming(conversationId, true)
    store.setConversationReconnecting(conversationId, true)
    store.setConversationInterrupted(conversationId, false)
    store.setIsStreaming(true)

    const query = new URLSearchParams()
    query.set('after', afterCursor || '0-0')
    const response = await backendFetch(`/api/chat/runs/${runId}/stream?${query.toString()}`, {
      signal: controller.signal,
      skipClientErrorLog: true,
    })
    if (!response.ok) return 'interrupted'

    const reader = response.body?.getReader()
    if (!reader) return 'interrupted'

    const decoder = new TextDecoder()
    let buffer = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        store.touchStreamActivity(conversationId, Date.now())
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!(line.startsWith('data: ') || line.startsWith('data:'))) continue
          const data = line.startsWith('data: ') ? line.slice(6).trim() : line.slice(5).trim()
          if (data === '[DONE]') continue

          const event = JSON.parse(data) as Record<string, unknown>
          const type = event.type as string
          if (type !== 'error') {
            rememberStreamCursor(conversationId, event, activeMessageId)
          }
          store.touchAgentEvent(conversationId, Date.now())

          switch (type) {
            case 'message_start': {
              if (typeof event.message_id === 'string') {
                activeMessageId = event.message_id
                store.setConversationStreamingMessageId(conversationId, activeMessageId)
              }
              break
            }
            case 'context_update': {
              const contextBreakdown = event.context_breakdown as ContextBreakdown | undefined
              if (contextBreakdown?.version === 1) {
                store.setContextBreakdown(conversationId, contextBreakdown)
              }
              break
            }
            case 'retrieval_receipt':
            case 'web_source': {
              applySourcePanelEvent(
                conversationId,
                activeMessageId,
                event as Record<string, unknown>,
              )
              break
            }
            case 'status': {
              const phase = (event.phase as string) ?? 'thinking'
              const message =
                typeof event.message === 'string' && event.message.trim().length > 0
                  ? (event.message as string).trim()
                  : null
              if (phase === 'compacting') {
                store.pushSessionCompactionToOrderedBlocks(conversationId, activeMessageId, {
                  label: message ?? 'Summarizing our conversation',
                  timestamp: Date.now(),
                })
                break
              }
              store.completeSessionCompactionInOrderedBlocks(
                conversationId,
                activeMessageId,
                Date.now(),
              )
              const mapped = bucketChatStatusMessage({ phase, message })
              if (mapped.phase !== 'thinking') completeActiveThinkingTranscript()
              store.updateConversationStreamUI(conversationId, () => ({
                agentPhase: mapped.phase,
                ...(mapped.message !== null ? { agentStatusMessage: mapped.message } : {}),
              }))
              break
            }
            case 'tool_start': {
              const name = (event.name as string) ?? 'tool'
              const label = stripEmoji((event.label as string) ?? 'Working...')
              const action = event.action as string | undefined
              const toolCallId =
                typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
              const ts = Date.now()
              completeActiveThinkingTranscript()
              store.updateConversationStreamUI(conversationId, (ui) => ({
                agentPhase: 'executing',
                agentStatusMessage: null,
                activeTools: [...ui.activeTools, { name, label, toolCallId }],
                flowTimeline: startToolInTimeline(
                  ui.flowTimeline,
                  name,
                  label,
                  action,
                  ts,
                  toolCallId,
                ),
              }))
              store.pushToolToOrderedBlocks(conversationId, activeMessageId, {
                name,
                label,
                ...(action ? { action } : {}),
                ...(toolCallId ? { toolCallId } : {}),
                state: 'active',
                startedAt: ts,
              })
              break
            }
            case 'tool_update': {
              const name = (event.name as string) ?? 'tool'
              const detail = stripEmoji((event.detail as string) ?? '').trim()
              if (!detail) break
              const toolCallId =
                typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
              const ts = Date.now()
              store.updateConversationStreamUI(conversationId, (ui) => ({
                agentPhase: 'executing',
                flowTimeline: progressToolInTimeline(ui.flowTimeline, name, detail, ts, toolCallId),
              }))
              store.appendToolProgressToOrderedBlocks(
                conversationId,
                activeMessageId,
                name,
                detail,
                ts,
                toolCallId,
              )
              break
            }
            case 'tool_content_preview': {
              const name = (event.name as string) ?? ''
              const content = (event.content as string) ?? ''
              const toolCallId =
                typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
              if (content) {
                store.setToolContentPreview(
                  conversationId,
                  activeMessageId,
                  name,
                  content,
                  toolCallId,
                )
              }
              break
            }
            case 'tool_end': {
              const name = (event.name as string) ?? 'tool'
              const label = stripEmoji((event.label as string) ?? 'Done')
              const status =
                ((event.status as string) ?? 'completed') === 'completed' ? 'completed' : 'failed'
              const toolCallId =
                typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
              const ts = Date.now()
              store.updateConversationStreamUI(conversationId, (ui) => {
                const remaining = ui.activeTools.filter((t) =>
                  toolCallId ? t.toolCallId !== toolCallId : t.name !== name,
                )
                return {
                  agentPhase: remaining.length > 0 ? 'executing' : 'thinking',
                  agentStatusMessage: remaining.length > 0 ? label : null,
                  activeTools: remaining,
                  statusMessages: [...ui.statusMessages, label],
                  flowTimeline: endToolInTimeline(
                    ui.flowTimeline,
                    name,
                    label,
                    status,
                    ts,
                    toolCallId,
                  ),
                }
              })
              store.updateToolBlockByName(
                conversationId,
                activeMessageId,
                name,
                status,
                ts,
                toolCallId,
              )
              break
            }
            case 'generation_start': {
              const label = typeof event.label === 'string' ? event.label.trim() : ''
              completeActiveThinkingTranscript()
              if (label) {
                store.updateConversationStreamUI(conversationId, (ui) => ({
                  flowTimeline: upsertGenerationInTimeline(
                    ui.flowTimeline,
                    'streaming',
                    label,
                    Date.now(),
                  ),
                }))
                store.pushGenerationStartToOrderedBlocks(conversationId, activeMessageId, {
                  label,
                  timestamp: Date.now(),
                })
              }
              break
            }
            case 'generation_end': {
              const label = typeof event.label === 'string' ? event.label.trim() : ''
              store.updateConversationStreamUI(conversationId, (ui) => ({
                flowTimeline: upsertGenerationInTimeline(
                  ui.flowTimeline,
                  'completed',
                  label || 'Completed',
                  Date.now(),
                ),
              }))
              store.completeGenerationInOrderedBlocks(conversationId, activeMessageId, Date.now())
              break
            }
            case 'ui_block': {
              const block = normalizeUiBlock(event.block)
              if (block) {
                completeActiveThinkingTranscript()
                store.appendUiBlockToOrderedBlocks(conversationId, activeMessageId, block)
              }
              break
            }
            case 'a2a_message': {
              const delegationId = event.delegationId as string | undefined
              if (!delegationId) break
              completeActiveThinkingTranscript()
              const turnData: Record<string, unknown> = {
                from: event.from,
                fromName: event.fromName,
                fromImage: event.fromImage,
                content: event.content ?? '',
                turnIndex: event.turnIndex ?? 0,
                turnType: event.turnType ?? 'message',
                timestamp: event.timestamp ?? Date.now(),
                ...(event.blockData ? { blockData: event.blockData } : {}),
              }
              const blockMeta = event.callerAgent
                ? {
                    callerAgent: event.callerAgent,
                    callerAgentName: event.callerAgentName ?? event.callerAgent,
                    callerAgentImage: event.callerAgentImage,
                    callerAgentRole: event.callerAgentRole ?? '',
                    targetAgent: event.targetAgent,
                    targetAgentName: event.targetAgentName ?? event.targetAgent,
                    targetAgentImage: event.targetAgentImage,
                    targetAgentRole: event.targetAgentRole ?? '',
                    delegationType: event.delegationType ?? 'query',
                    initialPrompt: event.initialPrompt ?? '',
                    ...(Array.isArray(event.participants)
                      ? { participants: event.participants }
                      : {}),
                  }
                : undefined
              if (event.delegationStatus === 'completed' || event.delegationStatus === 'failed') {
                store.completeA2AConversationBlocks(conversationId, activeMessageId)
              } else {
                store.upsertA2AConversationBlock(
                  conversationId,
                  activeMessageId,
                  delegationId,
                  turnData,
                  blockMeta as Record<string, unknown> | undefined,
                )
              }
              break
            }
            case 'thinking_delta': {
              const text = (event.text as string) ?? ''
              if (text) {
                store.upsertThinkingTranscriptInOrderedBlocks(conversationId, activeMessageId, text)
              }
              break
            }
            case 'content_delta': {
              if (event.content) {
                const content = stripEmoji(event.content as string, { preserveFormatting: true })
                completeActiveThinkingTranscript()
                store.updateConversationStreamUI(conversationId, () => ({
                  agentPhase: 'streaming',
                }))
                store.appendToMessage(conversationId, activeMessageId, content)
                store.appendTextToOrderedBlocks(conversationId, activeMessageId, content)
              }
              break
            }
            case 'done': {
              sawDone = true
              const durationMs = event.duration_ms as number | undefined
              if (durationMs != null) {
                const msgs = store.messagesByConversation[conversationId] ?? []
                const assistantMsg = msgs.find((m) => m.id === activeMessageId)
                if (assistantMsg) {
                  store.updateMessage(conversationId, assistantMsg.id, {
                    metadata: { ...assistantMsg.metadata, duration_ms: durationMs },
                  })
                }
              }
              const usage = event.usage as
                | { input_tokens?: number; total_tokens?: number }
                | undefined
              const ctxWindow = event.context_window as number | undefined
              if (usage && ctxWindow && ctxWindow > 0) {
                const inputTokens = usage.input_tokens ?? usage.total_tokens ?? 0
                if (inputTokens > 0) {
                  store.setContextUsage(conversationId, { inputTokens, contextWindow: ctxWindow })
                }
              }
              const contextBreakdown = event.context_breakdown as ContextBreakdown | undefined
              if (contextBreakdown?.version === 1) {
                store.setContextBreakdown(conversationId, contextBreakdown)
              }
              store.clearConversationStreamRun(conversationId)
              break
            }
            case 'error': {
              const failure = resolveChatStreamFailure({
                code: typeof event.code === 'string' ? event.code : null,
                message:
                  typeof event.message === 'string'
                    ? event.message
                    : typeof event.error === 'string'
                      ? event.error
                      : null,
              })
              store.setConversationStreamFailure(conversationId, failure)
              return 'failed'
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (sawDone) {
      const backendMessages = await fetchMessages(conversationId).catch(() => null)
      if (backendMessages) {
        const localMessages = store.messagesByConversation[conversationId] ?? []
        store.setMessages(
          conversationId,
          mergeMessagesPreservingOrderedBlocks(localMessages, backendMessages),
        )
      }
      store.setConversationStreamingMessageId(conversationId, null)
      store.setConversationStreaming(conversationId, false)
      store.setConversationStopping(conversationId, false)
      store.setConversationReconnecting(conversationId, false)
      store.setConversationInterrupted(conversationId, false)
      store.setConversationStreamFailure(conversationId, null)
      store.clearConversationStreamUI(conversationId)
      return 'completed'
    }

    return 'interrupted'
  } finally {
    signal.removeEventListener('abort', abort)
    if (activeControllers.get(conversationId) === controller) {
      activeControllers.delete(conversationId)
    }
    store.setIsStreaming(activeControllers.size > 0)
  }
}

// ============================================================================
// Conversation management
// ============================================================================

export async function fetchSharedConversations(): Promise<Conversation[]> {
  return backendGet<Conversation[]>('/api/conversations/shared-with-me')
}

export async function fetchConversationByAgent(agentId: string): Promise<Conversation | null> {
  const list = await fetchConversations(null, agentId)
  return list[0] ?? null
}

export async function getOrCreateAgentConversation(
  agentId: string,
  title = 'Team Conversation',
): Promise<Conversation> {
  const conversations = await fetchConversations(undefined, agentId)
  if (conversations.length > 0 && conversations[0]) {
    return conversations[0]
  }
  return createNewConversation({ title, agent_id: agentId })
}

export async function createNewConversation(params?: {
  title?: string
  campaign_id?: string
  agent_id?: string
  draft?: boolean
  metadata?: Record<string, unknown>
}): Promise<Conversation> {
  return backendPost<Conversation>('/api/conversations', params ?? {})
}

export async function clearConversationTeamDraft(conversationId: string): Promise<Conversation> {
  if (isPendingConversationId(conversationId)) {
    throw new Error('Cannot clear draft on a pending conversation')
  }
  return backendPatch<Conversation>(`/api/conversations/${conversationId}`, {
    clear_team_draft: true,
  })
}

export async function suggestConversationTitle(userMessage: string): Promise<{ title: string }> {
  return backendPost<{ title: string }>('/api/conversations/suggest-title', {
    user_message: userMessage,
  })
}

export async function forkConversation(
  conversationId: string,
  messageId: string,
): Promise<Conversation> {
  const result = await backendPost<{ conversation: Conversation; messageCount: number }>(
    `/api/conversations/${conversationId}/fork`,
    { message_id: messageId },
  )
  const newConv = result.conversation
  const store = useChatStore.getState()
  store.addConversation(newConv)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('vibey:conversation-forked', { detail: { conversation: newConv } }),
    )
  }
  await selectConversation(newConv.id)
  return newConv
}

export async function updateConversationMetadata(
  id: string,
  metadata: Record<string, unknown>,
): Promise<Conversation> {
  if (isPendingConversationId(id)) {
    throw new Error('Cannot update metadata for a pending conversation')
  }
  return backendPatch<Conversation>(`/api/conversations/${id}`, { metadata })
}

/**
 * Duplicate an entire conversation (copy all messages into a new conversation).
 * Uses the existing fork endpoint with the LAST message id, optionally re-targeting `campaign_id`.
 */
export async function duplicateConversation(
  conversationId: string,
  options?: { campaignId?: string | null; titlePrefix?: string },
): Promise<Conversation> {
  const newConv = await duplicateConversationViaApi(conversationId, options)
  const store = useChatStore.getState()
  store.addConversation(newConv)
  return newConv
}

export async function assignConversationSpace(
  conversationId: string,
  spaceId: string | null,
): Promise<Conversation> {
  if (isPendingConversationId(conversationId)) {
    throw new Error('Cannot assign space to a pending conversation')
  }
  return backendPatch<Conversation>(`/api/conversations/${conversationId}`, {
    metadata: { space_id: spaceId },
  })
}

export async function persistConversationModelPrefs(
  conversationId: string,
  modelId: string,
  modelSettings: ChatModelSettings | null,
): Promise<Conversation | null> {
  if (isPendingConversationId(conversationId)) return null
  const store = useChatStore.getState()
  const existing = store.conversations.find((c) => c.id === conversationId)
  const existingMetadata =
    existing?.metadata && typeof existing.metadata === 'object'
      ? (existing.metadata as Record<string, unknown>)
      : {}
  store.updateConversation(conversationId, {
    default_model_id: modelId,
    ...(modelSettings ? { metadata: { ...existingMetadata, model_settings: modelSettings } } : {}),
  })
  return backendPatch<Conversation>(`/api/conversations/${conversationId}`, {
    default_model_id: modelId,
    ...(modelSettings ? { metadata: { model_settings: modelSettings } } : {}),
  })
}

export async function fetchLlmModels(): Promise<LlmModelOption[]> {
  return backendGet<LlmModelOption[]>('/api/models')
}

/** Newest select wins; older in-flight fetches must not clear loading or overwrite active. */
let selectConversationGeneration = 0

export async function selectConversation(conversationId: string): Promise<void> {
  const generation = ++selectConversationGeneration
  const store = useChatStore.getState()
  store.setWantsNewConversation(false)

  const isCurrent = () => generation === selectConversationGeneration

  // If a stream is active for this conversation, switch immediately (messages are live in store)
  if (isStreamActive(conversationId)) {
    if (!isCurrent()) return
    store.setActiveConversationId(conversationId)
    store.setIsLoadingMessages(false)
    return
  }

  // Stale-stream detection: store thinks this conversation is streaming but no active
  // controller exists. The SSE connection dropped without proper cleanup (e.g. SPA navigation).
  // Clear the stale flags and force a fresh fetch from DB.
  const hasStaleStreamState =
    store.streamingConversationIds.includes(conversationId) && !isStreamActive(conversationId)
  if (hasStaleStreamState) {
    store.setConversationStreamingMessageId(conversationId, null)
    store.setConversationStreaming(conversationId, false)
    store.setConversationStopping(conversationId, false)
    store.setIsStreaming(false)
    store.clearConversationStreamUI(conversationId)
  }

  // Empty `[]` is a valid hydrated meeting thread — do not treat it as a cache miss.
  const hasCachedEntry = Object.prototype.hasOwnProperty.call(
    store.messagesByConversation,
    conversationId,
  )
  if (hasCachedEntry) {
    if (!isCurrent()) return
    store.setActiveConversationId(conversationId)
    store.setIsLoadingMessages(false)
    // Background-revalidate even when the cached entry is `[]` — meeting threads
    // seed an empty cache on link, and trusting it forever leaves real history
    // invisible for the rest of the session. Empty entries revalidate at most
    // once per session so a deleted/empty conversation can't retry-storm.
    const cachedEmpty = (store.messagesByConversation[conversationId] ?? []).length === 0
    if (deadConversationIds.has(conversationId)) return
    if (cachedEmpty) {
      if (emptyRevalidatedConversationIds.has(conversationId)) return
      emptyRevalidatedConversationIds.add(conversationId)
    }
    void (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const msgs = await fetchMessages(conversationId)
          if (!isCurrent() || isStreamActive(conversationId)) return
          const local = useChatStore.getState().messagesByConversation[conversationId] ?? []
          useChatStore
            .getState()
            .setMessages(conversationId, mergeMessagesPreservingOrderedBlocks(local, msgs))
          return
        } catch (error) {
          if (isConversationUnavailableError(error)) {
            deadConversationIds.add(conversationId)
            return
          }
          if (attempt === 0) await new Promise((r) => setTimeout(r, 1000))
        }
      }
    })()
    return
  }

  store.setIsLoadingMessages(true)
  try {
    const msgs = await fetchMessages(conversationId)
    if (!isCurrent()) return
    if (!isStreamActive(conversationId)) {
      const local = useChatStore.getState().messagesByConversation[conversationId] ?? []
      useChatStore
        .getState()
        .setMessages(conversationId, mergeMessagesPreservingOrderedBlocks(local, msgs))
    }
    useChatStore.getState().setActiveConversationId(conversationId)
  } catch (error) {
    // A stale reference (persisted drawer id, old URL) to a deleted conversation
    // must fail quietly ONCE — seeding an empty entry plus the tombstone stops
    // every hydration gate from retrying it forever.
    deadConversationIds.add(conversationId)
    emptyRevalidatedConversationIds.add(conversationId)
    if (isCurrent()) {
      useChatStore.getState().setMessages(conversationId, [])
    }
    if (!isConversationUnavailableError(error)) throw error
  } finally {
    if (isCurrent()) {
      useChatStore.getState().setIsLoadingMessages(false)
    }
  }
}

/** Conversations that 404'd this session — never re-fetch, never retry. */
const deadConversationIds = new Set<string>()
/** Empty cached entries revalidate once per session, not per render pass. */
const emptyRevalidatedConversationIds = new Set<string>()

// ============================================================================
// Message CRUD (via backend API)
// ============================================================================

export async function fetchMessages(
  conversationId: string,
  options?: { limit?: number; before?: string },
): Promise<Message[]> {
  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.before) params.set('before', options.before)
  const query = params.toString()
  return backendGet<Message[]>(
    `/api/conversations/${conversationId}/messages${query ? `?${query}` : ''}`,
  )
}

export type ConversationAssetsScope = 'artifacts' | 'documents' | 'media' | 'links'

export interface ConversationAssetFeedItem {
  id: string
  scope: ConversationAssetsScope
  created_at: string
  conversation_id: string
  conversation_title: string | null
  agent_id: string | null
  message_id?: string
  message_snippet?: string
  url?: string
  title?: string
  media_kind?: 'image' | 'video'
  document?: {
    id: string
    conversation_id: string
    campaign_id: string | null
    document_type: string
    title: string | null
    content: Record<string, unknown>
    created_at: string
    updated_at: string
  }
}

export async function fetchConversationAssets(
  scope: ConversationAssetsScope,
  options?: { agent_id?: string; campaign_id?: string; limit?: number; before?: string },
): Promise<{ items: ConversationAssetFeedItem[]; nextCursor: string | null }> {
  const params = new URLSearchParams()
  params.set('scope', scope)
  if (options?.agent_id) params.set('agent_id', options.agent_id)
  if (options?.campaign_id) params.set('campaign_id', options.campaign_id)
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.before) params.set('before', options.before)
  return backendGet<{ items: ConversationAssetFeedItem[]; nextCursor: string | null }>(
    `/api/conversations/assets?${params.toString()}`,
  )
}

export async function deleteMessagesFrom(conversationId: string, messageId: string): Promise<void> {
  await backendDelete(`/api/conversations/${conversationId}/messages-from/${messageId}`)
}

export async function patchMessageMetadata(
  conversationId: string,
  messageId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await backendPatch(`/api/conversations/${conversationId}/messages/${messageId}`, { metadata })
}

// ============================================================================
// SSE Streaming — Send message and stream response
// ============================================================================

export async function sendMessageStreaming(params: SendMessageParams): Promise<string> {
  const store = useChatStore.getState()
  const showUserMessage = !params.suppressUserMessage
  let resolvedCampaignId = params.campaign_id
  const hasActivePersonalScope = params.scope_kind === 'personal' || params.space_id != null

  // 1. Determine conversation ID — treat pending IDs as "no conversation exists yet"
  const hasRealConversation =
    !!params.conversation_id && !isPendingConversationId(params.conversation_id)
  let conversationId: string = hasRealConversation
    ? (params.conversation_id as string)
    : `pending-${Date.now()}`
  if (showUserMessage) {
    automaticRecoveryTurnIds.delete(conversationId)
  }
  const needsConversation = !hasRealConversation
  if (needsConversation && !resolvedCampaignId && !hasActivePersonalScope) {
    const generalCampaign = await ensureGeneralCampaign()
    resolvedCampaignId = generalCampaign.id
  }

  // Abort any existing stream for this conversation
  abortStream(conversationId)
  const controller = new AbortController()
  activeControllers.set(conversationId, controller)

  // Auto-skip pending clarification blocks when user sends a new message
  if (showUserMessage && hasRealConversation) {
    const messages = store.messagesByConversation[conversationId] ?? []
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue
      const blocks = (msg.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
      let hasChanged = false
      const updatedBlocks = blocks.map((block) => {
        if (
          block.type === 'clarification' &&
          block.status !== 'submitted' &&
          block.status !== 'skipped'
        ) {
          hasChanged = true
          return { ...block, status: 'skipped' }
        }
        return block
      })
      if (hasChanged) {
        store.setOrderedBlocks(conversationId, msg.id, updatedBlocks)
        void patchMessageMetadata(conversationId, msg.id, {
          content_blocks_ordered: updatedBlocks,
        })
      }
    }
  }

  // 2. Create optimistic user message — IMMEDIATELY (before any network call)
  const priorMessages = store.messagesByConversation[conversationId] ?? []
  const isFirstUserTurn =
    showUserMessage && !priorMessages.some((message) => message.role === 'user')
  const userMsgId = showUserMessage ? crypto.randomUUID() : null
  if (showUserMessage && userMsgId) {
    const userMsg: Message = {
      id: userMsgId,
      conversation_id: conversationId,
      role: 'user',
      content: params.content,
      content_blocks: null,
      metadata: {
        ...(params.model ? { model_id: params.model, model: params.model } : {}),
        ...(params.model_settings ? { model_settings: params.model_settings } : {}),
        ...(params.documents ? { documents: params.documents } : {}),
        ...(params.highlighted_artifacts?.length
          ? { highlighted_artifacts: params.highlighted_artifacts }
          : {}),
        ...(params.message_references?.length
          ? { message_references: params.message_references }
          : {}),
        ...(params.ui_selected_artifact
          ? { ui_selected_artifact: params.ui_selected_artifact }
          : {}),
      },
      model_id: params.model ?? null,
      created_at: new Date().toISOString(),
    }
    store.addMessage(conversationId, userMsg)
    const activityAt = new Date().toISOString()
    if (hasRealConversation) {
      store.promoteConversation(conversationId)
      store.updateConversation(conversationId, {
        last_message_at: activityAt,
        updated_at: activityAt,
      })
    }
    // Title from first message immediately — do not wait for stream success
    // (failed/errored sends previously left "New Conversation" → "Untitled").
    if (isFirstUserTurn) {
      const earlyTitle = titleFromFirstUserMessage(params.content, 200)
      const existing = store.conversations.find((c) => c.id === conversationId)
      if (earlyTitle && canApplyFirstMessageTitle(existing)) {
        store.updateConversation(conversationId, {
          title: earlyTitle,
          last_message_at: activityAt,
          updated_at: activityAt,
        })
        if (hasRealConversation) {
          void backendPatch(`/api/conversations/${conversationId}`, { title: earlyTitle })
        }
      }
    }
  }

  // 3. Create optimistic assistant placeholder — IMMEDIATELY
  const tempId = `temp-${Date.now()}`
  const assistantMsg: Message = {
    id: tempId,
    conversation_id: conversationId,
    role: 'assistant',
    content: '',
    content_blocks: null,
    metadata: {},
    created_at: new Date().toISOString(),
  }
  store.addMessage(conversationId, assistantMsg)
  const activateStreamState = (targetConversationId: string) => {
    const initialStatus = pickInitialWorkingStatus()
    abortRecovery(targetConversationId)
    store.setConversationStreamingMessageId(targetConversationId, tempId)
    store.setConversationStreaming(targetConversationId, true)
    store.setConversationReconnecting(targetConversationId, false)
    store.setConversationInterrupted(targetConversationId, false)
    store.setConversationStreamFailure(targetConversationId, null)
    store.setIsStreaming(true)
    store.setInlineError(null)
    const startedAt = Date.now()
    store.touchAgentEvent(targetConversationId, startedAt)
    store.touchStreamActivity(targetConversationId, startedAt)
    store.updateConversationStreamUI(targetConversationId, () => ({
      agentPhase: 'thinking',
      flowTimeline: [],
      agentStatusMessage: initialStatus,
      activeTools: [],
      imageGeneratedEvents: [],
      statusMessages: [],
    }))
  }
  let persistedMessageId = tempId
  let assistantMessageId = tempId

  // Set pending ID as active so messages appear in UI immediately
  if (needsConversation) {
    store.setActiveConversationId(conversationId)
  }

  // Show the normal ROAS "thinking" state immediately after send.
  activateStreamState(conversationId)
  let currentStatusShownAt = Date.now()
  let queuedStatusTimer: ReturnType<typeof setTimeout> | null = null
  const clearQueuedStatus = () => {
    if (queuedStatusTimer) clearTimeout(queuedStatusTimer)
    queuedStatusTimer = null
  }
  const applyStreamStatus = (rawPhase?: string, rawMessage?: string | null) => {
    const mapped = bucketChatStatusMessage({ phase: rawPhase, message: rawMessage })
    const now = Date.now()
    const currentPhase =
      useChatStore.getState().conversationStreamUI[conversationId!]?.agentPhase ?? 'thinking'
    const patch = {
      agentPhase: mapped.phase,
      ...(mapped.message !== null
        ? { agentStatusMessage: mapped.message }
        : mapped.phase === 'executing'
          ? { agentStatusMessage: null }
          : {}),
    }
    const apply = () => {
      clearQueuedStatus()
      currentStatusShownAt = Date.now()
      store.updateConversationStreamUI(conversationId!, () => patch)
    }
    if (
      shouldApplyStatusUpdate({
        currentPhase,
        nextPhase: mapped.phase,
        currentShownAt: currentStatusShownAt,
        now,
      })
    ) {
      apply()
      return
    }
    const delayMs = Math.max(0, CHAT_STATUS_MIN_DISPLAY_MS - (now - currentStatusShownAt))
    clearQueuedStatus()
    queuedStatusTimer = setTimeout(apply, delayMs)
  }

  // 4. Resolve conversation in background — UI already shows messages
  if (needsConversation) {
    try {
      const initialTitle = titleFromFirstUserMessage(params.content, 200)
      const conv = await createNewConversation({
        ...(resolvedCampaignId ? { campaign_id: resolvedCampaignId } : {}),
        agent_id: 'vibey',
        ...(initialTitle ? { title: initialTitle } : {}),
      })
      if (controller.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      const previousConversationId = conversationId
      // Add conversation to store before moving messages so activeConversationId
      // and conversations are always in sync in the same render cycle
      if (!store.conversations.some((c) => c.id === conv.id)) {
        store.addConversation(conv)
      } else if (initialTitle && canApplyFirstMessageTitle(conv)) {
        store.updateConversation(conv.id, {
          title: initialTitle,
          updated_at: new Date().toISOString(),
        })
      }
      // Swap pending → real: moves messages and updates activeConversationId atomically
      store.moveMessages(previousConversationId, conv.id)
      conversationId = conv.id
      if (previousConversationId !== conversationId) {
        activeControllers.delete(previousConversationId)
        const existing = activeControllers.get(conversationId)
        if (existing && existing !== controller) existing.abort()
        activeControllers.set(conversationId, controller)
      }
      if (store.wantsNewConversation) store.setWantsNewConversation(false)
    } catch (err) {
      reportStudioError('conversation_creation_failed', err)
      activeControllers.delete(conversationId)
      store.updateMessage(conversationId, tempId, {
        content: '',
        metadata: { error: 'conversation_creation_failed' },
      })
      store.setConversationStreamingMessageId(conversationId, null)
      store.setConversationStreaming(conversationId, false)
      store.setConversationStopping(conversationId, false)
      store.setIsStreaming(activeControllers.size > 0)
      store.setConversationInterrupted(conversationId, true)
      store.clearConversationStreamUI(conversationId)
      throw err
    }
  }

  let lastSseEventAt = Date.now()
  const touchSse = () => {
    lastSseEventAt = Date.now()
    store.touchAgentEvent(conversationId, lastSseEventAt)
    store.touchStreamActivity(conversationId, lastSseEventAt)
  }
  let sawRealAgentEvent = false
  let streamFinalized = false
  let visibleStreamStateCleared = false
  let pendingMergedMessages: Message[] | null = null
  const completeActiveThinkingTranscript = () => {
    store.completeThinkingTranscriptInOrderedBlocks(conversationId!, assistantMessageId)
  }
  const clearVisibleStreamState = () => {
    if (visibleStreamStateCleared) return
    visibleStreamStateCleared = true
    clearQueuedStatus()
    store.setConversationStreamingMessageId(conversationId!, null)
    store.setConversationStreaming(conversationId!, false)
    store.setConversationStopping(conversationId!, false)
    store.clearConversationStreamUI(conversationId!)
  }
  const finalizeStreamState = () => {
    if (streamFinalized) return
    streamFinalized = true
    clearQueuedStatus()
    if (activeControllers.get(conversationId!) === controller) {
      activeControllers.delete(conversationId!)
    }
    const markAsUnread = store.activeConversationId !== conversationId
    store.finalizeStreamWithMessages(
      conversationId!,
      pendingMergedMessages,
      activeControllers.size > 0,
      markAsUnread,
    )
    pendingMergedMessages = null
  }

  const bodyToSend: Record<string, unknown> = {
    conversation_id: conversationId,
    content: params.content,
    model: params.model,
    model_settings: params.model_settings,
    source: params.source ?? 'studio',
    campaign_id: resolvedCampaignId ?? null,
    space_id: params.space_id ?? null,
    scope_kind: params.scope_kind,
    documents: params.documents,
    highlighted_artifacts: params.highlighted_artifacts,
    message_references: params.message_references,
    ui_selected_artifact: params.ui_selected_artifact,
    ...(params.system_context ? { system_context: params.system_context } : {}),
  }
  if (params.model && !isPendingConversationId(conversationId)) {
    const existingConversation = store.conversations.find((c) => c.id === conversationId)
    const existingMetadata =
      existingConversation?.metadata && typeof existingConversation.metadata === 'object'
        ? (existingConversation.metadata as Record<string, unknown>)
        : {}
    store.updateConversation(conversationId, {
      default_model_id: params.model,
      updated_at: new Date().toISOString(),
      metadata: {
        ...existingMetadata,
        ...(params.model_settings ? { model_settings: params.model_settings } : {}),
      },
    })
  }
  if (params.suppressUserMessage) bodyToSend.hidden = true
  let sawDoneEvent = false
  try {
    if (controller.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    let response = await backendFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify(bodyToSend),
      signal: controller.signal,
      skipClientErrorLog: true,
    })

    for (const delayMs of CHAT_SEND_CONFLICT_RETRY_DELAYS_MS) {
      if (response.status !== 409 || controller.signal.aborted) break
      const shouldRetry = await waitWithAbort(delayMs, controller.signal)
      if (!shouldRetry || controller.signal.aborted) break
      response = await backendFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify(bodyToSend),
        signal: controller.signal,
        skipClientErrorLog: true,
      })
    }

    if (!response.ok) {
      // 402 Payment Required = credits exhausted (only CreditsGuard sends this status)
      if (response.status === 402) {
        throw new Error('__CREDITS_EXHAUSTED__')
      }

      const failure = resolveChatStreamFailure({ code: 'generic' })
      throw new ChatStreamUserError(failure.userMessage, failure.code, failure)
    }

    // Check for low credits warning header
    const creditsLow = response.headers.get('x-credits-low')
    const creditsRemaining = response.headers.get('x-credits-remaining')
    if (creditsLow === 'true' && creditsRemaining) {
      const { useChatStore } = await import('../store/use-chat-store')
      useChatStore.getState().setCreditsLow(true, parseInt(creditsRemaining, 10))
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let finalMessageId: string | null = null
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        store.touchStreamActivity(conversationId!, Date.now())
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!(line.startsWith('data: ') || line.startsWith('data:'))) continue
          const data = line.startsWith('data: ') ? line.slice(6).trim() : line.slice(5).trim()
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data) as Record<string, unknown>
            const type = event.type as string
            touchSse()
            if (type !== 'error') {
              rememberStreamCursor(conversationId!, event, assistantMessageId)
            }
            if (isRealAgentStreamEvent(type)) {
              sawRealAgentEvent = true
            }

            switch (type) {
              // 1. Stream begins — capture message ID
              case 'message_start':
                if (event.message_id) {
                  finalMessageId = event.message_id as string
                  if (finalMessageId !== assistantMessageId) {
                    store.updateMessage(conversationId!, assistantMessageId, { id: finalMessageId })
                    assistantMessageId = finalMessageId
                  }
                  persistedMessageId = finalMessageId
                  store.setConversationStreamingMessageId(conversationId!, finalMessageId)
                }
                break

              case 'context_update': {
                const contextBreakdown = event.context_breakdown as ContextBreakdown | undefined
                if (contextBreakdown?.version === 1) {
                  store.setContextBreakdown(conversationId!, contextBreakdown)
                }
                break
              }

              case 'retrieval_receipt':
              case 'web_source': {
                applySourcePanelEvent(
                  conversationId!,
                  assistantMessageId,
                  event as Record<string, unknown>,
                )
                break
              }

              // 2. Phase change — drives orb animation
              case 'status': {
                const phase = (event.phase as string) ?? 'thinking'
                const message =
                  typeof event.message === 'string' && event.message.trim().length > 0
                    ? (event.message as string).trim()
                    : null
                if (phase === 'compacting') {
                  store.pushSessionCompactionToOrderedBlocks(conversationId!, assistantMessageId, {
                    label: message ?? 'Summarizing our conversation',
                    timestamp: Date.now(),
                  })
                  break
                }
                store.completeSessionCompactionInOrderedBlocks(
                  conversationId!,
                  assistantMessageId,
                  Date.now(),
                )
                const mapped = bucketChatStatusMessage({ phase, message })
                if (mapped.phase !== 'thinking') {
                  store.completeThinkingTranscriptInOrderedBlocks(
                    conversationId!,
                    assistantMessageId,
                  )
                }
                applyStreamStatus(phase, message)
                break
              }

              // 3. Tool call began — add to timeline + ordered blocks
              case 'tool_start': {
                const name = (event.name as string) ?? 'tool'
                const label = stripEmoji((event.label as string) ?? 'Working...')
                const action = event.action as string | undefined
                const toolCallId =
                  typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
                const ts = Date.now()
                completeActiveThinkingTranscript()
                store.updateConversationStreamUI(conversationId!, (ui) => ({
                  agentPhase: 'executing',
                  agentStatusMessage: null,
                  activeTools: [...ui.activeTools, { name, label, toolCallId }],
                  flowTimeline: startToolInTimeline(
                    ui.flowTimeline,
                    name,
                    label,
                    action,
                    ts,
                    toolCallId,
                  ),
                }))
                store.pushToolToOrderedBlocks(conversationId!, assistantMessageId, {
                  name,
                  label,
                  ...(action ? { action } : {}),
                  ...(toolCallId ? { toolCallId } : {}),
                  state: 'active',
                  startedAt: ts,
                })
                break
              }

              case 'tool_update': {
                const name = (event.name as string) ?? 'tool'
                const detail = stripEmoji((event.detail as string) ?? '').trim()
                if (!detail) break
                const toolCallId =
                  typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
                const ts = Date.now()
                store.updateConversationStreamUI(conversationId!, (ui) => ({
                  agentPhase: 'executing',
                  flowTimeline: progressToolInTimeline(
                    ui.flowTimeline,
                    name,
                    detail,
                    ts,
                    toolCallId,
                  ),
                }))
                store.appendToolProgressToOrderedBlocks(
                  conversationId!,
                  assistantMessageId,
                  name,
                  detail,
                  ts,
                  toolCallId,
                )
                break
              }

              case 'tool_content_preview': {
                const name = (event.name as string) ?? ''
                const content = (event.content as string) ?? ''
                const toolCallId =
                  typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
                if (content) {
                  store.setToolContentPreview(
                    conversationId!,
                    assistantMessageId,
                    name,
                    content,
                    toolCallId,
                  )
                }
                break
              }

              // 4. Tool call finished — mark in timeline + ordered blocks
              case 'tool_end': {
                const name = (event.name as string) ?? 'tool'
                const label = stripEmoji((event.label as string) ?? 'Done')
                const status =
                  ((event.status as string) ?? 'completed') === 'completed' ? 'completed' : 'failed'
                const toolCallId =
                  typeof event.tool_call_id === 'string' ? event.tool_call_id : undefined
                const ts = Date.now()
                store.updateConversationStreamUI(conversationId!, (ui) => {
                  const remaining = ui.activeTools.filter((t) =>
                    toolCallId ? t.toolCallId !== toolCallId : t.name !== name,
                  )
                  return {
                    agentPhase: remaining.length > 0 ? 'executing' : 'thinking',
                    agentStatusMessage: remaining.length > 0 ? label : null,
                    activeTools: remaining,
                    statusMessages: [...ui.statusMessages, label],
                    flowTimeline: endToolInTimeline(
                      ui.flowTimeline,
                      name,
                      label,
                      status,
                      ts,
                      toolCallId,
                    ),
                  }
                })
                store.updateToolBlockByName(
                  conversationId!,
                  assistantMessageId,
                  name,
                  status,
                  ts,
                  toolCallId,
                )
                break
              }

              case 'generation_start': {
                const label = typeof event.label === 'string' ? event.label.trim() : ''
                completeActiveThinkingTranscript()
                if (label) {
                  store.updateConversationStreamUI(conversationId!, (ui) => ({
                    flowTimeline: upsertGenerationInTimeline(
                      ui.flowTimeline,
                      'streaming',
                      label,
                      Date.now(),
                    ),
                  }))
                }
                if (label) {
                  store.pushGenerationStartToOrderedBlocks(conversationId!, assistantMessageId, {
                    label,
                    timestamp: Date.now(),
                  })
                }
                break
              }

              case 'generation_end': {
                const label = typeof event.label === 'string' ? event.label.trim() : ''
                store.updateConversationStreamUI(conversationId!, (ui) => ({
                  flowTimeline: upsertGenerationInTimeline(
                    ui.flowTimeline,
                    'completed',
                    label || 'Completed',
                    Date.now(),
                  ),
                }))
                store.completeGenerationInOrderedBlocks(
                  conversationId!,
                  assistantMessageId,
                  Date.now(),
                )
                break
              }

              case 'ui_block': {
                const block = normalizeUiBlock(event.block)
                if (block) {
                  completeActiveThinkingTranscript()
                  store.appendUiBlockToOrderedBlocks(conversationId!, assistantMessageId, block)
                }
                break
              }

              case 'a2a_message': {
                const delegationId = event.delegationId as string | undefined
                if (!delegationId) break
                completeActiveThinkingTranscript()
                const turnData: Record<string, unknown> = {
                  from: event.from,
                  fromName: event.fromName,
                  fromImage: event.fromImage,
                  content: event.content ?? '',
                  turnIndex: event.turnIndex ?? 0,
                  turnType: event.turnType ?? 'message',
                  timestamp: event.timestamp ?? Date.now(),
                  ...(event.blockData ? { blockData: event.blockData } : {}),
                }
                const blockMeta = event.callerAgent
                  ? {
                      callerAgent: event.callerAgent,
                      callerAgentName: event.callerAgentName ?? event.callerAgent,
                      callerAgentImage: event.callerAgentImage,
                      callerAgentRole: event.callerAgentRole ?? '',
                      targetAgent: event.targetAgent,
                      targetAgentName: event.targetAgentName ?? event.targetAgent,
                      targetAgentImage: event.targetAgentImage,
                      targetAgentRole: event.targetAgentRole ?? '',
                      delegationType: event.delegationType ?? 'query',
                      initialPrompt: event.initialPrompt ?? '',
                      ...(Array.isArray(event.participants)
                        ? { participants: event.participants }
                        : {}),
                    }
                  : undefined
                if (event.delegationStatus === 'completed' || event.delegationStatus === 'failed') {
                  store.completeA2AConversationBlocks(conversationId!, assistantMessageId)
                } else {
                  store.upsertA2AConversationBlock(
                    conversationId!,
                    assistantMessageId,
                    delegationId,
                    turnData,
                    blockMeta as Record<string, unknown> | undefined,
                  )
                }
                break
              }

              case 'thinking_delta': {
                const text = (event.text as string) ?? ''
                if (text) {
                  store.upsertThinkingTranscriptInOrderedBlocks(
                    conversationId!,
                    assistantMessageId,
                    text,
                  )
                }
                break
              }

              // 5. Streaming text chunk — append to message + ordered blocks
              case 'content_delta':
                if (event.content) {
                  const content = stripEmoji(event.content as string, {
                    preserveFormatting: true,
                  })
                  completeActiveThinkingTranscript()
                  store.updateConversationStreamUI(conversationId!, () => ({
                    agentPhase: 'streaming',
                  }))
                  store.appendToMessage(conversationId!, assistantMessageId, content)
                  store.appendTextToOrderedBlocks(conversationId!, assistantMessageId, content)
                }
                break

              // 6a. Rate limit notice — show inline card, don't throw
              case 'rate_limit_notice': {
                store.setInlineError({
                  message:
                    (event.message as string) ?? 'Model is rate limited. Try again in a moment.',
                  model: (event.model as string) ?? undefined,
                  reason: (event.reason as 'overloaded' | 'rate_limited') ?? undefined,
                })
                break
              }

              case 'credits_exhausted':
                throw new Error('__CREDITS_EXHAUSTED__')

              // 6. Error
              case 'error': {
                const resolved = resolveChatStreamFailure({
                  code: typeof event.code === 'string' ? event.code : null,
                  message:
                    typeof event.message === 'string'
                      ? event.message
                      : typeof event.error === 'string'
                        ? event.error
                        : null,
                })
                if (resolved.autoRecover) {
                  if (sawRealAgentEvent) throw new Error('__STREAM_INTERRUPTED__')
                  throw new Error('__MACHINE_WARMUP_INTERRUPTED__')
                }
                throw new ChatStreamUserError(resolved.userMessage, resolved.code, resolved)
              }

              // 7. Stream complete — UI unlocks after post-stream merge (see finalizeStreamState at end of try)
              case 'done': {
                sawDoneEvent = true
                const durationMs = event.duration_ms as number | undefined
                if (durationMs != null) {
                  const msgs = store.messagesByConversation[conversationId!] ?? []
                  const assistantMsg = msgs.find((m) => m.id === assistantMessageId)
                  if (assistantMsg) {
                    store.updateMessage(conversationId!, assistantMsg.id, {
                      metadata: { ...assistantMsg.metadata, duration_ms: durationMs },
                    })
                  }
                }
                const usage = event.usage as
                  | { input_tokens?: number; total_tokens?: number }
                  | undefined
                const ctxWindow = event.context_window as number | undefined
                if (usage && ctxWindow && ctxWindow > 0) {
                  const inputTokens = usage.input_tokens ?? usage.total_tokens ?? 0
                  if (inputTokens > 0) {
                    store.setContextUsage(conversationId!, {
                      inputTokens,
                      contextWindow: ctxWindow,
                    })
                  }
                }
                const contextBreakdown = event.context_breakdown as ContextBreakdown | undefined
                if (contextBreakdown?.version === 1) {
                  store.setContextBreakdown(conversationId!, contextBreakdown)
                }
                store.setConversationInterrupted(conversationId!, false)
                store.clearConversationStreamRun(conversationId!)
                clearVisibleStreamState()
                break
              }

              // 8. Credit balance update (arrives after done, before stream closes)
              case 'credit_update': {
                const credits = event.credits as Record<string, unknown> | undefined
                if (credits) {
                  store.setCreditBalance({
                    totalAvailable: (credits.credits_remaining as number) ?? 0,
                    totalUsed: (credits.credits_used as number) ?? 0,
                    baseCredits: 0,
                  })
                }
                break
              }

              case 'file_changed': {
                if (typeof window !== 'undefined' && event.project_id && event.path) {
                  window.dispatchEvent(
                    new CustomEvent('project:file-changed', {
                      detail: {
                        projectId: event.project_id,
                        path: event.path,
                        content: event.content,
                      },
                    }),
                  )
                }
                break
              }

              case 'file_deleted': {
                if (typeof window !== 'undefined' && event.project_id && event.path) {
                  window.dispatchEvent(
                    new CustomEvent('project:file-deleted', {
                      detail: { projectId: event.project_id, path: event.path },
                    }),
                  )
                }
                break
              }
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue
            throw parseErr
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (!sawDoneEvent && !controller.signal.aborted) {
      if (!sawRealAgentEvent) {
        throw new Error('__MACHINE_WARMUP_INTERRUPTED__')
      }
      const streamedMessages = store.messagesByConversation[conversationId!] ?? []
      const streamedAssistant = [...streamedMessages]
        .reverse()
        .find((message) => message.role === 'assistant')
      if (!isAssistantTurnComplete(streamedAssistant, true)) {
        throw new Error('__STREAM_INTERRUPTED__')
      }
      clearVisibleStreamState()
      if (
        streamedAssistant &&
        (streamedAssistant.metadata as Record<string, unknown> | undefined)?.duration_ms == null
      ) {
        store.updateMessage(conversationId!, streamedAssistant.id, {
          metadata: {
            ...(streamedAssistant.metadata ?? {}),
            duration_ms: 1,
          },
        })
      }
    }

    // 5. Ensure any stream that never delivered message_start still binds the final ID.
    if (finalMessageId && finalMessageId !== assistantMessageId) {
      store.updateMessage(conversationId!, assistantMessageId, { id: finalMessageId })
      store.setConversationStreamingMessageId(conversationId!, finalMessageId)
      assistantMessageId = finalMessageId
      persistedMessageId = finalMessageId
    }

    // Reaffirm first-message title after a successful turn (covers any race where
    // create returned before the early title patch landed).
    const allMessages = store.messagesByConversation[conversationId!] ?? []
    if (allMessages.length <= 2) {
      const title = titleFromFirstUserMessage(params.content, 200)
      const current = store.conversations.find((row) => row.id === conversationId)
      if (title && canApplyFirstMessageTitle(current, 'reaffirm')) {
        store.updateConversation(conversationId!, {
          title,
          updated_at: new Date().toISOString(),
        })
        if (!isPendingConversationId(conversationId)) {
          void backendPatch(`/api/conversations/${conversationId}`, { title })
        }
      }
    }
    // Sync store with backend data (replaces optimistic IDs with real ones)
    if (showUserMessage) {
      try {
        const localMessages = store.messagesByConversation[conversationId!] ?? []
        const expectedCanonicalIds = getAssistantOrderedBlockMessageIds(localMessages)
        const backendMessages = await fetchMessages(conversationId!)
        pendingMergedMessages = finalizeStreamEndMessages(localMessages, backendMessages)
        void reconcileCanonicalOrderedBlocks({
          conversationId: conversationId!,
          expectedMessageIds: expectedCanonicalIds,
          signal: controller.signal,
        })
      } catch {
        // Non-critical — store still has the streamed content
      }
    }

    finalizeStreamState()
    finalizeCompletedConversationTurn(conversationId!)
    return conversationId!
  } catch (err) {
    // Don't treat abort as an error
    if (err instanceof DOMException && err.name === 'AbortError') {
      return conversationId!
    }

    if (err instanceof Error && err.message === '__CREDITS_EXHAUSTED__') {
      store.updateMessage(conversationId!, persistedMessageId, {
        content: '',
        metadata: { error: 'credits_exhausted' },
      })
      finalizeStreamState()
      throw err
    }

    if (err instanceof ChatStreamUserError) {
      store.setConversationStreamFailure(conversationId!, err.failure)
      const showFailureBar =
        err.failure.bannerAction === 'reconnect' ||
        (err.failure.showInterruptedBar && sawRealAgentEvent)
      store.setConversationInterrupted(conversationId!, showFailureBar)
      finalizeStreamState()
      if (err.failure.bannerAction === 'reconnect') return conversationId!
      throw err
    }

    if (err instanceof Error && err.message === '__STREAM_INTERRUPTED__') {
      const interrupted = resolveChatStreamFailure({ code: 'stream_interrupted' })
      store.setConversationStreamFailure(conversationId!, interrupted)
      finalizeStreamState()

      const localMessages = store.messagesByConversation[conversationId!] ?? []
      const lastAssistant = [...localMessages]
        .reverse()
        .find((message) => message.role === 'assistant')
      if (isAssistantTurnComplete(lastAssistant, false)) {
        finalizeCompletedConversationTurn(conversationId!)
        return conversationId!
      }

      void recoverConversation(conversationId!)
      return conversationId!
    }

    if (
      err instanceof Error &&
      (err.message === '__MACHINE_WARMUP_INTERRUPTED__' ||
        !shouldMarkConversationInterruptedForStreamError(sawRealAgentEvent))
    ) {
      const interrupted = resolveChatStreamFailure({ code: 'stream_interrupted' })
      store.setConversationStreamFailure(conversationId!, interrupted)
      store.setConversationInterrupted(conversationId!, true)
      finalizeStreamState()
      return conversationId!
    }

    const genericFailure = resolveChatStreamFailure({ code: 'generic' })
    store.setConversationStreamFailure(conversationId!, genericFailure)
    store.setConversationInterrupted(
      conversationId!,
      genericFailure.showInterruptedBar && sawRealAgentEvent,
    )
    reportStudioError('stream_failed', err, { conversationId: conversationId ?? undefined })
    finalizeStreamState()

    throw new ChatStreamUserError(genericFailure.userMessage, genericFailure.code, genericFailure)
  } finally {
    finalizeStreamState()
  }
}
