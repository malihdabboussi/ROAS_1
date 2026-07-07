'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AutomationRunsToolbar,
  type RunHistoryGroupBy,
  type RunHistoryGroupSort,
  type RunHistoryStatusFilter,
} from '@/components/flows/AutomationRunsToolbar'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  resolveReportingDates,
  type ReportingDateRangeInput,
} from '@/lib/reporting/resolve-reporting-dates'
import {
  describeAutomationTriggerEvent,
  runStatusPresentation,
} from '@/lib/flows/automation-run-presentations'
import { fetchAutomationRuns, type AutomationRun } from '@/lib/flows/automation-runs-api'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

const RUN_HISTORY_MIN_WIDTH = 'min-w-[1480px]'
const RUN_HISTORY_GRID = `${RUN_HISTORY_MIN_WIDTH} grid grid-cols-[minmax(0,112px)_minmax(0,260px)_minmax(0,160px)_minmax(0,160px)_minmax(0,300px)_minmax(0,120px)_minmax(0,160px)_minmax(0,220px)] gap-spacing-3`
const ALL_RUN_DATES: ReportingDateRangeInput = { time_range: 'all' }
const RUN_HISTORY_REALTIME_RELOAD_DEBOUNCE_MS = 750

export interface AutomationRunDisplayMeta {
  flowName?: string | null
  campaignName?: string | null
  spaceName?: string | null
}

interface AutomationRunView {
  run: AutomationRun
  flowName: string
  campaignName: string
  spaceName: string
  triggerLabel: string
  timeBucket: string
  timeBucketOrder: number
}

interface AutomationRunsLogProps {
  campaignId?: string | null
  spaceId?: string | null
  open: boolean
  automationNames?: Record<string, string>
  automationMeta?: Record<string, AutomationRunDisplayMeta>
  spaceMeta?: Record<string, AutomationRunDisplayMeta>
}

export function AutomationRunsLog({
  campaignId = null,
  spaceId = null,
  open,
  automationNames = {},
  automationMeta = {},
  spaceMeta = {},
}: AutomationRunsLogProps) {
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [groupBy, setGroupBy] = useState<RunHistoryGroupBy>('none')
  const [groupSort, setGroupSort] = useState<RunHistoryGroupSort>('asc')
  const [statusFilter, setStatusFilter] = useState<RunHistoryStatusFilter>('all')
  const [dateConfig, setDateConfig] = useState<ReportingDateRangeInput>(ALL_RUN_DATES)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const scope = spaceId && !campaignId ? spaceId : { campaignId, spaceId }
      setRuns(await fetchAutomationRuns(scope))
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }, [campaignId, spaceId])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  useEffect(() => {
    if (!open) return undefined
    const supabase = createClient()
    let reloadTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => {
        reloadTimer = null
        void load()
      }, RUN_HISTORY_REALTIME_RELOAD_DEBOUNCE_MS)
    }

    const config = {
      event: '*',
      schema: 'public',
      table: 'space_automation_runs',
      ...(spaceId ? { filter: `space_id=eq.${spaceId}` } : {}),
    } as const

    const channel = supabase
      .channel(`automation-runs:${spaceId ?? campaignId ?? 'all'}`)
      .on('postgres_changes', config, scheduleReload)
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(
            `[Realtime] automation runs channel disconnected for ${spaceId ?? campaignId ?? 'all'}`,
            err instanceof Error ? err.message : err,
          )
        }
      })

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      void supabase.removeChannel(channel)
    }
  }, [campaignId, load, open, spaceId])

  const visibleRuns = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const { startDate, endDate } = resolveReportingDates(dateConfig)
    const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null
    const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null
    const term = search.trim().toLowerCase()

    return runs
      .map((run): AutomationRunView => {
        const byAutomation = automationMeta[run.automation_id] ?? null
        const bySpace = spaceMeta[run.space_id] ?? null
        const createdAt = new Date(run.created_at).getTime()
        const ageDays = Math.floor((now.getTime() - createdAt) / (24 * 60 * 60 * 1000))
        const timeBucket =
          createdAt >= startOfToday
            ? 'Today'
            : ageDays <= 1
              ? 'Yesterday'
              : ageDays <= 7
                ? 'Last 7 days'
                : ageDays <= 30
                  ? 'Last 30 days'
                  : 'Older'
        const timeBucketOrder =
          timeBucket === 'Today'
            ? 0
            : timeBucket === 'Yesterday'
              ? 1
              : timeBucket === 'Last 7 days'
                ? 2
                : timeBucket === 'Last 30 days'
                  ? 3
                  : 4

        return {
          run,
          flowName:
            byAutomation?.flowName ??
            automationNames[run.automation_id] ??
            FLOWS_UI.fallbackRunName,
          campaignName: byAutomation?.campaignName ?? bySpace?.campaignName ?? FLOWS_UI.noCampaign,
          spaceName: byAutomation?.spaceName ?? bySpace?.spaceName ?? FLOWS_UI.unknownSpace,
          triggerLabel: describeAutomationTriggerEvent(run.trigger_event),
          timeBucket,
          timeBucketOrder,
        }
      })
      .filter((row) => {
        if (statusFilter !== 'all' && row.run.status !== statusFilter) return false
        const createdAtMs = new Date(row.run.created_at).getTime()
        if (startMs !== null && createdAtMs < startMs) {
          return false
        }
        if (endMs !== null && createdAtMs > endMs) {
          return false
        }
        if (!term) return true
        return [
          row.flowName,
          row.campaignName,
          row.spaceName,
          row.triggerLabel,
          row.run.status,
          row.run.error ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(term)
      })
  }, [automationMeta, automationNames, dateConfig, runs, search, spaceMeta, statusFilter])

  const groupedRuns = useMemo(() => {
    if (groupBy === 'none') return null
    const groups = new Map<string, AutomationRunView[]>()
    for (const row of visibleRuns) {
      const key =
        groupBy === 'campaign'
          ? row.campaignName
          : groupBy === 'space'
            ? row.spaceName
            : groupBy === 'flow'
              ? row.flowName
              : groupBy === 'status'
                ? runStatusPresentation(row.run.status).label
                : row.timeBucket
      groups.set(key, [...(groups.get(key) ?? []), row])
    }
    const list = [...groups.entries()].map(([label, items]) => ({
      label,
      items,
      order: groupBy === 'time' ? (items[0]?.timeBucketOrder ?? 99) : 99,
    }))
    const direction = groupSort === 'desc' ? -1 : 1
    return list.sort((a, b) =>
      groupBy === 'time'
        ? (a.order - b.order) * direction
        : a.label.localeCompare(b.label) * direction,
    )
  }, [groupBy, groupSort, visibleRuns])

  if (!open) return null

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="py-spacing-8 flex flex-1 flex-col items-center justify-center">
          <VibeyLoadingOrb text="Loading run history..." state="processing" size="md" />
        </div>
      </div>
    )
  }

  const hasDateFilter =
    dateConfig.custom_start ||
    dateConfig.custom_end ||
    (dateConfig.time_range !== undefined && dateConfig.time_range !== 'all')
  const hasFilters = search.trim() || statusFilter !== 'all' || hasDateFilter

  if (runs.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="py-spacing-8 p-spacing-3 flex flex-1 flex-col items-center justify-center">
          <p className="body-3 text-muted-foreground text-center">{FLOWS_UI.noRuns}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AutomationRunsToolbar
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        groupSort={groupSort}
        onGroupSortChange={setGroupSort}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateConfig={dateConfig}
        onDateConfigPatch={(patch) => setDateConfig((prev) => ({ ...prev, ...patch }))}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        {visibleRuns.length === 0 ? (
          <div className="py-spacing-8 p-spacing-3 flex flex-1 flex-col items-center justify-center">
            <p className="body-3 text-muted-foreground text-center">
              {hasFilters ? FLOWS_UI.noRunsForFilters : FLOWS_UI.noRuns}
            </p>
          </div>
        ) : groupedRuns ? (
          <div>
            {groupedRuns.map((group) => (
              <div key={group.label}>
                <RunHistoryGroupHeader label={group.label} count={group.items.length} />
                <RunHistoryTable rows={group.items} />
              </div>
            ))}
          </div>
        ) : (
          <RunHistoryTable rows={visibleRuns} />
        )}
      </div>
    </div>
  )
}

function RunHistoryGroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div
      className={cn(
        RUN_HISTORY_MIN_WIDTH,
        'border-border bg-secondary px-spacing-6 py-spacing-2 sticky top-0 z-40 flex items-center justify-between border-y',
      )}
    >
      <span className="body-3 text-foreground truncate font-semibold">{label}</span>
      <span className="typo-caption text-muted-foreground tabular-nums">
        {count} run{count === 1 ? '' : 's'}
      </span>
    </div>
  )
}

function RunHistoryTable({ rows }: { rows: AutomationRunView[] }) {
  return (
    <div>
      <div
        className={cn(
          RUN_HISTORY_GRID,
          'border-border bg-background px-spacing-6 py-spacing-2 text-muted-foreground typo-section-label sticky top-0 z-30 items-center border-b',
        )}
      >
        <span className="whitespace-nowrap">Status</span>
        <span className="whitespace-nowrap">Flow</span>
        <span className="whitespace-nowrap">Campaign</span>
        <span className="whitespace-nowrap">Space</span>
        <span className="whitespace-nowrap">Trigger</span>
        <span className="whitespace-nowrap">Actions</span>
        <span className="whitespace-nowrap">Error</span>
        <span className="whitespace-nowrap">Ran at</span>
      </div>
      <div className="divide-border divide-y">
        {rows.map((row) => (
          <AutomationRunHistoryRow key={row.run.id} row={row} />
        ))}
      </div>
    </div>
  )
}

function AutomationRunHistoryRow({ row }: { row: AutomationRunView }) {
  const { run } = row
  const status = runStatusPresentation(run.status)
  const actionCount = run.actions_executed.length

  return (
    <div
      className={cn(
        RUN_HISTORY_GRID,
        'hover:bg-hover-subtle px-spacing-6 py-spacing-2 items-center transition-colors',
      )}
    >
      <span className={cn('body-4 truncate font-medium', status.textClassName)}>
        {status.label}
      </span>
      <span className="body-4 text-foreground truncate font-medium">{row.flowName}</span>
      <span className="body-4 text-muted-foreground truncate">{row.campaignName}</span>
      <span className="body-4 text-muted-foreground truncate">{row.spaceName}</span>
      <span className="body-4 text-foreground truncate">{row.triggerLabel}</span>
      <span className="body-4 text-muted-foreground whitespace-nowrap tabular-nums">
        {actionCount} action{actionCount !== 1 ? 's' : ''}
      </span>
      <span
        className={cn('body-4 truncate', run.error ? 'text-destructive' : 'text-muted-foreground')}
        title={run.error ?? undefined}
      >
        {run.error ?? '\u2014'}
      </span>
      <span className="body-4 text-muted-foreground whitespace-nowrap tabular-nums">
        {new Date(run.created_at).toLocaleString()}
      </span>
    </div>
  )
}
