'use client'

import { Mail } from 'lucide-react'
import { ARTIFACT_CHAT_PREVIEW_PANE_PX } from './ArtifactAttachments'

/** DocumentCard-style snippet preview for standalone email artifacts (task activity / channel blocks). */
export function EmailPreviewChatCard({
  title,
  snippet,
  onClick,
}: {
  title: string
  snippet: string
  onClick: () => void
}) {
  return (
    <div className="my-spacing-2 group relative w-full max-w-[400px]">
      <button
        type="button"
        onClick={onClick}
        className="card-glass rounded-spacing-3 hover:bg-hover-subtle w-full cursor-pointer overflow-hidden text-left transition-colors"
      >
        <div
          className="border-border bg-muted/30 px-spacing-4 py-spacing-4 relative overflow-hidden border-b"
          style={{ height: ARTIFACT_CHAT_PREVIEW_PANE_PX }}
        >
          {snippet.trim() ? (
            <p className="body-3 text-muted-foreground h-full min-w-0 overflow-x-hidden overflow-y-auto break-words whitespace-pre-wrap pr-1">
              {snippet}
            </p>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Mail className="icon-lg text-muted-foreground animate-pulse" />
            </div>
          )}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
            style={{
              background: 'linear-gradient(to bottom, transparent, var(--color-card))',
            }}
          />
        </div>
        <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center">
          <Mail className="icon-sm text-muted-foreground shrink-0" />
          <span className="body-3 text-accent min-w-0 truncate font-semibold">{title}</span>
        </div>
      </button>
    </div>
  )
}
