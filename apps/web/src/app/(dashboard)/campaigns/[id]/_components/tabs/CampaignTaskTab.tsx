'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { TaskWorkViewContent } from '@/components/work-views'
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
  const { items, loading } = useTaskRollup({
    scope: 'all',
    campaignId,
    onError: handleLoadError,
  })

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
