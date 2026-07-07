'use client'

import type { ReactNode } from 'react'

interface SelectionTableHeaderProps {
  hasSelection: boolean
  allSelected: boolean
  selectedCount: number
  onSelectAll: (checked: boolean) => void
  onBulkDelete: () => void
  bulkDeleteDisabled?: boolean
  desktopHeaderClassName: string
  desktopHeaderContent: ReactNode
  mobileLabel: string
}

export function SelectionTableHeader({
  hasSelection,
  allSelected,
  selectedCount,
  onSelectAll,
  onBulkDelete,
  bulkDeleteDisabled = false,
  desktopHeaderClassName,
  desktopHeaderContent,
  mobileLabel,
}: SelectionTableHeaderProps) {
  return (
    <>
      {hasSelection ? (
        <div className="gap-spacing-4 px-spacing-3 h-spacing-10 typo-caption surface-card border-border rounded-spacing-3 hidden items-center justify-between border shadow-sm md:flex">
          <div className="gap-spacing-3 flex items-center">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="accent-primary"
            />
            <span className="body-3 text-muted-foreground pl-spacing-2">
              Showing {selectedCount} selected
            </span>
          </div>
          <button
            className="button-glass-destructive h-spacing-8 px-spacing-3 typo-caption rounded-lg font-medium disabled:opacity-50"
            disabled={bulkDeleteDisabled}
            onClick={onBulkDelete}
          >
            <span className="relative z-10">Delete Selected ({selectedCount})</span>
          </button>
        </div>
      ) : (
        <div className={desktopHeaderClassName}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="accent-primary"
          />
          {desktopHeaderContent}
        </div>
      )}

      <div className="gap-spacing-2 px-spacing-3 h-spacing-10 typo-caption text-muted-foreground surface-card border-border rounded-spacing-3 flex items-center justify-between border shadow-sm md:hidden">
        <div className="gap-spacing-3 flex min-w-0 flex-1 items-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="accent-primary"
          />
          <div className="body-3">{mobileLabel}</div>
        </div>
      </div>
    </>
  )
}
