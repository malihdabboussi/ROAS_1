'use client'

import { createPortal } from 'react-dom'
import { Bookmark, Loader2, ScanText, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const BTN =
  'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] disabled:opacity-50'

export function IgResearchBulkActionBar({
  selectedCount,
  busy = false,
  onClearSelection,
  onAnalyzePosts,
  onSaveToResearch,
  saveableCount = 0,
}: {
  selectedCount: number
  busy?: boolean
  onClearSelection: () => void
  onAnalyzePosts: () => void
  onSaveToResearch?: () => void
  saveableCount?: number
}) {
  if (selectedCount === 0 || typeof document === 'undefined') return null

  const analyzeLabel = selectedCount === 1 ? 'Analyze post' : 'Analyze posts'

  return createPortal(
    <div className="fixed bottom-6 left-1/2 z-[9000] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 px-2">
      <div
        className={cn(
          'dropdown-menu-solid flex w-max flex-nowrap items-center gap-1 rounded-xl px-4 py-2',
          busy && 'pointer-events-none opacity-70',
        )}
      >
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
          {selectedCount} Post{selectedCount > 1 ? 's' : ''} selected
          <button
            type="button"
            onClick={onClearSelection}
            className="ml-0.5 rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
            aria-label="Clear selection"
          >
            <X className="h-3 w-3" />
          </button>
        </span>

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        {onSaveToResearch && saveableCount > 0 ? (
          <button type="button" disabled={busy} onClick={onSaveToResearch} className={BTN}>
            <Bookmark className="h-3.5 w-3.5" />
            Save to research
            {saveableCount < selectedCount ? ` (${saveableCount})` : ''}
          </button>
        ) : null}

        <button type="button" disabled={busy} onClick={onAnalyzePosts} className={BTN}>
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ScanText className="h-3.5 w-3.5" />
          )}
          {analyzeLabel}
        </button>
      </div>
    </div>,
    document.body,
  )
}
