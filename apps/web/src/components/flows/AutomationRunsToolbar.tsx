'use client'

import { useRef, useState } from 'react'
import { Filter, Search } from 'lucide-react'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import { Tooltip } from '@/components/ui/tooltip'
import { FlowsGroupByButton } from '@/components/flows/FlowsGroupByButton'
import {
  FlowsGroupByToolbarPopover,
  type FlowsGroupByToolbarOption,
} from '@/components/flows/FlowsGroupByToolbarPopover'
import { ReportingTimeRangeSelector } from '@/components/reporting'
import type { AutomationRun } from '@/lib/flows/automation-runs-api'
import type { FlowsGroupSort } from '@/lib/flows/flow-grouping-types'
import type { ReportingDateRangeInput } from '@/lib/reporting/resolve-reporting-dates'

export type RunHistoryGroupBy = 'none' | 'campaign' | 'space' | 'flow' | 'status' | 'time'
export type RunHistoryStatusFilter = 'all' | AutomationRun['status']
export type RunHistoryGroupSort = FlowsGroupSort

const GROUP_BY_OPTIONS: FlowsGroupByToolbarOption<Exclude<RunHistoryGroupBy, 'none'>>[] = [
  { id: 'campaign', label: 'Campaign' },
  { id: 'space', label: 'Space' },
  { id: 'flow', label: 'Flow' },
  { id: 'status', label: 'Status' },
  { id: 'time', label: 'Time' },
]

const GROUP_BY_LABELS: Record<Exclude<RunHistoryGroupBy, 'none'>, string> = {
  campaign: 'Campaign',
  space: 'Space',
  flow: 'Flow',
  status: 'Status',
  time: 'Time',
}

const STATUS_OPTIONS: AutomationSolidOption[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'partial', label: 'Partial' },
  { value: 'failed', label: 'Failed' },
]

interface AutomationRunsToolbarProps {
  search: string
  onSearchChange: (next: string) => void
  searchOpen: boolean
  onSearchOpenChange: (next: boolean) => void
  groupBy: RunHistoryGroupBy
  onGroupByChange: (next: RunHistoryGroupBy) => void
  groupSort: RunHistoryGroupSort
  onGroupSortChange: (next: RunHistoryGroupSort) => void
  statusFilter: RunHistoryStatusFilter
  onStatusFilterChange: (next: RunHistoryStatusFilter) => void
  dateConfig: ReportingDateRangeInput
  onDateConfigPatch: (patch: Partial<ReportingDateRangeInput>) => void
}

export function AutomationRunsToolbar({
  search,
  onSearchChange,
  searchOpen,
  onSearchOpenChange,
  groupBy,
  onGroupByChange,
  groupSort,
  onGroupSortChange,
  statusFilter,
  onStatusFilterChange,
  dateConfig,
  onDateConfigPatch,
}: AutomationRunsToolbarProps) {
  const groupByBtnRef = useRef<HTMLSpanElement>(null)
  const [groupByOpen, setGroupByOpen] = useState(false)

  return (
    <div className="gap-x-spacing-2 gap-y-spacing-1 px-spacing-3 py-spacing-2 flex w-full min-w-0 flex-wrap items-center justify-between">
      <div className="gap-spacing-1 flex min-w-0 shrink flex-wrap items-center">
        <FlowsGroupByButton<Exclude<RunHistoryGroupBy, 'none'>>
          groupBy={groupBy}
          labels={GROUP_BY_LABELS}
          ariaLabel="Group run history"
          btnRef={groupByBtnRef}
          onToggle={() => setGroupByOpen((open) => !open)}
        />
        <FlowsGroupByToolbarPopover<Exclude<RunHistoryGroupBy, 'none'>>
          open={groupByOpen}
          onClose={() => setGroupByOpen(false)}
          anchorRef={groupByBtnRef}
          groupBy={groupBy}
          groupSort={groupSort}
          options={GROUP_BY_OPTIONS}
          onGroupByChange={onGroupByChange}
          onGroupSortChange={onGroupSortChange}
        />
      </div>

      <div className="gap-spacing-1 flex shrink-0 flex-wrap items-center justify-end">
        <div className="h-spacing-7 flex shrink-0 items-center justify-center">
          {searchOpen ? (
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
              placeholder="Search runs..."
              className="h-spacing-7 rounded-spacing-2 border-border bg-background px-spacing-2 body-4 text-foreground placeholder:text-muted-foreground focus:border-primary w-spacing-48 border outline-none"
            />
          ) : (
            <Tooltip label="Search" side="bottom" triggerClassName="flex h-full items-center">
              <span className="inline-flex">
                <button
                  type="button"
                  onClick={() => onSearchOpenChange(true)}
                  className="btn-icon-bare hover:bg-hover-subtle"
                  aria-label="Search run history"
                >
                  <Search className="icon-sm shrink-0" />
                </button>
              </span>
            </Tooltip>
          )}
        </div>
        <AutomationSolidSelect
          variant="icon"
          triggerIcon={<Filter className="icon-sm shrink-0" />}
          tooltip="Run status"
          tooltipSide="top"
          active={statusFilter !== 'all'}
          menuWidth="min200"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(value) => onStatusFilterChange(value as RunHistoryStatusFilter)}
          placeholder="Status"
          ariaLabel="Filter by run status"
        />
        <ReportingTimeRangeSelector
          variant="badge"
          config={dateConfig}
          onConfigPatch={onDateConfigPatch}
        />
      </div>
    </div>
  )
}
