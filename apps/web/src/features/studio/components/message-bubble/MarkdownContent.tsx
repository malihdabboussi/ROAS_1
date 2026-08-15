'use client'

import { useTypewriter } from '@/lib/hooks/use-typewriter'
import { ChatMarkdownDocument } from '@/components/chat/ChatMarkdownDocument'
import { DraftVersionsCard } from './DraftVersionsCard'
import { hasDraftFence, splitDraftSegments } from './draft-versions.utils'

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
            <ChatMarkdownDocument key={`md-${index}`} markdown={segment.markdown} />
          ),
        )}
      </>
    )
  }

  return <ChatMarkdownDocument markdown={displayText} />
}
