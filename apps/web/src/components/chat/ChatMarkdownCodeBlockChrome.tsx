'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, ScrollText, WrapText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

export function ChatMarkdownCodeBlockChrome({ blockEl }: { blockEl: HTMLElement }) {
  const [wrapped, setWrapped] = useState(true)

  useEffect(() => {
    blockEl.classList.toggle('chat-markdown-code-block--wrap', wrapped)
    blockEl.classList.toggle('chat-markdown-code-block--scroll', !wrapped)
  }, [blockEl, wrapped])

  const codeText = blockEl.querySelector('code')?.textContent ?? ''

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(codeText).then(() => toast.success('Copied'))
  }, [codeText])

  const handleToggleWrap = useCallback(() => {
    setWrapped((value) => !value)
  }, [])

  return createPortal(
    <>
      <div className="chat-markdown-code-block__shadow" aria-hidden />
      <div className="chat-markdown-code-block__toolbar">
        <button
          type="button"
          className="btn-icon-glass btn-icon-glass-sm chat-markdown-code-block__btn"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          <Copy className="icon-sm" />
        </button>
        <button
          type="button"
          className={cn(
            'btn-icon-glass btn-icon-glass-sm chat-markdown-code-block__btn',
            wrapped && 'btn-icon-glass--active',
          )}
          onClick={handleToggleWrap}
          aria-label={wrapped ? 'Enable horizontal scroll' : 'Wrap text'}
        >
          {wrapped ? <ScrollText className="icon-sm" /> : <WrapText className="icon-sm" />}
        </button>
      </div>
    </>,
    blockEl,
  )
}
