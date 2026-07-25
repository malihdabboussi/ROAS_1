'use client'

import { createPortal } from 'react-dom'
import { Check, Copy, ExternalLink, Globe } from 'lucide-react'

interface FunnelPublishMenuProps {
  open: boolean
  position: { top: number; left: number }
  publishing: boolean
  liveUrl: string | null
  copied: boolean
  onPublish: () => void
  onCopyUrl: () => Promise<void>
  onClose: () => void
  onConnectDomain: () => void
  onUnpublish: () => void
}

export function FunnelPublishMenu({
  open,
  position,
  publishing,
  liveUrl,
  copied,
  onPublish,
  onCopyUrl,
  onClose,
  onConnectDomain,
  onUnpublish,
}: FunnelPublishMenuProps) {
  if (!open) return null

  return createPortal(
    <div
      data-publish-dropdown
      className="surface-card border-border z-dropdown w-spacing-80 rounded-spacing-3 p-spacing-2 fixed border shadow-lg"
      style={position}
    >
      <button
        type="button"
        onClick={() => {
          onPublish()
          onClose()
        }}
        disabled={publishing}
        className="body-3 text-foreground hover:bg-secondary gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
      >
        <Globe className="icon-sm" />
        <span>Publish updates</span>
      </button>
      {liveUrl ? (
        <div className="px-spacing-3 py-spacing-2">
          <div className="gap-spacing-1.5 flex items-center">
            <input
              readOnly
              value={liveUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 body-2 text-foreground w-full border outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                await onCopyUrl()
                setTimeout(onClose, 800)
              }}
              data-tooltip="Copy"
              data-side="bottom"
              className="tooltip rounded-spacing-2 text-muted-foreground hover:text-foreground p-spacing-2 shrink-0 transition-colors"
            >
              {copied ? <Check className="icon-sm text-success" /> : <Copy className="icon-sm" />}
            </button>
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              data-tooltip="Open"
              data-side="bottom"
              className="tooltip rounded-spacing-2 text-muted-foreground hover:text-foreground p-spacing-2 shrink-0 transition-colors"
            >
              <ExternalLink className="icon-sm" />
            </a>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onConnectDomain}
        disabled={publishing}
        className="body-3 text-foreground hover:bg-secondary gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
      >
        <Globe className="icon-sm" />
        <span>Connect custom domain</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onUnpublish()
          onClose()
        }}
        disabled={publishing}
        className="body-3 text-destructive hover:bg-secondary gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
      >
        <Globe className="icon-sm" />
        <span>Unpublish</span>
      </button>
    </div>,
    document.body,
  )
}
