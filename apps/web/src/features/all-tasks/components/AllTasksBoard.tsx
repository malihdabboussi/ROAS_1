'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { AllTasksNativeList } from '@/components/work-views/AllTasksNativeList'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns'
import { useClientScope } from '@/lib/client-scope'
import { fetchPrograms, type Program } from '@/lib/programs'
import { updateSpaceItem } from '@/lib/spaces'
import type { TaskRollupItem, TaskRollupView } from '@/lib/tasks'
import { buildTaskReviewPatch } from '@/lib/tasks/task-lifecycle-review'
import { useTaskRollup } from '@/lib/work-views'
import { ALL_TASKS_MESSAGES } from '../config/all-tasks-messages.config'
import { ALL_TASKS_TOAST_ERRORS } from '../config/all-tasks-toast-errors.config'
import { AllTasksScopeFilters } from './AllTasksScopeFilters'

export function AllTasksBoard({
  onOpenItem,
  reloadToken,
}: {
  onOpenItem?: (item: TaskRollupItem) => void
  reloadToken?: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { scope: clientScope } = useClientScope()
  const [scope, setScope] = useState<TaskRollupView>(
    searchParams.get('scope') === 'all' ? 'all' : 'my',
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

  const { items, loading, reload } = useTaskRollup({
    scope,
    programId: programId || null,
    campaignId: (clientScope?.campaignId ?? campaignId) || null,
    onError: handleLoadError,
  })

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    if (!reloadToken) return
    void reload()
  }, [reload, reloadToken])

  useEffect(() => {
    const nextScope = searchParams.get('scope') === 'all' ? 'all' : 'my'
    setScope(nextScope)
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

  const campaignOptions = useMemo(() => {
    if (clientScope?.campaignId) {
      return campaigns.filter((campaign) => campaign.id === clientScope.campaignId)
    }
    if (!programId) return campaigns
    return campaigns.filter((c) => c.program_id === programId)
  }, [campaigns, clientScope?.campaignId, programId])

  return (
    <div className="h-full min-h-0">
      <div className="p-spacing-4 md:p-spacing-6 w-full">
        <h1 className="sr-only">ALL TASKS</h1>

        <div className="mb-spacing-4 gap-spacing-2 flex flex-wrap items-center justify-end">
          <AllTasksScopeFilters
            scope={scope}
            programId={programId}
            campaignId={clientScope?.campaignId ?? campaignId}
            programs={programs.map((program) => ({ id: program.id, name: program.name }))}
            campaigns={campaignOptions.map((campaign) => ({
              id: campaign.id,
              name: campaign.name ?? 'Untitled campaign',
            }))}
            onScopeChange={(nextScope) => {
              setScope(nextScope)
              updateSearch({ scope: nextScope === 'all' ? 'all' : '' })
            }}
            onProgramChange={(nextProgramId) => {
              setProgramId(nextProgramId)
              setCampaignId('')
              updateSearch({ program: nextProgramId, campaign: '' })
            }}
            onCampaignChange={(nextCampaignId) => {
              setCampaignId(nextCampaignId)
              updateSearch({ campaign: nextCampaignId })
            }}
            campaignLocked={Boolean(clientScope)}
          />
        </div>

        {loading ? (
          <ListSkeleton rows={8} label={ALL_TASKS_MESSAGES.LOADING} />
        ) : items.length ? (
          <AllTasksNativeList
            items={items}
            reload={reload}
            onOpenItem={onOpenItem}
            onReviewItem={async (item, decision) => {
              try {
                await updateSpaceItem(item.space_id, item.id, buildTaskReviewPatch(item, decision))
                toast.success(ALL_TASKS_MESSAGES.REVIEW_SAVED)
              } catch {
                toast.error(ALL_TASKS_TOAST_ERRORS.REVIEW_FAILED.userMessage)
              }
            }}
          />
        ) : (
          <div className="surface-card border-border rounded-spacing-3 p-spacing-6 border text-center">
            <p className="body-2 text-foreground font-medium">No open tasks</p>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {scope === 'my'
                ? 'Nothing assigned to you in this scope.'
                : 'No open tasks match these filters.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
