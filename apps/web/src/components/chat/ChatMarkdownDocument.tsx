'use client'

import { renderChatMarkdown, splitChatMarkdownSegments } from '@/lib/utils/chat-markdown.utils'
import { MermaidDiagram } from '@/components/ui/mermaid-diagram'
import { ChatMarkdownView } from './ChatMarkdownView'

export function ChatMarkdownDocument({
  markdown,
  className,
}: {
  markdown: string
  className?: string
}) {
  const segments = splitChatMarkdownSegments(markdown)

  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === 'mermaid' ? (
          <MermaidDiagram
            key={`mermaid-${index}`}
            code={segment.code}
            pending={segment.incomplete}
          />
        ) : (
          <ChatMarkdownView
            key={`md-${index}`}
            html={renderChatMarkdown(segment.text)}
            className={className}
            hydrateMermaid={false}
          />
        ),
      )}
    </>
  )
}
