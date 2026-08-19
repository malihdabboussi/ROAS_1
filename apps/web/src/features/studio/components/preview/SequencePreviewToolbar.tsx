'use client'

import type { ReactNode, RefObject } from 'react'
import { Download, MoreVertical, Plus } from 'lucide-react'
import { InlineEditableArtifactTitle } from './InlineEditableArtifactTitle'
import { StudioSequenceMenuDropdown } from './StudioSequenceMenuDropdown'

const ARTIFACT_UTILITY_ICON_CLASS =
  'tooltip inline-flex h-spacing-7 w-7 shrink-0 items-center justify-center rounded-spacing-2 text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground'
const ARTIFACT_KEBAB_ICON_CLASS =
  'rounded-spacing-2 border border-border p-1.5 text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground'

interface SequencePreviewToolbarProps {
  sequence: {
    id: string
    name: string | null
    campaign_id: string | null
  }
  emailCount: number
  leadingChrome?: ReactNode
  trailingChrome?: ReactNode
  publishAdjacentChrome?: ReactNode
  exportingPdf: boolean
  addingEmail: boolean
  menuOpen: boolean
  menuButtonRef: RefObject<HTMLButtonElement | null>
  onExportPdf: () => void
  onAddEmail: () => void
  onSequenceNameCommit: (next: string) => void | Promise<void>
  onToggleMenu: () => void
  onCloseMenu: () => void
  onChanged: () => void
  onOpenFullView?: () => void
  onResourceDeleted?: () => void
}

export function SequencePreviewToolbar({
  sequence,
  emailCount,
  leadingChrome,
  trailingChrome,
  publishAdjacentChrome,
  exportingPdf,
  addingEmail,
  menuOpen,
  menuButtonRef,
  onExportPdf,
  onAddEmail,
  onSequenceNameCommit,
  onToggleMenu,
  onCloseMenu,
  onChanged,
  onOpenFullView,
  onResourceDeleted,
}: SequencePreviewToolbarProps) {
  return (
    <>
      <div
        className={`gap-spacing-2 flex items-center justify-between ${
          leadingChrome ? 'px-spacing-3 py-spacing-2' : 'px-spacing-4 py-spacing-3'
        }`}
      >
        <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
          {leadingChrome}
          <div className="min-w-0 flex-1">
            <InlineEditableArtifactTitle
              value={sequence.name ?? ''}
              placeholder="Untitled Sequence"
              onCommit={onSequenceNameCommit}
            />
          </div>
        </div>
        <div className="gap-spacing-1 flex min-w-0 shrink-0 flex-nowrap items-center">
          {emailCount > 0 ? (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={exportingPdf}
              data-tooltip="Download all emails as PDF"
              data-side="bottom"
              className={`${ARTIFACT_UTILITY_ICON_CLASS} disabled:opacity-50`}
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
            </button>
          ) : null}
          {trailingChrome}
          {publishAdjacentChrome ? (
            <span aria-hidden className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" />
          ) : null}
          {publishAdjacentChrome}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onToggleMenu()
            }}
            data-tooltip="Sequence options"
            data-side="bottom"
            aria-label="Sequence options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={ARTIFACT_KEBAB_ICON_CLASS}
          >
            <MoreVertical className="h-3.5 w-3.5 shrink-0" />
          </button>
          <button
            type="button"
            onClick={onAddEmail}
            disabled={addingEmail}
            className="chip-glass-green rounded-spacing-2 h-spacing-8 flex items-center gap-1.5 px-2.5 transition-all disabled:opacity-50"
          >
            <Plus className="icon-sm shrink-0" />
            <span className="body-3 font-medium">Add email</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <StudioSequenceMenuDropdown
          sequence={sequence}
          anchorRef={menuButtonRef}
          onClose={onCloseMenu}
          onChanged={onChanged}
          onOpenFullView={
            onOpenFullView
              ? () => {
                  onCloseMenu()
                  onOpenFullView()
                }
              : undefined
          }
          onDeleted={onResourceDeleted}
        />
      ) : null}
    </>
  )
}
