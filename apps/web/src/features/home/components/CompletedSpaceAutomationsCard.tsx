'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Zap } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  AutomationsTeamActivityToggle,
  useAutomationsTeamActivity,
} from '@/features/home/components/AutomationsTeamActivityToggle'
import { CompletedAutomationsEmptyIllustration } from '@/features/home/components/HomeEmptyIllustrations'
import { backendOptionsForHomeFeed } from '@/features/home/types/home-feed-scope'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { runStatusPresentation } from '@/features/spaces/lib/automation-run-presentations'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import {
  fetchRecentCompletedAutomationRuns,
  type RecentCompletedAutomationRun,
} from '@/features/spaces/services/automations.service'
import { cn } from '@/lib/utils/cn'

const INITIAL_ROWS = 10
const LOAD_MORE_ROWS = 10

const HOME_COMPLETED_RUNS_GRID =
  'grid grid-cols-[minmax(0,76px)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,108px)] gap-2'

const HOME_RUNS_HEADER_CLASS =
  'border-border bg-background sticky top-0 z-[1] items-center border-b text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]'

function runHref(run: RecentCompletedAutomationRun): string {
  const params = new URLSearchParams()
  params.set('space', run.space_id)
  if (run.item_id) params.set('item', run.item_id)
  return `/spaces?${params.toString()}`
}

export function CompletedSpaceAutomationsCard() {
  const router = useRouter()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const { teamActivity, toggleTeamActivity } = useAutomationsTeamActivity()
  const [loading, setLoading] = useState(true)
  const [runs, setRuns] = useState<RecentCompletedAutomationRun[]>([])
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchRecentCompletedAutomationRuns({
        limit: 100,
        feedScope: 'workspace',
        mineOnly: !teamActivity,
        backend: backendOptionsForHomeFeed('workspace', activeOrgId),
      })
      setRuns(list)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, teamActivity])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    setVisibleCount(INITIAL_ROWS)
  }, [runs])

  const visibleRows = useMemo(() => runs.slice(0, visibleCount), [runs, visibleCount])

  const handleSeeMore = useCallback(() => {
    setVisibleCount((n) => n + LOAD_MORE_ROWS)
  }, [])

  const hasMore = runs.length > visibleCount

  const openRun = useCallback(
    (run: RecentCompletedAutomationRun) => {
      router.push(runHref(run))
    },
    [router],
  )

  return (
    <div className="group/home-feed-head section-card card-elevated flex h-[420px] min-w-0 flex-col overflow-hidden">
      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Zap className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
          <span className="body-2 text-foreground font-medium">{FLOWS_UI.completedCard}</span>
        </div>
        <AutomationsTeamActivityToggle active={teamActivity} onToggle={toggleTeamActivity} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <VibeyLoadingOrb state="processing" size="sm" />
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8">
            <CompletedAutomationsEmptyIllustration />
            <p className="body-3 text-muted-foreground max-w-[240px] text-center">
              {FLOWS_UI.completedEmpty}
            </p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className={cn(HOME_COMPLETED_RUNS_GRID, HOME_RUNS_HEADER_CLASS, 'px-3 py-2')}>
                <span>Status</span>
                <span>Flow</span>
                <span>Space</span>
                <span>Ran at</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {visibleRows.map((run) => {
                  const status = runStatusPresentation(run.status)
                  const flowName = run.automation_name?.trim() || FLOWS_UI.fallbackRunName
                  const spaceLabel = run.space_title?.trim() || 'Space'

                  return (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => openRun(run)}
                      className={cn(
                        HOME_COMPLETED_RUNS_GRID,
                        'hover:bg-hover-subtle body-4 w-full items-center px-3 py-2 text-left transition-colors',
                      )}
                    >
                      <span className={cn('truncate font-medium', status.textClassName)}>
                        {status.label}
                      </span>
                      <span className="text-foreground truncate font-medium">{flowName}</span>
                      <span className="text-foreground truncate">{spaceLabel}</span>
                      <span className="text-muted-foreground truncate tabular-nums">
                        {new Date(run.created_at).toLocaleString()}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            {hasMore ? (
              <div className="border-border shrink-0 border-t px-3 py-1.5">
                <button
                  type="button"
                  onClick={handleSeeMore}
                  className="body-4 text-muted-foreground hover:text-foreground w-full rounded-md py-1 text-center font-medium transition-colors"
                >
                  See more
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
