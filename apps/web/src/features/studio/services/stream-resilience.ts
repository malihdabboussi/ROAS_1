'use client'

import { useChatStore } from '../store/use-chat-store'
import {
  isStreamActive,
  recoverConversation,
  recoverStalledConversation,
  shouldSkipStreamRecovery,
} from './chat.service'

let initialized = false

export const STREAM_STALL_CHECK_INTERVAL_MS = 5_000
export const STREAM_STALL_TIMEOUT_MS = 60_000

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
    // SSE comment heartbeats (`: heartbeat`) update stream byte activity but not agent events.
    // Use the latest of both so long gateway-prep windows do not false-trigger recovery.
    const lastActivityAt = Math.max(lastAgentEventAt, lastStreamActivityAt)
    if (lastActivityAt <= 0) continue
    if (now - lastActivityAt < STREAM_STALL_TIMEOUT_MS) continue

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
