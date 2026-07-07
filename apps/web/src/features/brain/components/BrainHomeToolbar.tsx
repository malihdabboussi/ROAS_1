'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { GraduationCap, Grid3x3, List, Search } from 'lucide-react'
import { Team2FilterDropdown } from '@/components/filters/Team2FilterDropdown'
import { Tooltip } from '@/components/ui/tooltip'
import {
  SORT_OPTIONS,
  STATUS_OPTIONS,
  type BrainSort,
  type BrainStatusFilter,
  type BrainViewMode,
} from '../lib/brain-home-state'

const TOOLBAR_SPRING = {
  type: 'spring' as const,
  stiffness: 460,
  damping: 40,
  mass: 0.78,
}

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
    <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <div className="flex min-w-0 shrink flex-wrap items-center gap-1">
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

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <div className="flex h-7 shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {searchOpen ? (
              <motion.div
                key="brain-search-field"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_SPRING}
                className="flex h-7 items-center justify-center"
              >
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
                  className="w-40 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                />
              </motion.div>
            ) : (
              <motion.div
                key="brain-search-icon"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <Tooltip label="Search" side="bottom" triggerClassName="flex h-full items-center">
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={() => onSearchOpenChange(true)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Tooltip label="Grid view" side="bottom" triggerClassName="flex h-full items-center">
          <span className="inline-flex">
            <button
              type="button"
              onClick={() => onViewChange('grid')}
              aria-pressed={view === 'grid'}
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                view === 'grid'
                  ? 'bg-hover-subtle text-foreground'
                  : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
              }`}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
            </button>
          </span>
        </Tooltip>
        <Tooltip label="List view" side="bottom" triggerClassName="flex h-full items-center">
          <span className="inline-flex">
            <button
              type="button"
              onClick={() => onViewChange('list')}
              aria-pressed={view === 'list'}
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                view === 'list'
                  ? 'bg-hover-subtle text-foreground'
                  : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </span>
        </Tooltip>

        <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />

        <button
          type="button"
          disabled={trainDisabled}
          onClick={onTrain}
          className="badge-glass badge-glass-green rounded-spacing-2 body-3 inline-flex h-7 shrink-0 items-center gap-1.5 px-3 font-semibold transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
        >
          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
          Train
        </button>
      </div>
    </div>
  )
}
