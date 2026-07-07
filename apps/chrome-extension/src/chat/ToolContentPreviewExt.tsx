import { useEffect, useRef } from 'react'
import { CHAT_MARKDOWN_CLASSNAME, renderChatMarkdown } from './markdown'
import { useTypewriter } from './use-typewriter'

interface Props {
  content: string
  isActive: boolean
}

export function ToolContentPreviewExt({ content, isActive }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { displayText } = useTypewriter({ text: content, enabled: isActive })
  const html = renderChatMarkdown(displayText)

  useEffect(() => {
    if (!isActive || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  })

  if (!displayText.trim()) return null

  return (
    <div className="card-glass overflow-hidden" style={{ position: 'relative', margin: '6px 0' }}>
      <div
        ref={scrollRef}
        className="overflow-y-auto px-spacing-3 py-spacing-2"
        style={{ maxHeight: '16rem' }}
      >
        <div className={CHAT_MARKDOWN_CLASSNAME} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {isActive && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6"
          style={{
            background: 'linear-gradient(to top, var(--color-background), transparent)',
          }}
        />
      )}
    </div>
  )
}
