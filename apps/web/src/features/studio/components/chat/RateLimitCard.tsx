'use client'

import { useCallback, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { sendMessageStreaming } from '../../services/chat.service'
import { useChatStore } from '../../store/use-chat-store'

export function RateLimitCard() {
  const inlineError = useChatStore((s) => s.inlineError)
  const setInlineError = useChatStore((s) => s.setInlineError)
  const [busy, setBusy] = useState(false)

  const handleTryAgain = useCallback(async () => {
    const store = useChatStore.getState()
    const conversationId = store.activeConversationId
    if (!conversationId) return

    const messages = store.messagesByConversation[conversationId] ?? []
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) return

    setInlineError(null)
    setBusy(true)
    try {
      await sendMessageStreaming({
        conversation_id: conversationId,
        content: lastUserMsg.content ?? '',
        suppressUserMessage: true,
      })
    } catch {
      /* error handled by stream flow */
    } finally {
      setBusy(false)
    }
  }, [setInlineError])

  if (!inlineError) return null

  if (busy) {
    return (
      <div className="mb-2 flex w-full justify-center px-4">
        <div className="card-glass h-spacing-10 gap-spacing-3 px-spacing-4 flex w-full max-w-3xl items-center">
          <RefreshCw className="icon-xs text-muted-foreground shrink-0 animate-spin" />
          <span className="body-3 text-muted-foreground min-w-0 flex-1 truncate">Retrying...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-2 flex w-full justify-center px-4">
      <div className="card-glass h-spacing-10 gap-spacing-3 px-spacing-4 flex w-full max-w-3xl items-center">
        <span className="body-3 text-foreground min-w-0 flex-1 truncate">
          {inlineError.message}
        </span>
        <button
          type="button"
          onClick={() => void handleTryAgain()}
          className="button-glass-primary body-3 gap-spacing-1 h-spacing-8 rounded-spacing-2 px-spacing-3 inline-flex shrink-0 items-center font-medium"
        >
          <RefreshCw size={12} className="shrink-0" />
          Try Again
        </button>
        <button
          type="button"
          onClick={() => setInlineError(null)}
          className="btn-icon-glass btn-icon-glass-sm shrink-0"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
