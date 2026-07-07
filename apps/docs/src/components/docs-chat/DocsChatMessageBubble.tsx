'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type DocsChatTurn = { role: 'user' | 'assistant'; content: string }

export function DocsChatMessageBubble({ turn }: { turn: DocsChatTurn }) {
  if (turn.role === 'user') {
    return (
      <div className="docs-chat-user-bubble text-[14px]" style={{ color: 'var(--foreground)' }}>
        {turn.content}
      </div>
    )
  }

  return (
    <div className="prose-docs prose-sm max-w-none text-[14px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.content || '…'}</ReactMarkdown>
    </div>
  )
}
