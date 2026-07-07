'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpDown,
  CircleAlert,
  FilePenLine,
  Grid3x3,
  List,
  Power,
  Search,
  Waypoints,
} from 'lucide-react'
import { Team2FilterDropdown } from '@/components/filters/Team2FilterDropdown'
import { Tooltip } from '@/components/ui/tooltip'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import type {
  FlowsDraftFilter,
  FlowsEnabledFilter,
  FlowsGroupBy,
  FlowsGroupSort,
  FlowsSort,
  FlowsViewMode,
} from '../types/flows-page.types'
import { FlowsGroupByButton } from './FlowsGroupByButton'
import { FlowsGroupByToolbarPopover } from './FlowsGroupByToolbarPopover'

const TOOLBAR_DOCK_SLOT_SPRING = {
  type: 'spring' as const,
  stiffness: 460,
  damping: 40,
  mass: 0.78,
}

const SORT_OPTIONS = [
  { id: 'recent', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'name_asc', label: 'Name A → Z' },
  { id: 'name_desc', label: 'Name Z → A' },
] as const

const DRAFT_OPTIONS: AutomationSolidOption[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft only' },
  { value: 'published', label: 'Published only' },
]

const ENABLED_OPTIONS: AutomationSolidOption[] = [
  { value: 'all', label: 'All' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

interface FlowsToolbarProps {
  view: FlowsViewMode
  onViewChange: (next: FlowsViewMode) => void
  search: string
  onSearchChange: (next: string) => void
  searchOpen: boolean
  onSearchOpenChange: (next: boolean) => void
  draftFilter: FlowsDraftFilter
  onDraftFilterChange: (next: FlowsDraftFilter) => void
  enabledFilter: FlowsEnabledFilter
  onEnabledFilterChange: (next: FlowsEnabledFilter) => void
  triggerFilter: string
  onTriggerFilterChange: (next: string) => void
  triggerFilterOptions: AutomationSolidOption[]
  incompleteOnly: boolean
  onIncompleteOnlyChange: (next: boolean) => void
  sort: FlowsSort
  onSortChange: (next: FlowsSort) => void
  groupBy: FlowsGroupBy
  onGroupByChange: (next: FlowsGroupBy) => void
  groupSort: FlowsGroupSort
  onGroupSortChange: (next: FlowsGroupSort) => void
}

export function FlowsToolbar({
  view,
  onViewChange,
  search,
  onSearchChange,
  searchOpen,
  onSearchOpenChange,
  draftFilter,
  onDraftFilterChange,
  enabledFilter,
  onEnabledFilterChange,
  triggerFilter,
  onTriggerFilterChange,
  triggerFilterOptions,
  incompleteOnly,
  onIncompleteOnlyChange,
  sort,
  onSortChange,
  groupBy,
  onGroupByChange,
  groupSort,
  onGroupSortChange,
}: FlowsToolbarProps) {
  const groupByBtnRef = useRef<HTMLSpanElement>(null)
  const [groupByOpen, setGroupByOpen] = useState(false)

  const triggerOptions = useMemo(
    () => [{ value: 'all', label: 'All triggers' }, ...triggerFilterOptions],
    [triggerFilterOptions],
  )

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 py-2">
      <div className="flex min-w-0 shrink flex-wrap items-center gap-1">
        <FlowsGroupByButton
          groupBy={groupBy}
          btnRef={groupByBtnRef}
          onToggle={() => setGroupByOpen((open) => !open)}
        />
        <FlowsGroupByToolbarPopover
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

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <div className="flex h-7 shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {searchOpen ? (
              <motion.div
                key="flows-search-field"
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
                  onChange={(e) => onSearchChange(e.target.value)}
                  onBlur={() => {
                    if (!search.trim()) onSearchOpenChange(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      onSearchChange('')
                      onSearchOpenChange(false)
                    }
                  }}
                  placeholder="Search flows…"
                  className="w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
                />
              </motion.div>
            ) : (
              <motion.div
                key="flows-search-icon"
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

        <AutomationSolidSelect
          variant="icon"
          triggerIcon={<FilePenLine className="icon-sm shrink-0" />}
          tooltip="Draft status"
          tooltipSide="top"
          active={draftFilter !== 'all'}
          menuWidth="min200"
          options={DRAFT_OPTIONS}
          value={draftFilter}
          onChange={(value) => onDraftFilterChange(value as FlowsDraftFilter)}
          placeholder="Status"
          ariaLabel="Filter by draft status"
        />
        <AutomationSolidSelect
          variant="icon"
          triggerIcon={<Power className="icon-sm shrink-0" />}
          tooltip="On or off"
          tooltipSide="top"
          active={enabledFilter !== 'all'}
          menuWidth="min200"
          options={ENABLED_OPTIONS}
          value={enabledFilter}
          onChange={(value) => onEnabledFilterChange(value as FlowsEnabledFilter)}
          placeholder="On / off"
          ariaLabel="Filter by on or off"
        />
        <AutomationSolidSelect
          variant="icon"
          triggerIcon={<Waypoints className="icon-sm shrink-0" />}
          tooltip="Trigger type"
          tooltipSide="top"
          active={triggerFilter !== 'all'}
          menuWidth="min200"
          options={triggerOptions}
          value={triggerFilter}
          onChange={onTriggerFilterChange}
          placeholder="Trigger"
          ariaLabel="Filter by trigger type"
        />
        <Tooltip label="Incomplete only" side="top" triggerClassName="inline-flex">
          <span className="inline-flex">
            <button
              type="button"
              role="switch"
              aria-checked={incompleteOnly}
              onClick={() => onIncompleteOnlyChange(!incompleteOnly)}
              className={`btn-icon-bare shrink-0 ${
                incompleteOnly ? 'btn-icon-glass--active' : 'hover:bg-hover-subtle'
              }`}
              aria-label={FLOWS_UI.incompleteOnlyAria}
            >
              <CircleAlert className="icon-sm shrink-0" aria-hidden />
            </button>
          </span>
        </Tooltip>
        <Team2FilterDropdown
          label="Sort"
          options={[...SORT_OPTIONS]}
          currentId={sort}
          onSelect={(id) => onSortChange(id as FlowsSort)}
          trigger="icon"
          icon={<ArrowUpDown className="h-3.5 w-3.5" />}
          align="right"
        />
      </div>
    </div>
  )
}
