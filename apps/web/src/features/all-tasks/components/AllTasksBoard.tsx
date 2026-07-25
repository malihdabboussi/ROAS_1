'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { TaskWorkViewContent, WorkViewTabs } from '@/components/work-views'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns'
import { fetchPrograms, type Program } from '@/lib/programs'
import { buildSpaceItemHref } from '@/lib/spaces/space-item-href'
import type { TaskRollupItem, TaskRollupView } from '@/lib/tasks'
import { resolveWorkViewFromSearch, useTaskRollup, type TaskWorkViewId } from '@/lib/work-views'
import { ALL_TASKS_TOAST_ERRORS } from '../config/all-tasks-toast-errors.config'

export function AllTasksBoard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [scope, setScope] = useState<TaskRollupView>(
    searchParams.get('scope') === 'all' ? 'all' : 'my',
  )
  const [workView, setWorkView] = useState<TaskWorkViewId>(() =>
    resolveWorkViewFromSearch(
      { view: searchParams.get('view'), tab: searchParams.get('tab') },
      'list',
    ),
  )
  const [programId, setProgramId] = useState(searchParams.get('program') ?? '')
  const [campaignId, setCampaignId] = useState(searchParams.get('campaign') ?? '')
  const [programs, setPrograms] = useState<Program[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  const loadMeta = useCallback(async () => {
    const [programRows, campaignRows] = await Promise.all([
      fetchPrograms().catch(() => [] as Program[]),
      fetchCampaigns().catch(() => [] as Campaign[]),
    ])
    setPrograms(programRows)
    setCampaigns(campaignRows)
  }, [])

  const handleLoadError = useCallback(() => {
    toast.error(ALL_TASKS_TOAST_ERRORS.LOAD_FAILED.userMessage)
  }, [])

  const { items, loading } = useTaskRollup({
    scope,
    programId: programId || null,
    campaignId: campaignId || null,
    onError: handleLoadError,
  })

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    const nextScope = searchParams.get('scope') === 'all' ? 'all' : 'my'
    const nextView = resolveWorkViewFromSearch(
      { view: searchParams.get('view'), tab: searchParams.get('tab') },
      'list',
    )
    setScope(nextScope)
    setWorkView(nextView)
    setProgramId(searchParams.get('program') ?? '')
    setCampaignId(searchParams.get('campaign') ?? '')
  }, [searchParams])

  const updateSearch = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('tab')
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      const query = params.toString()
      router.replace(`/all-tasks${query ? `?${query}` : ''}`, { scroll: false })
    },
    [router, searchParams],
  )

  useEffect(() => {
    if (!searchParams.get('tab') || searchParams.get('view')) return
    updateSearch({ view: workView })
  }, [searchParams, updateSearch, workView])

  const campaignOptions = useMemo(() => {
    if (!programId) return campaigns
    return campaigns.filter((c) => c.program_id === programId)
  }, [campaigns, programId])

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="p-spacing-4 md:p-spacing-6 mx-auto w-full max-w-5xl">
        <div className="mb-spacing-4">
          <h1 className="title-h3 text-foreground">ALL TASKS</h1>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            Roll up open space tasks across campaigns. Your Turn stays the personal inbox.
          </p>
        </div>

        <div className="mb-spacing-4 gap-spacing-2 flex flex-wrap items-center justify-between">
          <WorkViewTabs
            value={workView}
            onChange={(nextView) => {
              setWorkView(nextView)
              updateSearch({ view: nextView })
            }}
          />
          <div className="gap-spacing-1 border-border flex rounded-lg border p-1">
            <button
              type="button"
              onClick={() => {
                setScope('my')
                updateSearch({ scope: '' })
              }}
              className={`body-3 rounded-md px-3 py-1.5 font-medium ${
                scope === 'my'
                  ? 'button-glass-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Tasks
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('all')
                updateSearch({ scope: 'all' })
              }}
              className={`body-3 rounded-md px-3 py-1.5 font-medium ${
                scope === 'all'
                  ? 'button-glass-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Tasks
            </button>
          </div>

          <select
            value={programId}
            onChange={(e) => {
              setProgramId(e.target.value)
              setCampaignId('')
              updateSearch({ program: e.target.value, campaign: '' })
            }}
            className="input-glass body-3 text-foreground rounded-lg px-3 py-2"
            aria-label="Filter by program"
          >
            <option value="">All programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={campaignId}
            onChange={(e) => {
              setCampaignId(e.target.value)
              updateSearch({ campaign: e.target.value })
            }}
            className="input-glass body-3 text-foreground rounded-lg px-3 py-2"
            aria-label="Filter by campaign"
          >
            <option value="">All campaigns</option>
            {campaignOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <TaskWorkViewContent
          view={workView}
          items={items}
          loading={loading}
          emptyMessage={
            scope === 'my'
              ? 'Nothing assigned to you in this scope.'
              : 'No open tasks match these filters.'
          }
          onOpenTask={(item: TaskRollupItem) =>
            router.push(buildSpaceItemHref(item.space_id, item.id))
          }
        />
      </div>
    </div>
  )
}
