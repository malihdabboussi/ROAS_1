'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { CHAT_CODE_ARTIFACT_MESSAGES } from './chat-code-artifact.messages.config'

export function ChatCodeArtifactCopyMenu({
  onCopy,
  onDownload,
  downloadLabel,
}: {
  onCopy: () => void | Promise<void>
  onDownload: () => void
  downloadLabel: string
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={menuRef} className="relative shrink-0">
      <div className="border-border flex h-7 overflow-hidden rounded-lg border">
        <button
          type="button"
          onClick={() => void onCopy()}
          className="body-4 text-foreground hover:bg-hover-subtle px-spacing-2"
        >
          {CHAT_CODE_ARTIFACT_MESSAGES.COPY.message}
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="text-muted-foreground hover:bg-hover-subtle border-border px-spacing-1 border-l"
          aria-label={CHAT_CODE_ARTIFACT_MESSAGES.TOOLTIP_MORE_ACTIONS.message}
          aria-expanded={open}
        >
          <ChevronDown className="icon-xs" aria-hidden />
        </button>
      </div>
      {open ? (
        <div className="dropdown-menu-solid p-spacing-2 z-dropdown absolute right-0 top-8 min-w-44">
          <button
            type="button"
            onClick={() => {
              onDownload()
              setOpen(false)
            }}
            className="px-spacing-2 py-spacing-1 body-3 text-foreground hover:bg-hover-subtle rounded-spacing-2 flex w-full items-center text-left"
          >
            {downloadLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
