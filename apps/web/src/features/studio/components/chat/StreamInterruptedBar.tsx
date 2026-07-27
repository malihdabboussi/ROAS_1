'use client'

import { useCallback, useMemo, useState } from 'react'
import { PlugZap, RefreshCw, X } from 'lucide-react'
import { startOpenAICodexOAuth } from '@/lib/integrations/openai-codex-oauth'
import { CHAT_STREAM_ERRORS } from '../../config/chat-stream-errors.config'
import { recoverConversation } from '../../services/chat.service'
import { useChatStore } from '../../store/use-chat-store'

export function StreamInterruptedBar({ conversationId }: { conversationId: string | null }) {
  const interruptedIds = useChatStore((s) => s.interruptedConversationIds)
  const streamingIds = useChatStore((s) => s.streamingConversationIds)

  const rows = useMemo(() => {
    if (!conversationId) return []
    const isInterrupted = interruptedIds.includes(conversationId)
    const isStreaming = streamingIds.includes(conversationId)
    return isInterrupted && !isStreaming ? [conversationId] : []
  }, [interruptedIds, streamingIds, conversationId])

  if (rows.length === 0) return null

  return (
    <div className="gap-spacing-2 mb-2 flex w-full flex-col items-center px-4">
      {rows.map((conversationId) => (
        <InterruptedConversationRow key={conversationId} conversationId={conversationId} />
      ))}
    </div>
  )
}

function InterruptedConversationRow({ conversationId }: { conversationId: string }) {
  const isReconnecting = useChatStore((s) => s.reconnectingConversationIds.includes(conversationId))
  const streamFailure = useChatStore((s) => s.streamFailureByConversation[conversationId])
  const [busy, setBusy] = useState(false)
  const isReconnectRequired = streamFailure?.bannerAction === 'reconnect'

  const handleDismiss = () => {
    const store = useChatStore.getState()
    store.setConversationInterrupted(conversationId, false)
    store.setConversationStreamFailure(conversationId, null)
  }

  const stopInterruptedFlow = useCallback(() => {
    const store = useChatStore.getState()
    store.setConversationReconnecting(conversationId, false)
    store.setConversationStreaming(conversationId, false)
    store.setConversationStreamingMessageId(conversationId, null)
    store.setConversationInterrupted(conversationId, false)
    store.setConversationStreamFailure(conversationId, null)
    store.clearConversationStreamRun(conversationId)
    store.clearConversationStreamUI(conversationId)
  }, [conversationId])

  const handleResume = useCallback(async () => {
    setBusy(true)
    try {
      await recoverConversation(conversationId)
      const store = useChatStore.getState()
      const stillInterrupted = store.interruptedConversationIds.includes(conversationId)
      const stillStreaming = store.streamingConversationIds.includes(conversationId)
      const stillReconnecting = store.reconnectingConversationIds.includes(conversationId)
      const failure = store.streamFailureByConversation[conversationId]
      if (
        stillInterrupted &&
        !stillStreaming &&
        !stillReconnecting &&
        failure?.code !== 'context_window_exceeded'
      ) {
        stopInterruptedFlow()
      }
    } catch {
      const failure = useChatStore.getState().streamFailureByConversation[conversationId]
      if (failure?.code !== 'context_window_exceeded') {
        stopInterruptedFlow()
      }
    } finally {
      setBusy(false)
    }
  }, [conversationId, stopInterruptedFlow])

  const handlePrimaryAction = useCallback(async () => {
    if (isReconnectRequired) {
      setBusy(true)
      try {
        if (streamFailure?.reconnectProvider === 'openai_codex') {
          await startOpenAICodexOAuth()
        }
      } finally {
        setBusy(false)
      }
      return
    }
    await handleResume()
  }, [handleResume, isReconnectRequired, streamFailure?.reconnectProvider])

  if (!isReconnectRequired && (isReconnecting || busy)) {
    return (
      <div className="flex w-full justify-center">
        <div className="card-glass h-spacing-10 gap-spacing-3 px-spacing-4 flex w-full max-w-3xl items-center">
          <RefreshCw className="icon-xs text-muted-foreground shrink-0 animate-spin" />
          <span className="body-3 text-muted-foreground min-w-0 flex-1 truncate">Resuming...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full justify-center">
      <div className="card-glass h-spacing-10 gap-spacing-3 px-spacing-4 flex w-full max-w-3xl items-center">
        <span className="body-3 text-foreground min-w-0 flex-1 truncate">
          {streamFailure?.userMessage ?? CHAT_STREAM_ERRORS.stream_interrupted.userMessage}
        </span>
        <button
          type="button"
          onClick={() => void handlePrimaryAction()}
          disabled={busy}
          className={
            isReconnectRequired
              ? 'button-compact button-glass-primary shrink-0'
              : 'button-glass-primary body-3 gap-spacing-1 h-spacing-8 rounded-spacing-2 px-spacing-3 inline-flex shrink-0 items-center font-medium'
          }
        >
          {isReconnectRequired && busy ? (
            <RefreshCw className="icon-xs shrink-0 animate-spin" />
          ) : isReconnectRequired ? (
            <PlugZap className="icon-xs shrink-0" />
          ) : (
            <RefreshCw className="icon-xs shrink-0" />
          )}
          {isReconnectRequired ? (busy ? 'Connecting...' : 'Reconnect') : 'Resume'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="btn-icon-bare shrink-0"
          aria-label="Dismiss"
        >
          <X className="icon-xs" />
        </button>
      </div>
    </div>
  )
}
