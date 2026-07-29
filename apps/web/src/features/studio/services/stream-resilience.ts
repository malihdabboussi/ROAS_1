'use client'

import { backendGet } from '@/lib/api/backend-client'
import { useChatStore } from '../store/use-chat-store'
import type { ChatStatusResponse } from '../types'
import {
  isStreamActive,
  recoverConversation,
  recoverStalledConversation,
  shouldSkipStreamRecovery,
} from './chat.service'

let initialized = false
const activeSilentStatusChecks = new Set<string>()

export const STREAM_STALL_CHECK_INTERVAL_MS = 5_000
export const STREAM_STALL_TIMEOUT_MS = 60_000

async function reconcileHeartbeatOnlyStream(conversationId: string): Promise<void> {
  if (activeSilentStatusChecks.has(conversationId)) return
  activeSilentStatusChecks.add(conversationId)
  try {
    const status = await backendGet<ChatStatusResponse>(`/api/chat/status/${conversationId}`)
    if (
      !status.active ||
      status.failureCode === 'stream_interrupted' ||
      status.failureCode === 'context_window_exceeded'
    ) {
      await recoverStalledConversation(conversationId)
    }
  } catch {
    // A healthy heartbeat-backed stream is safer than aborting on a failed status probe.
  } finally {
    activeSilentStatusChecks.delete(conversationId)
  }
}

export function initStreamResilience(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('online', handleOnline)
  window.setInterval(() => handleStreamStalls(Date.now()), STREAM_STALL_CHECK_INTERVAL_MS)
}

export function handleStreamStalls(now = Date.now()): void {
  const store = useChatStore.getState()

  for (const conversationId of store.streamingConversationIds) {
    if (store.reconnectingConversationIds.includes(conversationId)) continue
    if (!isStreamActive(conversationId)) {
      if (shouldSkipStreamRecovery(conversationId)) {
        useChatStore.getState().setConversationStreaming(conversationId, false)
        continue
      }
      void recoverConversation(conversationId)
      continue
    }

    const lastAgentEventAt = store.lastAgentEventAtByConversation[conversationId] ?? 0
    const lastStreamActivityAt = store.lastStreamActivityAtByConversation[conversationId] ?? 0
    const agentEventsAreStale =
      lastAgentEventAt > 0 && now - lastAgentEventAt >= STREAM_STALL_TIMEOUT_MS
    const streamBytesAreRecent =
      lastStreamActivityAt > 0 && now - lastStreamActivityAt < STREAM_STALL_TIMEOUT_MS
    if (agentEventsAreStale && streamBytesAreRecent) {
      void reconcileHeartbeatOnlyStream(conversationId)
      continue
    }

    const lastActivityAt = Math.max(lastAgentEventAt, lastStreamActivityAt)
    if (lastActivityAt <= 0 || now - lastActivityAt < STREAM_STALL_TIMEOUT_MS) continue

    void recoverStalledConversation(conversationId)
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState !== 'visible') return

  const store = useChatStore.getState()

  for (const conversationId of store.streamingConversationIds) {
    if (!isStreamActive(conversationId)) {
      if (shouldSkipStreamRecovery(conversationId)) {
        useChatStore.getState().setConversationStreaming(conversationId, false)
        continue
      }
      void recoverConversation(conversationId)
    }
  }

  for (const conversationId of store.reconnectingConversationIds) {
    if (!isStreamActive(conversationId)) {
      if (shouldSkipStreamRecovery(conversationId)) continue
      void recoverConversation(conversationId)
    }
  }
}

function handleOnline(): void {
  const store = useChatStore.getState()

  for (const conversationId of store.reconnectingConversationIds) {
    if (shouldSkipStreamRecovery(conversationId)) continue
    void recoverConversation(conversationId)
  }

  for (const conversationId of store.streamingConversationIds) {
    if (!isStreamActive(conversationId)) {
      if (shouldSkipStreamRecovery(conversationId)) {
        store.setConversationStreaming(conversationId, false)
        continue
      }
      void recoverConversation(conversationId)
    }
  }
}
