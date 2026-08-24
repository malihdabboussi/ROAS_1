import { useCallback, useEffect, useMemo } from 'react'
import {
  createAgencyTaskComment,
  fetchAgencyTaskDetail,
  updateAgencyWorkspaceEntity,
} from '@/lib/agency-clients/agency-clients-api'
import type { TeamRosterEntry } from '@/lib/team'
import { updateSpaceItem } from '../../services/spaces.service'
import type { SpaceItem } from '../../types'

export function readPageGraderTaskMirror(
  item: SpaceItem | null,
): { clientId: string; taskId: string } | null {
  const custom = item?.custom_data
  if (!custom || typeof custom !== 'object' || Array.isArray(custom)) return null
  const clientId =
    typeof custom.page_grader_client_id === 'string' ? custom.page_grader_client_id.trim() : ''
  const taskId =
    typeof custom.page_grader_work_id === 'string' ? custom.page_grader_work_id.trim() : ''
  return clientId && taskId ? { clientId, taskId } : null
}

export function pageGraderTaskStatus(status: string | null): string {
  if (status === 'done') return 'complete / live'
  if (status === 'in_progress') return 'in progress / builder'
  if (status === 'in_review') return 'review'
  if (status === 'archived') return 'closed'
  return 'to do'
}

export function usePageGraderTaskSync({
  selectedItem,
  roster,
  refresh,
}: {
  selectedItem: SpaceItem | null
  roster: TeamRosterEntry[]
  refresh: () => Promise<unknown>
}) {
  const mirror = useMemo(() => readPageGraderTaskMirror(selectedItem), [selectedItem])

  useEffect(() => {
    if (!selectedItem || !mirror) return
    let cancelled = false
    void fetchAgencyTaskDetail(mirror.clientId, mirror.taskId, selectedItem.id)
      .then(() => {
        if (!cancelled) void refresh()
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [mirror?.clientId, mirror?.taskId, refresh, selectedItem?.id])

  const onUpdateItem = useCallback(
    async (task: SpaceItem, patch: Partial<SpaceItem>) => {
      const target = readPageGraderTaskMirror(task)
      if (!target) {
        await updateSpaceItem(task.space_id, task.id, patch)
        return
      }
      const portalPatch: Record<string, unknown> = {}
      if (typeof patch.title === 'string') portalPatch.task_description = patch.title
      if (patch.description !== undefined) portalPatch.notes = patch.description
      if (patch.notes !== undefined) portalPatch.blocked_reason = patch.notes
      if (patch.priority !== undefined) portalPatch.priority = patch.priority
      if (patch.due_date !== undefined) portalPatch.due_date = patch.due_date
      if (patch.status !== undefined) portalPatch.status = pageGraderTaskStatus(patch.status)
      if (patch.assignee_id !== undefined) {
        portalPatch.assignee_id = patch.assignee_id
        portalPatch.assignee_name =
          roster.find((entry) => entry.kind === 'human' && entry.user_id === patch.assignee_id)
            ?.display_name ?? null
      }
      if (Object.keys(portalPatch).length > 0) {
        await updateAgencyWorkspaceEntity(target.clientId, {
          kind: 'task',
          entity_id: target.taskId,
          patch: portalPatch,
        })
      }
      await updateSpaceItem(task.space_id, task.id, patch)
    },
    [roster],
  )

  const externalTaskMirror =
    mirror && selectedItem
      ? {
          onSendComment: async ({
            content,
            authorName,
          }: {
            content: string
            authorName: string
          }) => {
            await createAgencyTaskComment(mirror.clientId, mirror.taskId, {
              body: content,
              author_name: authorName,
              space_item_id: selectedItem.id,
            })
          },
        }
      : undefined

  return { mirror, onUpdateItem, externalTaskMirror }
}
