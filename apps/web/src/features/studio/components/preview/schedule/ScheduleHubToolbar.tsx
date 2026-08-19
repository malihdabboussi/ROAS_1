'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpDown, Check, ChevronDown, Search, X } from 'lucide-react'
import type { ScheduleSort } from './types'

const SORT_OPTIONS: {
  group: string
  options: { id: ScheduleSort; label: string; description: string }[]
}[] = [
  {
    group: 'Scheduled',
    options: [
      { id: 'scheduled_at.asc', label: 'Soonest', description: 'Earliest first' },
      { id: 'scheduled_at.desc', label: 'Latest', description: 'Most recent first' },
    ],
  },
  {
    group: 'Platform',
    options: [
      { id: 'platform.asc', label: 'A → Z', description: 'Alphabetical order' },
      { id: 'platform.desc', label: 'Z → A', description: 'Reverse alphabetical' },
    ],
  },
]

const PLATFORM_OPTIONS: { id: string; label: string }[] = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' },
]

interface ScheduleHubToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  currentSort: ScheduleSort
  onSortChange: (sort: ScheduleSort) => void
  platformsFilter: Set<string>
  onPlatformsFilterChange: (platforms: Set<string>) => void
}

export function ScheduleHubToolbar({
  searchValue,
  onSearchChange,
  currentSort,
  onSortChange,
  platformsFilter,
  onPlatformsFilterChange,
}: ScheduleHubToolbarProps) {
  const [activeSortDropdown, setActiveSortDropdown] = useState(false)
  const [activePlatformDropdown, setActivePlatformDropdown] = useState(false)
  const sortBtnRef = useRef<HTMLButtonElement>(null)
  const platformBtnRef = useRef<HTMLButtonElement>(null)
  const [sortDropdownPos, setSortDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const [platformDropdownPos, setPlatformDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (!activeSortDropdown || !sortBtnRef.current) return
    const rect = sortBtnRef.current.getBoundingClientRect()
    setSortDropdownPos({ top: rect.bottom + 4, left: rect.right - 200, width: 200 })
  }, [activeSortDropdown])

  useEffect(() => {
    if (!activePlatformDropdown || !platformBtnRef.current) return
    const rect = platformBtnRef.current.getBoundingClientRect()
    setPlatformDropdownPos({ top: rect.bottom + 4, left: rect.left, width: 160 })
  }, [activePlatformDropdown])

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

  useEffect(() => {
    if (!activePlatformDropdown) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest('[data-platform-dropdown]') &&
        !platformBtnRef.current?.contains(target)
      ) {
        setActivePlatformDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activePlatformDropdown])

  const platformLabel =
    platformsFilter.size === 0
      ? 'Platform'
      : platformsFilter.size === PLATFORM_OPTIONS.length
        ? 'All platforms'
        : PLATFORM_OPTIONS.filter((o) => platformsFilter.has(o.id))
            .map((o) => o.label)
            .join(', ')

  return (
    <div className="surface-card border-border rounded-spacing-2 p-spacing-3 sm:p-spacing-4 border">
      <div className="gap-spacing-2 flex items-center">
        <div className="relative min-w-0 flex-1 md:flex-none">
          <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search posts..."
            className="input-glass input-leading body-3 h-spacing-8 pr-spacing-3 w-full rounded-lg py-0 md:w-48"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground right-spacing-2 absolute top-1/2 -translate-y-1/2"
            >
              <X className="icon-sm" />
            </button>
          )}
        </div>
        <div className="ml-auto" />
        <button
          ref={platformBtnRef}
          onClick={() => setActivePlatformDropdown(!activePlatformDropdown)}
          className="button-glass-blue body-4 h-spacing-8 gap-spacing-1 px-spacing-3 flex items-center rounded-lg font-medium"
        >
          <span className="relative z-10">{platformLabel}</span>
          <ChevronDown className="icon-sm" />
        </button>
        <button
          ref={sortBtnRef}
          onClick={() => setActiveSortDropdown(!activeSortDropdown)}
          aria-label="Sort schedule"
          title="Sort schedule"
          className="button-glass-blue h-spacing-8 gap-spacing-1 px-spacing-3 flex items-center rounded-lg font-medium"
        >
          <ArrowUpDown className="icon-sm" />
        </button>

        {activePlatformDropdown &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="dropdown-menu-solid p-spacing-2 z-dropdown border-border surface-card rounded-spacing-2 fixed min-w-36 border shadow-lg"
              style={{
                top: platformDropdownPos.top,
                left: platformDropdownPos.left,
                width: platformDropdownPos.width,
              }}
              data-platform-dropdown
            >
              <div className="space-y-spacing-0">
                <button
                  type="button"
                  onClick={() => {
                    onPlatformsFilterChange(new Set())
                    setActivePlatformDropdown(false)
                  }}
                  className={`px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${
                    platformsFilter.size === 0
                      ? 'dropdown-sort-option-selected text-muted-foreground'
                      : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                  }`}
                >
                  <span>All platforms</span>
                  {platformsFilter.size === 0 && <Check className="icon-sm text-primary" />}
                </button>
                {PLATFORM_OPTIONS.map((opt) => {
                  const isSelected = platformsFilter.has(opt.id)
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const next = new Set(platformsFilter)
                        if (next.has(opt.id)) next.delete(opt.id)
                        else next.add(opt.id)
                        onPlatformsFilterChange(next)
                      }}
                      className={`px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${
                        isSelected
                          ? 'dropdown-sort-option-selected text-muted-foreground'
                          : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="icon-sm text-primary" />}
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body,
          )}

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
                            className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 flex w-full items-center justify-between text-left transition-all ${
                              isSelected
                                ? 'dropdown-sort-option-selected text-muted-foreground'
                                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                            }`}
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
