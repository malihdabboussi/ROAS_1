'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { TaskWorkViewContent } from '@/components/work-views'
import { AllTasksNativeList } from '@/components/work-views/AllTasksNativeList'
import { buildSpaceItemHref } from '@/lib/spaces/space-item-href'
import { useTaskRollup, type TaskWorkViewId } from '@/lib/work-views'
import { CAMPAIGN_VIEW_MESSAGES } from '../../_config/campaign-view-messages.config'

interface CampaignTaskTabProps {
  campaignId: string
  view: TaskWorkViewId
}

export function CampaignTaskTab({ campaignId, view }: CampaignTaskTabProps) {
  const router = useRouter()
  const handleLoadError = useCallback(() => {
    toast.error(CAMPAIGN_VIEW_MESSAGES.taskLoadFailed)
  }, [])
  const { items, loading, reload } = useTaskRollup({
    scope: 'all',
    campaignId,
    onError: handleLoadError,
  })

  if (view === 'list') {
    if (loading) {
      return (
        <div className="flex min-h-64 items-center justify-center">
          <VibeyLoadingOrb text="Loading tasks..." state="processing" size="sm" />
        </div>
      )
    }
    return items.length ? (
      <AllTasksNativeList items={items} reload={reload} />
    ) : (
      <p className="surface-card body-3 text-muted-foreground rounded-spacing-3 border-border p-spacing-5 border">
        {CAMPAIGN_VIEW_MESSAGES.emptyTasks}
      </p>
    )
  }

  return (
    <TaskWorkViewContent
      view={view}
      items={items}
      loading={loading}
      emptyMessage={CAMPAIGN_VIEW_MESSAGES.emptyTasks}
      onOpenTask={(task) => router.push(buildSpaceItemHref(task.space_id, task.id))}
    />
  )
}
