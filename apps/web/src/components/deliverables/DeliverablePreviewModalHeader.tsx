'use client'

import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

export function DeliverablePreviewModalHeader({
  displayTitle,
  titleDraft,
  setTitleDraft,
  editingTitle,
  setEditingTitle,
  savingTitle,
  titleRenameable,
  handleTitleSave,
  onBack,
  backLabel = 'Back',
  actions,
}: {
  displayTitle: string
  titleDraft: string
  setTitleDraft: (title: string) => void
  editingTitle: boolean
  setEditingTitle: (editing: boolean) => void
  savingTitle: boolean
  titleRenameable: boolean
  handleTitleSave: () => Promise<void>
  /** When set, shows a Back control instead of only relying on X. */
  onBack?: () => void
  backLabel?: string
  actions: ReactNode
}) {
  return (
    <div className="px-spacing-6 pt-spacing-4 pb-spacing-3 flex-shrink-0 overflow-visible">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="gap-spacing-1 text-muted-foreground hover:text-foreground mb-spacing-2 body-3 flex items-center transition-colors"
        >
          <ArrowLeft className="icon-sm shrink-0" />
          <span>{backLabel}</span>
        </button>
      ) : null}
      <div className="gap-spacing-4 flex min-w-0 items-center justify-between">
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => void handleTitleSave()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleTitleSave()
              }
              if (e.key === 'Escape') {
                e.stopPropagation()
                setTitleDraft(displayTitle)
                setEditingTitle(false)
              }
            }}
            className="title-h6 text-foreground ring-border focus-visible:ring-ring min-w-0 flex-1 rounded-md bg-transparent outline-none ring-1"
            aria-label="Rename file"
          />
        ) : titleRenameable ? (
          <button
            type="button"
            onClick={() => {
              if (savingTitle) return
              setTitleDraft(displayTitle)
              setEditingTitle(true)
            }}
            title="Click to rename"
            className="block min-w-0 flex-1 cursor-text text-left"
          >
            <h2 className="title-h6 text-foreground hover:bg-hover-subtle truncate rounded-md transition-colors">
              {displayTitle}
            </h2>
          </button>
        ) : (
          <h2 className="title-h6 text-foreground min-w-0 flex-1 truncate" title={displayTitle}>
            {displayTitle}
          </h2>
        )}
        {actions}
      </div>
    </div>
  )
}
