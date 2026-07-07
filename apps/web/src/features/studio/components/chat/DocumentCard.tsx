'use client'

import { usePathname } from 'next/navigation'
import type { MouseEvent } from 'react'
import { Download, FileText } from 'lucide-react'
import { useCampaignModeOptional } from '../../contexts/CampaignModeContext'
import { ARTIFACT_CHAT_PREVIEW_PANE_PX } from './ArtifactAttachments'

interface DocumentCardProps {
  title: string
  documentId: string
  spaceId?: string
  spaceItemId?: string
  snippet: string
  /** When set (e.g. channel chat), skips campaign media panel */
  onOpenOverride?: () => void
  /** Renders a download control on row hover (caller runs fetch + save). */
  onDownloadClick?: (e: MouseEvent<HTMLButtonElement>) => void
}

export function DocumentCard({
  title,
  documentId,
  spaceId,
  spaceItemId,
  snippet,
  onOpenOverride,
  onDownloadClick,
}: DocumentCardProps) {
  const pathname = usePathname()
  const inSpacesUi = (pathname ?? '').startsWith('/spaces')
  const campaignMode = useCampaignModeOptional()

  return (
    <div className="my-spacing-2 group relative w-full max-w-[400px]">
      <button
        type="button"
        onClick={() => {
          // #region debug-log - H4: document card click branch
          fetch('http://127.0.0.1:7242/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hypothesis: 'H4',
              location: 'web/DocumentCard.tsx:onClick',
              message: onOpenOverride
                ? 'Doc card click → onOpenOverride'
                : campaignMode && !inSpacesUi
                  ? 'Doc card click → campaignMode media panel (NOT doc preview)'
                  : 'Doc card click → dispatching vibey-open-artifact',
              data: {
                documentId,
                spaceId: spaceId ?? null,
                spaceItemId: spaceItemId ?? null,
                inSpacesUi,
                hasCampaignMode: !!campaignMode,
                page: window.location.pathname,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {})
          // #endregion
          if (onOpenOverride) {
            onOpenOverride()
            return
          }
          if (campaignMode && !inSpacesUi) {
            campaignMode.expandPanel('media')
            return
          }
          window.dispatchEvent(
            new CustomEvent('vibey-open-artifact', {
              detail: {
                artifactType: spaceItemId ? 'space_doc' : 'document',
                artifactId: spaceItemId ?? documentId,
                documentId,
                name: title,
                spaceId,
                spaceItemId,
              },
            }),
          )
        }}
        className="card-glass rounded-spacing-3 hover:bg-hover-subtle w-full cursor-pointer overflow-hidden text-left transition-colors"
      >
        <div
          className="border-border bg-muted/30 px-spacing-4 py-spacing-4 relative overflow-hidden border-b"
          style={{ height: ARTIFACT_CHAT_PREVIEW_PANE_PX }}
        >
          {snippet ? (
            <p className="body-3 text-muted-foreground h-full overflow-y-auto whitespace-pre-line pr-1">
              {snippet}
            </p>
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileText className="icon-lg text-muted-foreground animate-pulse" />
            </div>
          )}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--color-card))' }}
          />
        </div>
        <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center">
          <FileText className="icon-sm text-muted-foreground shrink-0" />
          <span className="body-3 text-accent min-w-0 truncate font-semibold">{title}</span>
        </div>
      </button>

      {onDownloadClick ? (
        <div className="pointer-events-none absolute right-2 top-2 z-10 opacity-0 transition-opacity duration-150 ease-out group-hover:pointer-events-auto group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onDownloadClick(e)
            }}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-card)] transition-colors"
            aria-label="Download document"
            title="Download"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
