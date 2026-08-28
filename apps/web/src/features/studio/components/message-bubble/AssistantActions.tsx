'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { AgentTurnFeedbackActions } from '@/components/chat/AgentTurnFeedbackActions'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { cn } from '@/lib/utils/cn'
import { forkConversation } from '../../services/chat.service'
import { useChatStore } from '../../store/use-chat-store'

export function AssistantActions({
  content,
  isStreaming,
  messageId,
  conversationId,
  allowFork = true,
  inlineAction,
}: {
  content: string
  isStreaming?: boolean
  messageId?: string
  conversationId?: string
  allowFork?: boolean
  /** Optional icon button rendered to the left of the 3-dot menu in the same row. */
  inlineAction?: React.ReactNode
  /** Retained for caller compatibility; actions are always scoped to exact-message hover. */
  pinActions?: boolean
}) {
  const router = useRouter()
  const [forking, setForking] = useState(false)

  const handleReply = useCallback(() => {
    if (!conversationId || !messageId) return
    const excerpt = content.replace(/\s+/g, ' ').trim().slice(0, 160)
    const globalWorkContext = useGlobalChatStore.getState().workContext
    const conversation = useChatStore
      .getState()
      .conversations.find((candidate) => candidate.id === conversationId)
    const conversationSpaceId = conversation?.metadata?.space_id
    const workContext =
      typeof conversationSpaceId === 'string' && conversationSpaceId.length > 0
        ? {
            surface: 'spaces' as const,
            spaceId: conversationSpaceId,
            campaignId: conversation?.campaign_id ?? null,
          }
        : globalWorkContext
    useGlobalChatStore.getState().seedComposer({
      content: '',
      conversationId,
      seedMode: 'attach',
      workContext,
      references: [
        {
          kind: 'conversation',
          id: conversationId,
          type: `message:${messageId}`,
          label: `Reply to assistant: ${excerpt}`,
        },
      ],
    })
  }, [content, conversationId, messageId])

  const handleFork = useCallback(async () => {
    if (!conversationId || !messageId || conversationId.startsWith('pending-')) return
    setForking(true)
    try {
      const newConv = await forkConversation(conversationId, messageId)
      router.push(`/home?conv=${encodeURIComponent(newConv.id)}`)
      toast.success(`Forked to "${newConv.title}"`)
    } catch {
      toast.error('Failed to fork conversation')
    } finally {
      setForking(false)
    }
  }, [conversationId, messageId, router])

  if (isStreaming || !content?.trim()) return null

  const canFork =
    allowFork && !!conversationId && !!messageId && !conversationId.startsWith('pending-')

  return (
    <div
      className={cn(
        'py-spacing-4 flex w-full justify-end transition-opacity duration-200 ease-out',
        'opacity-0 group-hover/message:opacity-100',
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
          showFeedback={false}
          onReply={messageId && conversationId ? handleReply : undefined}
          className="py-0"
        />
      </div>
    </div>
  )
}
