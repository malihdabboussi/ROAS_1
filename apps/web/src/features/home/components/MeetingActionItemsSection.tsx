'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AllTasksNativeList } from '@/components/work-views/AllTasksNativeList'
import {
  HOME_TOAST_ERRORS,
  HOME_TOAST_SUCCESS,
} from '@/features/home/config/home-toast-errors.config'
import { meetingActionToTaskRollupItem } from '@/features/home/lib/meeting-action-to-task-rollup'
import {
  createMeetingAction,
  reviewMeetingAction,
  updateMeetingActionStatus,
  type MeetingAction,
} from '@/features/home/services/meeting-workspace-api'
import { updateSpaceItem, type SpaceItem } from '@/lib/spaces'
import type { TaskRollupItem } from '@/lib/tasks'
import { campaignNameFromMappingPath, useSpaceMappingIndex } from '@/lib/work-items'

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
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const mappingIndex = useSpaceMappingIndex(actions.length > 0)
  const mappingEntry = mappingIndex?.get(spaceId)
  const spaceTitle = mappingEntry?.spaceTitle ?? ''
  const campaignName =
    mappingEntry?.campaignName?.trim() || campaignNameFromMappingPath(mappingEntry?.pathLabel)

  const items = useMemo(
    () =>
      actions.map((action) =>
        meetingActionToTaskRollupItem(action, { spaceId, spaceTitle, campaignName }),
      ),
    [actions, campaignName, spaceId, spaceTitle],
  )
  const reviewActions = useMemo(
    () =>
      actions.filter(
        (action) => String(action.action_lifecycle?.review_state ?? '') === 'needs_review',
      ),
    [actions],
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

  const review = async (action: MeetingAction, decision: 'open' | 'done' | 'dismissed') => {
    if (reviewingId) return
    setReviewingId(action.id)
    try {
      await reviewMeetingAction(spaceId, meetingItemId, action.id, decision)
      await onReload()
      toast.success(HOME_TOAST_SUCCESS.MEETING_ACTION_REVIEWED.userMessage)
    } catch {
      toast.error(HOME_TOAST_ERRORS.MEETING_ACTION_UPDATE_FAILED.userMessage)
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <section className="gap-spacing-3 flex w-full min-w-0 flex-col">
      <h2 className="body-3 text-foreground font-semibold">Action items ({actions.length})</h2>
      {reviewActions.length > 0 ? (
        <div className="bg-surface-subtle border-border rounded-spacing-3 p-spacing-3 gap-spacing-3 flex flex-col border">
          <p className="body-3 text-foreground font-semibold">Are these still open?</p>
          {reviewActions.map((action) => (
            <div
              key={action.id}
              className="border-border pb-spacing-3 gap-spacing-2 flex flex-wrap items-center justify-between border-b last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="body-4 text-foreground font-medium">{action.title}</p>
                <p className="typo-caption text-muted-foreground">
                  {action.action_lifecycle?.review_reason === 'overdue'
                    ? 'This action item is overdue.'
                    : 'This action item has not changed in 30 days.'}
                </p>
              </div>
              <div className="gap-spacing-2 flex items-center">
                <button
                  type="button"
                  className="button-compact button-glass-primary"
                  disabled={Boolean(reviewingId)}
                  onClick={() => void review(action, 'open')}
                >
                  Still open
                </button>
                <button
                  type="button"
                  className="button-compact button-glass-neutral"
                  disabled={Boolean(reviewingId)}
                  onClick={() => void review(action, 'done')}
                >
                  Done
                </button>
                <button
                  type="button"
                  className="button-compact button-ghost"
                  disabled={Boolean(reviewingId)}
                  onClick={() => void review(action, 'dismissed')}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {/* The rollup list's columns can outgrow the dialog width — scroll instead of clipping. */}
      <div className="min-w-0 overflow-x-auto">
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
      </div>
    </section>
  )
}
