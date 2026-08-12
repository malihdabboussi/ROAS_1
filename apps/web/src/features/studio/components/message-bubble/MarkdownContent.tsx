'use client'

import { useEffect, useRef } from 'react'
import { useTypewriter } from '@/lib/hooks/use-typewriter'
import { renderChatMarkdown } from '@/lib/utils/chat-markdown.utils'
import { ChatMarkdownView } from '@/features/studio/components/chat/ChatMarkdownView'
import { DraftVersionsCard } from './DraftVersionsCard'
import { hasDraftFence, splitDraftSegments } from './draft-versions.utils'

function MarkdownHtml({ markdown, streaming }: { markdown: string; streaming: boolean }) {
  const html = renderChatMarkdown(markdown)
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

  // ```draft fences render as an editable versioned card; hold off while the
  // message is still streaming so a half-open fence doesn't flicker.
  if (!streaming && hasDraftFence(displayText)) {
    const segments = splitDraftSegments(displayText)
    return (
      <>
        {segments.map((segment, index) =>
          segment.kind === 'draft' ? (
            <DraftVersionsCard key={`draft-${index}`} versions={segment.versions} />
          ) : (
            <MarkdownHtml key={`md-${index}`} markdown={segment.markdown} streaming={streaming} />
          ),
        )}
      </>
    )
  }

  return <MarkdownHtml markdown={displayText} streaming={streaming} />
}
