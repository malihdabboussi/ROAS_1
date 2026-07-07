'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpDown, Grid3X3, List, Search, X } from 'lucide-react'

export type DeliverableSort = 'created_at.desc' | 'created_at.asc' | 'title.asc' | 'title.desc'

const SORT_OPTIONS: {
  group: string
  options: { id: DeliverableSort; label: string; description: string }[]
}[] = [
  {
    group: 'Created',
    options: [
      { id: 'created_at.desc', label: 'Newest first', description: 'Most recently created' },
      { id: 'created_at.asc', label: 'Oldest first', description: 'Earliest created first' },
    ],
  },
  {
    group: 'Title',
    options: [
      { id: 'title.asc', label: 'A → Z', description: 'Alphabetical order' },
      { id: 'title.desc', label: 'Z → A', description: 'Reverse alphabetical' },
    ],
  },
]

export type DeliverableViewMode = 'grid' | 'list'

interface CampaignDeliverablesHubToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  currentSort: DeliverableSort
  onSortChange: (sort: DeliverableSort) => void
  viewMode: DeliverableViewMode
  onViewModeChange: (mode: DeliverableViewMode) => void
}

export function CampaignDeliverablesHubToolbar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  currentSort,
  onSortChange,
  viewMode,
  onViewModeChange,
}: CampaignDeliverablesHubToolbarProps) {
  const [activeSortDropdown, setActiveSortDropdown] = useState(false)
  const sortBtnRef = useRef<HTMLButtonElement>(null)
  const [sortDropdownPos, setSortDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (!activeSortDropdown || !sortBtnRef.current) return
    const rect = sortBtnRef.current.getBoundingClientRect()
    setSortDropdownPos({ top: rect.bottom + 4, left: rect.right - 200, width: 200 })
  }, [activeSortDropdown])

  useEffect(() => {
    if (!activeSortDropdown) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-sort-dropdown]') && !sortBtnRef.current?.contains(target)) {
        setActiveSortDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activeSortDropdown])

  return (
    <div className="surface-card border-border rounded-spacing-2 p-spacing-3 sm:p-spacing-4 border">
      <div className="gap-spacing-2 flex items-center">
        <div className="relative min-w-0 flex-1 md:flex-none">
          <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
            placeholder="Search deliverables..."
            className="input-glass input-leading body-3 h-spacing-8 pr-spacing-3 w-full rounded-lg py-0 md:w-48"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="text-muted-foreground hover:text-foreground right-spacing-2 absolute top-1/2 -translate-y-1/2"
            >
              <X className="icon-sm" />
            </button>
          )}
        </div>
        <div className="ml-auto" />
        <span
          className="tooltip"
          data-tooltip={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          data-side="top"
        >
          <button
            type="button"
            onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
            className="button-glass-blue h-spacing-8 gap-spacing-1 px-spacing-2 flex items-center rounded-lg font-medium"
          >
            {viewMode === 'grid' ? <List className="icon-sm" /> : <Grid3X3 className="icon-sm" />}
          </button>
        </span>
        <button
          ref={sortBtnRef}
          onClick={() => setActiveSortDropdown(!activeSortDropdown)}
          className="button-glass-blue h-spacing-8 gap-spacing-1 px-spacing-3 flex items-center rounded-lg font-medium"
        >
          <ArrowUpDown className="icon-sm" />
        </button>

        {activeSortDropdown &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="dropdown-menu-solid p-spacing-2 z-dropdown border-border surface-card rounded-spacing-2 fixed min-w-48 border shadow-lg"
              style={{ top: sortDropdownPos.top, left: sortDropdownPos.left, width: 220 }}
              data-sort-dropdown
            >
              <div className="space-y-spacing-3">
                <h3 className="body-3 text-foreground px-spacing-2 py-spacing-1 font-medium">
                  Sort by
                </h3>
                {SORT_OPTIONS.map((group) => (
                  <div key={group.group} className="space-y-spacing-1">
                    <div className="typo-caption text-muted-foreground px-spacing-2 uppercase tracking-wider">
                      {group.group}
                    </div>
                    <div className="space-y-spacing-0">
                      {group.options.map((option) => {
                        const isSelected = currentSort === option.id
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              onSortChange(option.id)
                              setActiveSortDropdown(false)
                            }}
                            className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 flex w-full items-center justify-between text-left transition-all ${isSelected ? 'dropdown-sort-option-selected text-muted-foreground' : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'}`}
                          >
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="typo-caption text-muted-foreground">
                                {option.description}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="dropdown-sort-check ml-spacing-2">
                                <svg
                                  viewBox="0 0 20 20"
                                  className="tint-green relative z-30 h-2.5 w-2.5"
                                  fill="currentColor"
                                  aria-hidden="true"
                                  style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2))' }}
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  )
}
