import type { RefObject } from 'react'
import { ArrowDown } from 'lucide-react'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import type { LiveSessionState } from '@/lib/brain/brain-live-session-adapter'
import type { AgentVoiceTurnData } from './agent-voice-mode-utils'

interface AgentVoiceTranscriptProps {
  scrollRef: RefObject<HTMLDivElement | null>
  lastUserPromptRef: RefObject<HTMLDivElement | null>
  turnData: AgentVoiceTurnData
  state: LiveSessionState
  conversationId: string | null
  spacerHeight: number
  lastUserPromptHeight: number
  userHasScrolledUp: boolean
  visibleMessageCount: number
  onScroll: () => void
  onScrollToBottom: () => void
}

export function AgentVoiceTranscript({
  scrollRef,
  lastUserPromptRef,
  turnData,
  state,
  conversationId,
  spacerHeight,
  lastUserPromptHeight,
  userHasScrolledUp,
  visibleMessageCount,
  onScroll,
  onScrollToBottom,
}: AgentVoiceTranscriptProps) {
  return (
    <div className="relative flex-1 overflow-hidden">
      <div className="from-background pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b to-transparent" />
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto overflow-x-hidden px-4 md:px-8"
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
          <div className="flex flex-1 flex-col gap-3 py-4">
            {turnData.leadingMessages.map((message) => (
              <div key={message.id} data-message-id={message.id}>
                <MessageBubble
                  message={message}
                  isStreaming={isVoiceAssistantStreaming(message.id, state)}
                  isEditable={false}
                  conversationIdOverride={conversationId}
                />
              </div>
            ))}

            {turnData.turns.map((turn, turnIndex) => {
              const isLastTurn = turnIndex === turnData.turns.length - 1
              return (
                <div
                  key={turn.user.id}
                  data-turn-id={turn.user.id}
                  className={`relative flex flex-col ${isLastTurn ? 'flex-1' : ''}`}
                >
                  <div ref={isLastTurn ? lastUserPromptRef : undefined} className="sticky top-0 z-10">
                    <div className="surface-bg">
                      <MessageBubble
                        message={turn.user}
                        isStreaming={false}
                        stickyUser
                        isEditable={false}
                        conversationIdOverride={conversationId}
                      />
                    </div>
                    <div className="from-background pointer-events-none h-6 bg-gradient-to-b to-transparent" />
                  </div>

                  <div
                    className="flex flex-col gap-3"
                    style={
                      isLastTurn
                        ? { minHeight: Math.max(0, spacerHeight - lastUserPromptHeight) }
                        : undefined
                    }
                  >
                    {turn.responses.map((message) => (
                      <div key={message.id} data-message-id={message.id}>
                        <MessageBubble
                          message={message}
                          isStreaming={isVoiceAssistantStreaming(message.id, state)}
                          isEditable={false}
                          conversationIdOverride={conversationId}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {userHasScrolledUp && visibleMessageCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center">
          <button
            type="button"
            onClick={onScrollToBottom}
            className="btn-icon-glass pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full"
            aria-label="Scroll to latest messages"
            title="Scroll to latest"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

function isVoiceAssistantStreaming(messageId: string, state: LiveSessionState): boolean {
  return messageId.startsWith('voice-assistant-') && state !== 'idle' && state !== 'error'
}
