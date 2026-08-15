'use client'

import { useEffect, useRef } from 'react'
import { ChatMarkdownDocument } from '@/components/chat/ChatMarkdownDocument'
import { useTypewriter } from '@/lib/hooks/use-typewriter'

interface ToolContentPreviewProps {
  content: string
  isActive: boolean
}

export function ToolContentPreview({ content, isActive }: ToolContentPreviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { displayText } = useTypewriter({ text: content, enabled: isActive })

  useEffect(() => {
    if (!isActive || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  })

  if (!displayText.trim()) return null

  return (
    <div className="card-glass relative my-1.5 min-w-0 overflow-hidden overflow-x-hidden">
      <div
        ref={scrollRef}
        className="max-h-64 min-w-0 overflow-y-auto overflow-x-hidden break-words px-3 py-2"
      >
        <ChatMarkdownDocument markdown={displayText} />
      </div>
      {isActive && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[var(--color-background)] to-transparent" />
      )}
    </div>
  )
}
