'use client'

import type { RefObject } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Presentation } from '@/lib/artifacts/artifact-types'

interface PresentationSettingsHeaderProps {
  presentation: Presentation
  presentationIndex: number
  presentationsCount: number
  isSaving: boolean
  editingId: string | null
  draftName: string
  setDraftName: (value: string) => void
  onStartEdit: (presentation: Presentation) => void
  onCommitEdit: (presentation: Presentation) => Promise<void>
  onCancelEdit: () => void
  onPrevious: () => void
  onNext: () => void
  onSelectPresentation: (index: number) => void
  nameInputRef: RefObject<HTMLInputElement | null>
}

export function PresentationSettingsHeader({
  presentation,
  presentationIndex,
  presentationsCount,
  isSaving,
  editingId,
  draftName,
  setDraftName,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onPrevious,
  onNext,
  onSelectPresentation,
  nameInputRef,
}: PresentationSettingsHeaderProps) {
  const statusLabel =
    presentation.status === 'published'
      ? 'Published'
      : presentation.status === 'generated'
        ? 'Generated'
        : 'Draft'
  const statusClass =
    presentation.status === 'published'
      ? 'badge-glass-green'
      : presentation.status === 'generated'
        ? 'badge-glass-orange'
        : 'badge-glass-muted'

  return (
    <div className="space-y-spacing-3">
      <div className="flex flex-col items-center text-center">
        {editingId === presentation.id ? (
          <input
            ref={nameInputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onCommitEdit(presentation)
              if (e.key === 'Escape') onCancelEdit()
              e.stopPropagation()
            }}
            onBlur={() => void onCommitEdit(presentation)}
            className="input-glass title-h6 text-foreground rounded-spacing-2 px-spacing-2 py-spacing-1 text-center outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => onStartEdit(presentation)}
            className="title-h6 text-foreground hover:text-foreground/90 transition-colors"
            title="Click to edit presentation name"
          >
            {presentation.name ?? 'Presentation'}
          </button>
        )}
        {isSaving && <span className="body-3 text-muted-foreground">Saving...</span>}
      </div>

      <div className="gap-spacing-3 flex items-center justify-center">
        <span className={`badge-glass badge-glass-sm ${statusClass}`}>{statusLabel}</span>
      </div>

      {presentationsCount > 1 && (
        <div className="gap-spacing-3 flex items-center justify-center">
          <button
            type="button"
            aria-label="Previous presentation"
            onClick={onPrevious}
            disabled={presentationIndex === 0}
            className="p-spacing-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="icon-sm" />
          </button>

          <div className="gap-spacing-2 flex items-center">
            {Array.from({ length: presentationsCount }, (_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Show presentation ${idx + 1}`}
                onClick={() => onSelectPresentation(idx)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  idx === presentationIndex
                    ? 'step-circle-completed-purple scale-110'
                    : 'step-circle-default hover:scale-110'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Next presentation"
            onClick={onNext}
            disabled={presentationIndex === presentationsCount - 1}
            className="p-spacing-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            <ChevronRight className="icon-sm" />
          </button>

          <span className="body-4 text-muted-foreground">
            {presentationIndex + 1} / {presentationsCount}
          </span>
        </div>
      )}
    </div>
  )
}
