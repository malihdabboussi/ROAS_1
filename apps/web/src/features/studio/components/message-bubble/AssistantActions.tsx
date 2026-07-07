'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { AgentTurnFeedbackActions } from '@/components/chat/AgentTurnFeedbackActions'
import { cn } from '@/lib/utils/cn'
import { forkConversation } from '../../services/chat.service'

export function AssistantActions({
  content,
  isStreaming,
  messageId,
  conversationId,
  allowFork = true,
  inlineAction,
  pinActions = false,
}: {
  content: string
  isStreaming?: boolean
  messageId?: string
  conversationId?: string
  allowFork?: boolean
  /** Optional icon button rendered to the left of the 3-dot menu in the same row. */
  inlineAction?: React.ReactNode
  pinActions?: boolean
}) {
  const [forking, setForking] = useState(false)

  const handleFork = useCallback(async () => {
    if (!conversationId || !messageId || conversationId.startsWith('pending-')) return
    setForking(true)
    try {
      const newConv = await forkConversation(conversationId, messageId)
      toast.success(`Forked to "${newConv.title}"`)
    } catch {
      toast.error('Failed to fork conversation')
    } finally {
      setForking(false)
    }
  }, [conversationId, messageId])

  if (isStreaming || !content?.trim()) return null

  const canFork =
    allowFork && !!conversationId && !!messageId && !conversationId.startsWith('pending-')

  return (
    <div
      className={cn(
        'py-spacing-4 flex w-full justify-end transition-opacity duration-200 ease-out',
        pinActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
      )}
    >
      <div className="gap-spacing-1 flex shrink-0 items-center">
        {inlineAction}
        <AgentTurnFeedbackActions
          targetKind="conversation_message"
          targetId={messageId ?? ''}
          sourceSurface="assistant_message"
          content={content}
          canFork={canFork}
          onFork={canFork ? handleFork : undefined}
          forking={forking}
          className="py-0"
        />
      </div>
    </div>
  )
}
