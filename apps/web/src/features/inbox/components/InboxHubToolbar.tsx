'use client'

import { useEffect, useState } from 'react'
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import type { YourTurnKind } from '@/features/spaces/services/your-turn.service'
import type { InboxSort } from '../lib/inbox-query'

export type InboxKindFilter = 'all' | YourTurnKind

const KIND_PILLS: { id: YourTurnKind; label: string }[] = [
  { id: 'mission_subtask', label: 'Subtask' },
  { id: 'space_item', label: 'Space' },
  { id: 'suggestion', label: 'Suggestion' },
  { id: 'plan_approval', label: 'Plan' },
]

const SORT_OPTIONS: {
  group: string
  options: { id: InboxSort; label: string; description: string }[]
}[] = [
  {
    group: 'Activity',
    options: [
      { id: 'activity.desc', label: 'Recently active', description: 'Last update first' },
      { id: 'activity.asc', label: 'Least active', description: 'Oldest activity first' },
    ],
  },
  {
    group: 'Created',
    options: [
      { id: 'created_at.desc', label: 'Newest first', description: 'Most recently created' },
      { id: 'created_at.asc', label: 'Oldest first', description: 'Earliest created first' },
    ],
  },
  {
    group: 'Due',
    options: [
      { id: 'due_at.asc', label: 'Due soonest', description: 'Upcoming due dates' },
      { id: 'due_at.desc', label: 'Due latest', description: 'Farthest due first' },
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

interface InboxHubToolbarProps {
  kindFilter: InboxKindFilter
  onKindFilterChange: (k: InboxKindFilter) => void
  currentSort: InboxSort
  onSortChange: (s: InboxSort) => void
  searchValue: string
  onSearchChange: (v: string) => void
}

function kindLabel(filter: InboxKindFilter): string {
  if (filter === 'all') return 'All'
  return KIND_PILLS.find((p) => p.id === filter)?.label ?? filter
}

export function InboxHubToolbar({
  kindFilter,
  onKindFilterChange,
  currentSort,
  onSortChange,
  searchValue,
  onSearchChange,
}: InboxHubToolbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [isPillsExpanded, setIsPillsExpanded] = useState(true)
  const kindIsFiltered = kindFilter !== 'all'

  useEffect(() => {
    if (!activeDropdown) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !target.closest('button')) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activeDropdown])

  return (
    <div className="surface-card border-border rounded-spacing-2 p-spacing-3 sm:p-spacing-4 relative border">
      <div className="flex items-center gap-2 md:hidden">
        <div className="relative min-w-0 flex-1">
          <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search…"
            className="input-glass input-leading body-3 h-spacing-8 pr-spacing-3 w-full rounded-lg py-0"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-muted-foreground hover:text-foreground right-spacing-2 absolute top-1/2 -translate-y-1/2"
            >
              <X className="icon-sm" />
            </button>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setActiveDropdown(activeDropdown === 'mobile-kind' ? null : 'mobile-kind')
            }
            className={`pill pill--sm flex items-center gap-1 ${kindIsFiltered ? 'pill--active' : ''}`}
          >
            <span className="relative z-10">{kindLabel(kindFilter)}</span>
            <ChevronDown className="icon-xs relative z-10" />
          </button>
          {activeDropdown === 'mobile-kind' && (
            <div
              className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 absolute right-0 top-full z-50 mt-1 min-w-[160px]"
              data-dropdown
            >
              <button
                type="button"
                onClick={() => {
                  onKindFilterChange('all')
                  setActiveDropdown(null)
                }}
                className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full text-left ${
                  kindFilter === 'all'
                    ? 'dropdown-sort-option-selected text-muted-foreground'
                    : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                }`}
              >
                All
              </button>
              {KIND_PILLS.map((pill) => (
                <button
                  type="button"
                  key={pill.id}
                  onClick={() => {
                    onKindFilterChange(pill.id)
                    setActiveDropdown(null)
                  }}
                  className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full text-left ${
                    kindFilter === pill.id
                      ? 'dropdown-sort-option-selected text-muted-foreground'
                      : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
            className="button-glass-blue h-spacing-8 px-spacing-2 flex shrink-0 items-center rounded-lg"
          >
            <ArrowUpDown className="icon-sm" />
          </button>
          {activeDropdown === 'sort' && (
            <div
              className="dropdown-menu-solid p-spacing-2 absolute right-0 top-full z-50 mt-1 max-h-[min(70vh,24rem)] w-[min(100vw-2rem,22rem)] overflow-y-auto"
              data-dropdown
            >
              <InboxSortMenu
                currentSort={currentSort}
                onSelect={(s) => {
                  onSortChange(s)
                  setActiveDropdown(null)
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="hidden items-center justify-between gap-4 md:flex">
        <div className="gap-spacing-2 flex min-w-0 items-center">
          <button
            type="button"
            onClick={() => {
              onKindFilterChange('all')
              setIsPillsExpanded((e) => !e)
            }}
            className={`pill pill--sm gap-spacing-1 flex items-center ${
              kindFilter === 'all' ? 'pill--active' : ''
            }`}
          >
            <span className="relative z-10 flex items-center gap-1">
              All
              {isPillsExpanded ? (
                <ChevronLeft className="icon-xs" />
              ) : (
                <ChevronRight className="icon-xs" />
              )}
            </span>
          </button>
          {isPillsExpanded &&
            KIND_PILLS.map((pill) => (
              <button
                type="button"
                key={pill.id}
                onClick={() => onKindFilterChange(pill.id)}
                className={`pill pill--sm ${kindFilter === pill.id ? 'pill--active' : ''}`}
              >
                <span className="relative z-10">{pill.label}</span>
              </button>
            ))}
        </div>

        <div className="gap-spacing-2 relative flex items-center">
          <div className="relative">
            <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search inbox…"
              className="input-glass input-leading body-3 h-spacing-8 pr-spacing-3 w-48 rounded-lg py-0"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-muted-foreground hover:text-foreground right-spacing-2 absolute top-1/2 -translate-y-1/2"
              >
                <X className="icon-sm" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
            className="button-glass-blue h-spacing-8 gap-spacing-1 px-spacing-3 flex items-center rounded-lg font-medium"
          >
            <span className="relative z-10">
              <ArrowUpDown className="icon-sm" />
            </span>
          </button>

          {activeDropdown === 'sort' && (
            <div className="mt-spacing-1 absolute right-0 top-full z-50" data-dropdown>
              <div className="dropdown-menu-solid p-spacing-2 min-w-48">
                <InboxSortMenu
                  currentSort={currentSort}
                  onSelect={(s) => {
                    onSortChange(s)
                    setActiveDropdown(null)
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InboxSortMenu({
  currentSort,
  onSelect,
}: {
  currentSort: InboxSort
  onSelect: (s: InboxSort) => void
}) {
  return (
    <div className="space-y-spacing-3">
      <h3 className="body-3 text-foreground px-spacing-2 py-spacing-1 font-medium">Sort by</h3>
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
                  onClick={() => onSelect(option.id)}
                  className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 flex w-full items-center justify-between text-left transition-all ${
                    isSelected
                      ? 'dropdown-sort-option-selected text-muted-foreground'
                      : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                  }`}
                >
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="typo-caption text-muted-foreground">{option.description}</div>
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
  )
}
