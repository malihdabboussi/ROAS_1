'use client'

import { useEffect, useRef } from 'react'
import { useTypewriter } from '@/lib/hooks/use-typewriter'
import { renderChatMarkdown } from '@/lib/utils/chat-markdown.utils'
import { ChatMarkdownView } from '@/features/studio/components/chat/ChatMarkdownView'

interface ToolContentPreviewProps {
  content: string
  isActive: boolean
}

export function ToolContentPreview({ content, isActive }: ToolContentPreviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { displayText } = useTypewriter({ text: content, enabled: isActive })
  const html = renderChatMarkdown(displayText)

  useEffect(() => {
    if (!isActive || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  })

  if (!displayText.trim()) return null

  return (
    <div className="card-glass relative my-1.5 min-w-0 overflow-x-hidden overflow-hidden">
      <div ref={scrollRef} className="max-h-64 min-w-0 overflow-x-hidden overflow-y-auto px-3 py-2 break-words">
        <ChatMarkdownView html={html} />
      </div>
      {isActive && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
      )}
    </div>
  )
}
