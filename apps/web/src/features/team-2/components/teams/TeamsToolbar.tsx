'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Grid3x3, Layers, List, Plus, Search } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { TeamsGroupByToolbarPopover } from './TeamsGroupByToolbarPopover'

const TOOLBAR_DOCK_SLOT_SPRING = {
  type: 'spring' as const,
  stiffness: 460,
  damping: 40,
  mass: 0.78,
}

export type TeamsViewMode = 'grid' | 'list'
export type TeamsGroupBy = 'none' | 'type' | 'roster' | 'access'
export type TeamsGroupSort = 'asc' | 'desc'

const GROUP_BY_LABELS: Record<Exclude<TeamsGroupBy, 'none'>, string> = {
  type: 'Type',
  roster: 'Roster',
  access: 'Access',
}

interface TeamsToolbarProps {
  view: TeamsViewMode
  onViewChange: (next: TeamsViewMode) => void
  search: string
  onSearchChange: (next: string) => void
  searchOpen: boolean
  onSearchOpenChange: (next: boolean) => void
  groupBy: TeamsGroupBy
  onGroupByChange: (next: TeamsGroupBy) => void
  groupSort: TeamsGroupSort
  onGroupSortChange: (next: TeamsGroupSort) => void
  onNewTeam: () => void
  canCreateTeam: boolean
}

export function TeamsToolbar({
  view,
  onViewChange,
  search,
  onSearchChange,
  searchOpen,
  onSearchOpenChange,
  groupBy,
  onGroupByChange,
  groupSort,
  onGroupSortChange,
  onNewTeam,
  canCreateTeam,
}: TeamsToolbarProps) {
  const groupByBtnRef = useRef<HTMLSpanElement>(null)
  const [groupByOpen, setGroupByOpen] = useState(false)
  const activeGroupLabel = groupBy === 'none' ? null : GROUP_BY_LABELS[groupBy]

  return (
    <div className="scrollbar-hide flex w-full min-w-0 flex-nowrap items-center justify-between gap-2 overflow-x-auto">
      <div className="flex min-w-0 shrink flex-nowrap items-center gap-1">
        <Tooltip label="Group by" side="bottom">
          <span ref={groupByBtnRef} className="inline-flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setGroupByOpen((open) => !open)}
              className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
                activeGroupLabel
                  ? 'badge-glass-purple'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
              }`}
            >
              <Layers className="h-3 w-3" />
              {activeGroupLabel ?? 'Group by'}
            </button>
          </span>
        </Tooltip>
        <TeamsGroupByToolbarPopover
          open={groupByOpen}
          onClose={() => setGroupByOpen(false)}
          anchorRef={groupByBtnRef}
          groupBy={groupBy}
          groupSort={groupSort}
          onGroupByChange={onGroupByChange}
          onGroupSortChange={onGroupSortChange}
        />
        <Tooltip label="Grid view" side="bottom" triggerClassName="flex h-full items-center">
          <span className="inline-flex">
            <button
              type="button"
              onClick={() => onViewChange('grid')}
              aria-pressed={view === 'grid'}
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                view === 'grid'
                  ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
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
                  ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </span>
        </Tooltip>
      </div>

      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1">
        <div className="flex h-7 shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {searchOpen ? (
              <motion.div
                key="teams-search-field"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
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
                  placeholder="Search teams…"
                  className="w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
                />
              </motion.div>
            ) : (
              <motion.div
                key="teams-search-icon"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <Tooltip label="Search" side="bottom" triggerClassName="flex h-full items-center">
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={() => onSearchOpenChange(true)}
                      className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {canCreateTeam ? (
          <>
            <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
            <button
              type="button"
              onClick={onNewTeam}
              className="badge-glass badge-glass-green rounded-spacing-2 body-3 inline-flex h-7 shrink-0 items-center gap-1.5 px-3 font-semibold transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              New Team
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
