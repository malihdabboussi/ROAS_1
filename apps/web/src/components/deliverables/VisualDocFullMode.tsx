'use client'

import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { HtmlMiniIframe } from '@/components/ui/HtmlMiniIframe'
import { Tooltip } from '@/components/ui/tooltip'

export function VisualDocFullMode({
  html,
  open,
  onClose,
  closeButtonClassName,
}: {
  html: string | null
  open: boolean
  onClose: () => void
  closeButtonClassName: string
}) {
  if (typeof document === 'undefined' || !open || !html) return null

  return createPortal(
    <div
      className="z-modal-content bg-background fixed inset-0 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Visual doc full mode"
    >
      <div className="px-spacing-4 py-spacing-2 flex shrink-0 items-center justify-end">
        <Tooltip label="Close" side="bottom">
          <span className="inline-flex">
            <button
              type="button"
              className={closeButtonClassName}
              onClick={onClose}
              aria-label="Close full mode"
            >
              <X className="h-3.5 w-3.5 shrink-0" />
            </button>
          </span>
        </Tooltip>
      </div>
      <div className="p-spacing-4 min-h-0 flex-1">
        <div className="surface-card rounded-spacing-4 border-border flex h-full min-h-0 flex-1 flex-col overflow-hidden border">
          <HtmlMiniIframe
            html={html}
            title="Visual doc full screen"
            interactive
            className="bg-background"
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
