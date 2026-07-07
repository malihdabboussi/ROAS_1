'use client'

import { useEffect, useRef } from 'react'
import { useTypewriter } from '@/lib/hooks/use-typewriter'
import { renderChatMarkdown } from '@/lib/utils/chat-markdown.utils'
import { ChatMarkdownView } from '@/features/studio/components/chat/ChatMarkdownView'

export function MarkdownContent({
  content,
  streaming = false,
}: {
  content: string
  streaming?: boolean
}) {
  const { displayText } = useTypewriter({
    text: content,
    enabled: streaming,
  })
  const html = renderChatMarkdown(displayText)
  const containerRef = useRef<HTMLDivElement>(null)
  const mermaidPreloaded = useRef(false)

  useEffect(() => {
    if (mermaidPreloaded.current) return
    if (!html.includes('mermaid-placeholder')) return
    mermaidPreloaded.current = true
    void import('@/components/ui/mermaid-diagram').then(({ preloadMermaid }) => preloadMermaid())
  }, [html])

  return (
    <div className="relative">
      <ChatMarkdownView
        html={html}
        containerRef={containerRef}
        hydrateMermaid={!streaming}
      />
    </div>
  )
}
