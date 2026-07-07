import type { ChatRenderMessage } from '@/lib/chat/chat-render-message'
import { buildChatTurnChangeDividerItems } from '@/lib/chat/chat-turn-change-divider'

interface ChatTurnChangeDividerProps {
  previousUserMessage?: ChatRenderMessage | null
  userMessage: ChatRenderMessage
  modelOptions?: ReadonlyArray<{ id: string; label: string }>
}

export function ChatTurnChangeDivider({
  previousUserMessage,
  userMessage,
  modelOptions,
}: ChatTurnChangeDividerProps) {
  const items = buildChatTurnChangeDividerItems({
    previousUserMessage,
    userMessage,
    modelOptions,
  })

  if (items.length === 0) return null

  return (
    <div
      className="py-spacing-1 mb-spacing-2 gap-spacing-3 flex items-center"
      aria-label="Conversation change"
    >
      <div className="border-border min-w-0 flex-1 border-t" aria-hidden />
      <div className="gap-spacing-1 flex min-w-0 flex-wrap justify-center">
        {items.map((item) => (
          <span
            key={`${item.kind}:${item.label}`}
            className="typo-caption text-muted-foreground border-border bg-card rounded-spacing-2 px-spacing-3 py-spacing-1 border"
          >
            {item.label}
          </span>
        ))}
      </div>
      <div className="border-border min-w-0 flex-1 border-t" aria-hidden />
    </div>
  )
}
