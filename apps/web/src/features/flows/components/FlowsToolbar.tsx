'use client'

import { useMemo, useRef, useState } from 'react'
import {
  ArrowUpDown,
  CircleAlert,
  FilePenLine,
  Grid3x3,
  List,
  Power,
  Search,
  Users,
  Waypoints,
} from 'lucide-react'
import { Team2FilterDropdown } from '@/components/filters/Team2FilterDropdown'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import { Tooltip } from '@/components/ui/tooltip'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import type {
  FlowsDraftFilter,
  FlowsEnabledFilter,
  FlowsGroupBy,
  FlowsGroupSort,
  FlowsSort,
  FlowsSurfaceFilter,
  FlowsViewMode,
} from '../types/flows-page.types'
import { FlowsGroupByButton } from './FlowsGroupByButton'
import { FlowsGroupByToolbarPopover } from './FlowsGroupByToolbarPopover'

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

const SURFACE_OPTIONS: AutomationSolidOption[] = [
  { value: 'all', label: 'All loops' },
  { value: 'team', label: 'Team loops' },
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
  surfaceFilter: FlowsSurfaceFilter
  onSurfaceFilterChange: (next: FlowsSurfaceFilter) => void
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
  surfaceFilter,
  onSurfaceFilterChange,
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
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              className={`h-spacing-7 rounded-spacing-2 flex aspect-square shrink-0 items-center justify-center transition-colors ${
                view === 'grid'
                  ? 'bg-hover-subtle text-foreground'
                  : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
              }`}
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
              aria-label="List view"
              aria-pressed={view === 'list'}
              className={`h-spacing-7 rounded-spacing-2 flex aspect-square shrink-0 items-center justify-center transition-colors ${
                view === 'list'
                  ? 'bg-hover-subtle text-foreground'
                  : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
              }`}
            >
              <List className="icon-sm" />
            </button>
          </span>
        </Tooltip>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        {searchOpen ? (
          <label className="relative block w-40">
            <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none" />
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
              aria-label="Search flows"
              className="input-leading h-spacing-7 pr-spacing-2 body-4 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-foreground w-full border outline-none"
            />
          </label>
        ) : (
          <Tooltip label="Search" side="bottom" triggerClassName="flex h-full items-center">
            <span className="inline-flex">
              <button
                type="button"
                onClick={() => onSearchOpenChange(true)}
                className="btn-icon-bare hover:bg-hover-subtle"
                aria-label="Search flows"
              >
                <Search className="icon-sm" />
              </button>
            </span>
          </Tooltip>
        )}

        <AutomationSolidSelect
          variant="icon"
          triggerIcon={<Users className="icon-sm shrink-0" />}
          tooltip="Loop area"
          tooltipSide="top"
          active={surfaceFilter !== 'all'}
          menuWidth="min200"
          options={SURFACE_OPTIONS}
          value={surfaceFilter}
          onChange={(value) => onSurfaceFilterChange(value as FlowsSurfaceFilter)}
          placeholder="Area"
          ariaLabel="Filter by loop area"
        />
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
          icon={<ArrowUpDown className="icon-sm" />}
          align="right"
        />
      </div>
    </div>
  )
}
