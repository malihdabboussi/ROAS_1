'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { TaskWorkViewContent, WorkViewTabs } from '@/components/work-views'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns'
import { fetchProgram, updateProgram, type Program } from '@/lib/programs'
import { buildSpaceItemHref } from '@/lib/spaces/space-item-href'
import { cn } from '@/lib/utils/cn'
import {
  normalizeProgramWorkViewId,
  readVisibleProgramWorkViews,
  useTaskRollup,
  WORK_VIEW_LABELS,
  type ProgramWorkViewId,
  type TaskWorkViewId,
} from '@/lib/work-views'
import { PROGRAM_VIEW_MESSAGES } from '../_config/program-view-messages.config'
import { CampaignsHub } from '../../../campaigns/_components/CampaignsHub'
import { ProgramCampaignFilter } from './ProgramCampaignFilter'
import { ProgramViewSettingsMenu } from './ProgramViewSettingsMenu'

export function ProgramWorkspace() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [program, setProgram] = useState<Program | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [campaignId, setCampaignId] = useState(searchParams.get('campaign') ?? '')
  const [activeView, setActiveView] = useState<ProgramWorkViewId>(
    normalizeProgramWorkViewId(searchParams.get('view') ?? searchParams.get('tab') ?? '') ??
      'overview',
  )
  const visibleViews = useMemo(
    () => readVisibleProgramWorkViews(program?.config),
    [program?.config],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([fetchProgram(id), fetchCampaigns()])
      .then(([programRow, campaignRows]) => {
        if (!active) return
        setProgram(programRow)
        setCampaigns(campaignRows.filter((campaign) => campaign.program_id === id))
      })
      .catch(() => {
        if (active) setProgram(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    const requested =
      normalizeProgramWorkViewId(searchParams.get('view') ?? searchParams.get('tab') ?? '') ??
      'overview'
    setActiveView(visibleViews.includes(requested) ? requested : 'overview')
    setCampaignId(searchParams.get('campaign') ?? '')
  }, [searchParams, visibleViews])

  const handleTaskError = useCallback(() => {
    toast.error(PROGRAM_VIEW_MESSAGES.taskLoadFailed)
  }, [])
  const { items, loading: loadingTasks } = useTaskRollup({
    scope: 'all',
    programId: id,
    campaignId: campaignId || null,
    onError: handleTaskError,
  })

  const updateSearch = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('tab')
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      const query = params.toString()
      router.replace(`/programs/${id}${query ? `?${query}` : ''}`, { scroll: false })
    },
    [id, router, searchParams],
  )

  const changeView = useCallback(
    (viewId: ProgramWorkViewId) => {
      setActiveView(viewId)
      updateSearch({ view: viewId === 'overview' ? '' : viewId })
    },
    [updateSearch],
  )

  useEffect(() => {
    if (!searchParams.get('tab') || searchParams.get('view')) return
    changeView(activeView)
  }, [activeView, changeView, searchParams])

  const saveVisibleViews = useCallback(
    async (nextViews: ProgramWorkViewId[]) => {
      if (!program) return
      const previous = program
      setProgram({
        ...program,
        config: { ...program.config, visible_program_views: nextViews },
      })
      try {
        const updated = await updateProgram(program.id, {
          config: { visible_program_views: nextViews },
        })
        setProgram(updated)
        if (!nextViews.includes(activeView)) changeView('overview')
      } catch {
        setProgram(previous)
        toast.error(PROGRAM_VIEW_MESSAGES.viewSaveFailed)
      }
    },
    [activeView, changeView, program],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text={PROGRAM_VIEW_MESSAGES.loading} state="processing" size="lg" />
      </div>
    )
  }
  if (!program) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        {PROGRAM_VIEW_MESSAGES.notFound}
      </div>
    )
  }

  const taskView = activeView === 'overview' ? 'list' : (activeView as TaskWorkViewId)

  return (
    <main className="scrollbar-hide h-full min-h-0 overflow-y-auto">
      <div className="p-spacing-4 md:p-spacing-6 mx-auto w-full max-w-5xl">
        <header className="mb-spacing-5 gap-spacing-4 flex flex-wrap items-start justify-between">
          <div>
            <h1 className="title-h3 text-foreground">{program.name.toUpperCase()}</h1>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Campaigns, spaces, and work across this Program.
            </p>
          </div>
          <ProgramViewSettingsMenu
            visibleViews={visibleViews}
            onChange={(views) => void saveVisibleViews(views)}
          />
        </header>

        <nav className="mb-spacing-4 gap-spacing-2 flex flex-wrap items-center">
          {visibleViews.includes('overview') ? (
            <button
              type="button"
              onClick={() => changeView('overview')}
              className={cn(
                'button-compact',
                activeView === 'overview'
                  ? 'button-glass-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutGrid className="icon-sm" />
              {WORK_VIEW_LABELS.overview}
            </button>
          ) : null}
          {activeView !== 'overview' ? (
            <WorkViewTabs
              value={taskView}
              views={visibleViews.filter(
                (viewId): viewId is TaskWorkViewId => viewId !== 'overview',
              )}
              onChange={(view) => changeView(view)}
            />
          ) : (
            <div className="gap-spacing-1 flex">
              {visibleViews
                .filter((viewId): viewId is TaskWorkViewId => viewId !== 'overview')
                .map((viewId) => (
                  <button
                    key={viewId}
                    type="button"
                    onClick={() => changeView(viewId)}
                    className="button-compact text-muted-foreground hover:text-foreground"
                  >
                    {WORK_VIEW_LABELS[viewId]}
                  </button>
                ))}
            </div>
          )}
        </nav>

        {activeView === 'overview' ? (
          <CampaignsHub focusProgramId={id} embedded />
        ) : (
          <>
            <div className="mb-spacing-4 flex justify-end">
              <ProgramCampaignFilter
                campaignId={campaignId}
                campaigns={campaigns}
                onChange={(nextCampaignId) => {
                  setCampaignId(nextCampaignId)
                  updateSearch({ campaign: nextCampaignId })
                }}
              />
            </div>
            <TaskWorkViewContent
              view={taskView}
              items={items}
              loading={loadingTasks}
              emptyMessage={PROGRAM_VIEW_MESSAGES.emptyTasks}
              onOpenTask={(task) => router.push(buildSpaceItemHref(task.space_id, task.id))}
            />
          </>
        )}
      </div>
    </main>
  )
}
