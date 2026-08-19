'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AllTasksNativeList } from '@/components/work-views/AllTasksNativeList'
import {
  HOME_TOAST_ERRORS,
  HOME_TOAST_SUCCESS,
} from '@/features/home/config/home-toast-errors.config'
import {
  campaignNameFromMappingPath,
  meetingActionToTaskRollupItem,
} from '@/features/home/lib/meeting-action-to-task-rollup'
import {
  createMeetingAction,
  updateMeetingActionStatus,
  type MeetingAction,
} from '@/features/home/services/meeting-workspace-api'
import { updateSpaceItem, type SpaceItem } from '@/lib/spaces'
import type { TaskRollupItem } from '@/lib/tasks'
import { useSpaceMappingIndex } from '@/lib/work-items'

const DONE_STATUSES = new Set(['done', 'complete', 'completed', 'resolved'])

function isFollowUpAction(action: MeetingAction): boolean {
  return String(action.evidence?.origin ?? '') === 'meetings_space_follow_up'
}

function normalizedTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function MeetingActionItemsSection({
  spaceId,
  meetingItemId,
  actions,
  loading,
  onCreated,
  onReload,
}: {
  spaceId: string
  meetingItemId: string
  actions: MeetingAction[]
  loading: boolean
  onCreated: (action: MeetingAction) => void
  onReload: () => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const mappingIndex = useSpaceMappingIndex(actions.length > 0)
  const mappingEntry = mappingIndex?.get(spaceId)
  const spaceTitle = mappingEntry?.spaceTitle ?? ''
  const campaignName = campaignNameFromMappingPath(mappingEntry?.pathLabel)

  const items = useMemo(
    () =>
      actions.map((action) =>
        meetingActionToTaskRollupItem(action, { spaceId, spaceTitle, campaignName }),
      ),
    [actions, campaignName, spaceId, spaceTitle],
  )

  const submit = async (title: string) => {
    const nextTitle = title.trim()
    if (!nextTitle || saving || loading) return
    const existingMatch = actions.find(
      (action) => normalizedTitle(action.title) === normalizedTitle(nextTitle),
    )
    if (existingMatch) {
      toast.success(HOME_TOAST_SUCCESS.MEETING_ACTION_ALREADY_EXISTS.userMessage)
      return
    }
    setSaving(true)
    try {
      const created = await createMeetingAction(spaceId, meetingItemId, { title: nextTitle })
      const alreadyListed = actions.some((action) => action.id === created.id)
      if (alreadyListed) {
        toast.success(HOME_TOAST_SUCCESS.MEETING_ACTION_ALREADY_EXISTS.userMessage)
      } else {
        onCreated(created)
        toast.success(HOME_TOAST_SUCCESS.MEETING_ACTION_CREATED.userMessage)
      }
    } catch {
      toast.error(HOME_TOAST_ERRORS.MEETING_ACTION_CREATE_FAILED.userMessage)
    } finally {
      setSaving(false)
    }
  }

  const persistItem = async (item: TaskRollupItem, payload: Partial<SpaceItem>) => {
    try {
      const action = actions.find((row) => row.id === item.id)
      if (action && !isFollowUpAction(action) && payload.status) {
        const resolved = DONE_STATUSES.has(String(payload.status).trim().toLowerCase())
        await updateMeetingActionStatus(
          spaceId,
          meetingItemId,
          item.id,
          resolved ? 'resolved' : 'confirmed',
        )
        return
      }
      await updateSpaceItem(item.space_id, item.id, payload)
    } catch (error) {
      toast.error(HOME_TOAST_ERRORS.MEETING_ACTION_UPDATE_FAILED.userMessage)
      throw error
    }
  }

  return (
    <section className="gap-spacing-3 flex w-full min-w-0 flex-col">
      <h2 className="body-3 text-foreground font-semibold">Action items ({actions.length})</h2>
      <AllTasksNativeList
        items={items}
        reload={onReload}
        onAddItem={submit}
        persistItem={persistItem}
        onOpenItem={(item) => {
          window.dispatchEvent(
            new CustomEvent('vibey-open-artifact', {
              detail: {
                artifactType: 'task',
                artifactId: item.id,
                spaceId: item.space_id,
                name: item.title,
              },
            }),
          )
        }}
      />
    </section>
  )
}
