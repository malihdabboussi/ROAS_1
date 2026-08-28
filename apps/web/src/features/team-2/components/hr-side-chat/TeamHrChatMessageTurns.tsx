'use client'

import type { RefObject } from 'react'
import { ChatTurnChangeDivider } from '@/components/chat'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import { StatusIndicator } from '@/components/chat/StatusIndicatorAdapter'
import type { ChatModelSettings, DocumentAttachment } from '@/lib/chat'
import type { Message } from '@/lib/chat/studio-chat-runtime-adapter'
import { cn } from '@/lib/utils/cn'
import type { MessageTurn } from './group-messages-into-turns'

interface TeamHrChatMessageTurnsProps {
  leadingMessages: Message[]
  turns: MessageTurn[]
  streamingMessageId: string | null
  lastUserMessageId: string | null
  pinnedAssistantMessageId: string | null
  selectedConversationId: string | null
  knownSkillKeys: Set<string>
  activeAgentKey: string
  spacerHeight: number
  lastUserPromptHeight: number
  lastUserPromptRef: RefObject<HTMLDivElement | null>
  onEditSubmit: (
    newContent: string,
    documents?: DocumentAttachment[],
    model?: string,
    modelSettings?: ChatModelSettings,
  ) => Promise<void>
}

export function TeamHrChatMessageTurns({
  leadingMessages,
  turns,
  streamingMessageId,
  lastUserMessageId,
  pinnedAssistantMessageId,
  selectedConversationId,
  knownSkillKeys,
  activeAgentKey,
  spacerHeight,
  lastUserPromptHeight,
  lastUserPromptRef,
  onEditSubmit,
}: TeamHrChatMessageTurnsProps) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      {leadingMessages.map((m) => (
        <div key={m.id} data-message-id={m.id}>
          <MessageBubble
            message={m}
            isStreaming={m.id === streamingMessageId}
            isEditable={m.id === lastUserMessageId}
            onEditSubmit={m.id === lastUserMessageId ? onEditSubmit : undefined}
            conversationIdOverride={selectedConversationId}
            knownSkillKeys={knownSkillKeys}
            agentKey={activeAgentKey}
            pinAssistantActions={m.id === pinnedAssistantMessageId}
          />
        </div>
      ))}

      {turns.map((turn, turnIdx) => {
        const isLastTurn = turnIdx === turns.length - 1
        const previousTurn = turns[turnIdx - 1]
        return (
          <div
            key={turn.user.id}
            data-turn-id={turn.user.id}
            className={cn('relative flex flex-col', isLastTurn && 'flex-1')}
          >
            <ChatTurnChangeDivider
              previousUserMessage={previousTurn?.user ?? null}
              userMessage={turn.user}
            />
            <div ref={isLastTurn ? lastUserPromptRef : undefined}>
              <MessageBubble
                message={turn.user}
                isStreaming={false}
                isEditable={turn.user.id === lastUserMessageId}
                onEditSubmit={turn.user.id === lastUserMessageId ? onEditSubmit : undefined}
                conversationIdOverride={selectedConversationId}
                knownSkillKeys={knownSkillKeys}
                agentKey={activeAgentKey}
              />
            </div>

            <div
              className="flex flex-col gap-3"
              style={
                isLastTurn
                  ? {
                      minHeight: Math.max(0, spacerHeight - lastUserPromptHeight),
                    }
                  : undefined
              }
            >
              {turn.responses.map((m) => (
                <div key={m.id} data-message-id={m.id}>
                  <MessageBubble
                    message={m}
                    isStreaming={m.id === streamingMessageId}
                    isEditable={m.id === lastUserMessageId}
                    onEditSubmit={m.id === lastUserMessageId ? onEditSubmit : undefined}
                    conversationIdOverride={selectedConversationId}
                    knownSkillKeys={knownSkillKeys}
                    agentKey={activeAgentKey}
                    pinAssistantActions={m.id === pinnedAssistantMessageId}
                  />
                </div>
              ))}
              {isLastTurn ? (
                <div className="mt-1">
                  <StatusIndicator conversationIdOverride={selectedConversationId} />
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
