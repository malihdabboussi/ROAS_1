'use client'

import { splitChatCodeArtifactSegments } from '@/lib/chat/chat-code-artifact'
import { renderChatMarkdown, splitChatMarkdownSegments } from '@/lib/utils/chat-markdown.utils'
import { MermaidDiagram } from '@/components/ui/mermaid-diagram'
import { ChatCodeArtifactCard } from './ChatCodeArtifactCard'
import { ChatMarkdownView } from './ChatMarkdownView'

export function ChatMarkdownDocument({
  markdown,
  className,
}: {
  markdown: string
  className?: string
}) {
  const segments = splitChatMarkdownSegments(markdown).flatMap((segment) =>
    segment.kind === 'mermaid' ? [segment] : splitChatCodeArtifactSegments(segment.text),
  )

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === 'mermaid') {
          return (
            <MermaidDiagram
              key={`mermaid-${index}`}
              code={segment.code}
              pending={segment.incomplete}
            />
          )
        }
        if (segment.kind === 'code') {
          return (
            <ChatCodeArtifactCard
              key={`code-${index}`}
              title={segment.title}
              language={segment.language}
              code={segment.code}
            />
          )
        }
        return (
          <ChatMarkdownView
            key={`md-${index}`}
            html={renderChatMarkdown(segment.text)}
            className={className}
            hydrateMermaid={false}
          />
        )
      })}
    </>
  )
}
