'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CampaignCanvasView, CANVAS_VIEW_MESSAGES } from '@/components/canvas'
import { ShellBreadcrumb } from '@/components/shell/ShellBreadcrumb'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { HierarchyViewBar, TaskWorkViewContent } from '@/components/work-views'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns'
import { fetchProgram, programDisplayName, updateProgram, type Program } from '@/lib/programs'
import { buildSpaceItemHref } from '@/lib/spaces/space-item-href'
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

  const taskView =
    activeView === 'overview' || activeView === 'canvas' ? 'list' : (activeView as TaskWorkViewId)
  const displayName = programDisplayName(program)

  return (
    <main
      className={
        activeView === 'canvas'
          ? 'flex h-full min-h-0 flex-col overflow-hidden'
          : 'scrollbar-hide h-full min-h-0 overflow-y-auto'
      }
    >
      <ShellBreadcrumb label={`Programs / ${displayName}`}>
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center overflow-hidden">
          <span className="text-foreground body-3 truncate font-medium">
            Programs / {displayName}
          </span>
        </nav>
      </ShellBreadcrumb>
      <div
        className={
          activeView === 'canvas'
            ? 'p-spacing-4 md:p-spacing-6 flex min-h-0 w-full flex-1 flex-col'
            : 'p-spacing-4 md:p-spacing-6 mx-auto w-full max-w-5xl'
        }
      >
        <header className="px-spacing-4 pb-spacing-3 gap-spacing-4 flex flex-wrap items-start justify-between">
          <div>
            <h1 className="title-h3 text-foreground">{displayName.toUpperCase()}</h1>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {program.system_kind === 'clients'
                ? 'ROAS campaigns and Spaces grouped for agency work. Agency clients themselves live in Clients.'
                : 'Campaigns, spaces, and work across this Program.'}
            </p>
          </div>
        </header>

        <div className="mb-spacing-4">
          <HierarchyViewBar
            tabs={visibleViews.map((viewId) => ({
              id: viewId,
              label: WORK_VIEW_LABELS[viewId],
              icon:
                viewId === 'overview'
                  ? 'layout-grid'
                  : viewId === 'board'
                    ? 'columns-3'
                    : viewId === 'calendar'
                      ? 'calendar-days'
                      : viewId === 'canvas'
                        ? 'panels-top-left'
                        : 'list',
            }))}
            activeViewId={activeView}
            onSelectView={(viewId) => changeView(viewId as ProgramWorkViewId)}
            rightSlot={
              <ProgramViewSettingsMenu
                visibleViews={visibleViews}
                onChange={(views) => void saveVisibleViews(views)}
              />
            }
          />
        </div>

        {activeView === 'overview' ? (
          <CampaignsHub focusProgramId={id} embedded />
        ) : activeView === 'canvas' ? (
          <div className="flex min-h-0 flex-1 flex-col">
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
            <CampaignCanvasView
              campaignId={campaignId || null}
              emptyMessage={
                campaigns.length === 0
                  ? CANVAS_VIEW_MESSAGES.programEmpty
                  : CANVAS_VIEW_MESSAGES.programCampaignRequired
              }
            />
          </div>
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
