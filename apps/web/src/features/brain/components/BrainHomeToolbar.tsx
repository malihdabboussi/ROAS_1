'use client'

import { GraduationCap, Grid3x3, List, Search } from 'lucide-react'
import { Team2FilterDropdown } from '@/components/filters/Team2FilterDropdown'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import {
  SORT_OPTIONS,
  STATUS_OPTIONS,
  type BrainSort,
  type BrainStatusFilter,
  type BrainViewMode,
} from '../lib/brain-home-state'

export function BrainHomeToolbar({
  search,
  searchOpen,
  sort,
  statusFilters,
  view,
  trainDisabled,
  onSearchChange,
  onSearchOpenChange,
  onStatusToggle,
  onSortChange,
  onViewChange,
  onTrain,
}: {
  search: string
  searchOpen: boolean
  sort: BrainSort | null
  statusFilters: BrainStatusFilter[]
  view: BrainViewMode
  trainDisabled: boolean
  onSearchChange: (value: string) => void
  onSearchOpenChange: (open: boolean) => void
  onStatusToggle: (id: BrainStatusFilter) => void
  onSortChange: (sort: BrainSort) => void
  onViewChange: (view: BrainViewMode) => void
  onTrain: () => void
}) {
  return (
    <div className="scrollbar-hide flex w-full min-w-0 flex-nowrap items-center justify-between gap-2 overflow-x-auto">
      <div className="flex min-w-0 shrink flex-nowrap items-center gap-1">
        <Team2FilterDropdown
          label="Status"
          options={[...STATUS_OPTIONS]}
          selectedIds={statusFilters}
          showDescriptionAsTooltip
          onToggle={(id) => onStatusToggle(id as BrainStatusFilter)}
        />
        <Team2FilterDropdown
          label="Sort"
          options={[...SORT_OPTIONS]}
          currentId={sort}
          onSelect={(id) => onSortChange(id as BrainSort)}
        />
      </div>

      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1">
        {searchOpen ? (
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onBlur={() => {
              if (!search.trim()) onSearchOpenChange(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onSearchChange('')
                onSearchOpenChange(false)
              }
            }}
            placeholder="Search brains..."
            aria-label="Search brains"
            className="input-glass h-spacing-7 w-spacing-40 body-4 text-foreground placeholder:text-muted-foreground outline-none"
          />
        ) : (
          <Tooltip label="Search" side="bottom" triggerClassName="flex h-full items-center">
            <span className="inline-flex">
              <button
                type="button"
                onClick={() => onSearchOpenChange(true)}
                className="btn-icon-glass"
                aria-label="Search brains"
              >
                <Search className="icon-sm" />
              </button>
            </span>
          </Tooltip>
        )}

        <Tooltip label="Grid view" side="bottom" triggerClassName="flex h-full items-center">
          <span className="inline-flex">
            <button
              type="button"
              onClick={() => onViewChange('grid')}
              aria-pressed={view === 'grid'}
              aria-label="Grid view"
              className={cn(
                'btn-icon-glass',
                view === 'grid' ? 'bg-hover-subtle text-foreground' : 'text-muted-foreground',
              )}
            >
              <Grid3x3 className="icon-sm" />
            </button>
          </span>
        </Tooltip>
        <Tooltip label="List view" side="bottom" triggerClassName="flex h-full items-center">
          <span className="inline-flex">
            <button
              type="button"
              onClick={() => onViewChange('list')}
              aria-pressed={view === 'list'}
              aria-label="List view"
              className={cn(
                'btn-icon-glass',
                view === 'list' ? 'bg-hover-subtle text-foreground' : 'text-muted-foreground',
              )}
            >
              <List className="icon-sm" />
            </button>
          </span>
        </Tooltip>

        <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />

        <button
          type="button"
          disabled={trainDisabled}
          onClick={onTrain}
          className="button-glass-primary button-compact disabled:pointer-events-none disabled:opacity-50"
        >
          <GraduationCap className="icon-sm shrink-0" />
          Train
        </button>
      </div>
    </div>
  )
}
