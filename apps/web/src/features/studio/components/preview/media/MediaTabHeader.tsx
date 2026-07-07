'use client'

import { LayoutGrid, List, Pencil, Plus, Search, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { MediaViewMode } from './media-tab.types'

interface MediaTabHeaderProps {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  bulkSelectMode: boolean
  onToggleBulkSelectMode: () => void
  onOpenPicker: () => void
  isMobile: boolean
  viewMode: MediaViewMode
  onToggleViewMode: () => void
}

export function MediaTabHeader({
  searchQuery,
  onSearchQueryChange,
  bulkSelectMode,
  onToggleBulkSelectMode,
  onOpenPicker,
  isMobile,
  viewMode,
  onToggleViewMode,
}: MediaTabHeaderProps) {
  const hasSearchQuery = searchQuery.trim().length > 0

  return (
    <div className="border-border px-spacing-4 flex items-center justify-end border-b py-3">
      <div className="gap-spacing-1 flex items-center">
        <div className="input-glass gap-spacing-2 rounded-spacing-2 px-spacing-3 h-spacing-8 flex w-28 shrink-0 items-center py-0 transition-[width] duration-200 focus-within:w-40">
          <Search className="icon-xs text-muted-foreground shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search…"
            className="body-3 text-foreground placeholder:text-muted-foreground min-h-0 min-w-0 flex-1 bg-transparent leading-none focus:outline-none"
          />
          {hasSearchQuery ? (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Clear search"
            >
              <X className="icon-xs shrink-0" />
            </button>
          ) : null}
        </div>
        <Tooltip label={bulkSelectMode ? 'Exit bulk edit' : 'Bulk edit'} side="bottom">
          <button
            type="button"
            onClick={onToggleBulkSelectMode}
            className={`btn-icon-glass flex items-center justify-center rounded ${
              bulkSelectMode ? 'chip-glass-blue text-primary' : ''
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip label="Add media" side="bottom">
          <button
            type="button"
            onClick={onOpenPicker}
            className="btn-icon-glass flex items-center justify-center rounded"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleViewMode}
            className="chip-glass-neutral h-spacing-8 rounded-spacing-2 text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 px-2 transition-colors"
          >
            {viewMode === 'list' ? (
              <LayoutGrid className="h-3 w-3 shrink-0" />
            ) : (
              <List className="h-3 w-3 shrink-0" />
            )}
            <span className="body-4 whitespace-nowrap leading-none">
              {viewMode === 'list' ? 'Grid' : 'List'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
