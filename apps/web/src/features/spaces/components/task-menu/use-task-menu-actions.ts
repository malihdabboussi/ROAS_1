'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { buildSpaceItemHref } from '@/lib/spaces/space-item-href'
import { openInNewTab as openAppInNewTab } from '@/lib/utils/open-in-new-tab'
import { transferSpaceItem, type DuplicateSpaceItemInclude } from '../../services/spaces.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { SpaceItem } from '../../types'
import { useSpaceItemUpdate } from '../SpaceStatusCascadeConfirmProvider'

export interface UseTaskMenuActionsArgs {
  task: SpaceItem
  /** Re-fetch / re-render after a mutation. */
  onChanged?: () => void
  /** Open the full task detail modal. */
  onOpenDetail?: () => void
  /** Trigger the row's "add subtask" composer. */
  onAddSubtask?: () => void
  /** Confirm + delete (caller may show a confirm modal). */
  onDelete?: () => void
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    /* fallthrough */
  }
  return false
}

export function useTaskMenuActions({
  task,
  onChanged,
  onOpenDetail,
  onAddSubtask,
  onDelete,
}: UseTaskMenuActionsArgs) {
  const updateItem = useSpaceItemUpdate()
  const duplicateItem = useSpacesStore((s) => s.duplicateItem)

  const copyLink = useCallback(async () => {
    const ok = await copyToClipboard(buildSpaceItemHref(task.space_id, task.id))
    if (ok) toast.success('Task link copied')
    else toast.error('Could not copy link')
  }, [task.space_id, task.id])

  const copyId = useCallback(async () => {
    const ok = await copyToClipboard(task.id)
    if (ok) toast.success('Task ID copied')
    else toast.error('Could not copy ID')
  }, [task.id])

  const openInNewTab = useCallback(() => {
    if (typeof window === 'undefined') return
    openAppInNewTab(buildSpaceItemHref(task.space_id, task.id))
  }, [task.space_id, task.id])

  const openDetail = useCallback(() => {
    onOpenDetail?.()
  }, [onOpenDetail])

  const addSubtask = useCallback(() => {
    onAddSubtask?.()
  }, [onAddSubtask])

  const isDone = task.status === 'done' || task.status === 'archived'

  const toggleDone = useCallback(async () => {
    try {
      await updateItem(task.id, { status: isDone ? 'todo' : 'done' })
      onChanged?.()
    } catch {
      toast.error('Failed to update status')
    }
  }, [updateItem, task.id, isDone, onChanged])

  const duplicate = useCallback(
    async (input: { include: DuplicateSpaceItemInclude; title: string }) => {
      try {
        const newItem = await duplicateItem(task.space_id, task.id, {
          include: input.include,
          title: input.title,
        })
        if (newItem) {
          toast.success('Task duplicated')
          onChanged?.()
        }
      } catch {
        toast.error('Failed to duplicate task')
      }
    },
    [duplicateItem, task.space_id, task.id, onChanged],
  )

  const moveToSpace = useCallback(
    async (targetSpaceId: string) => {
      try {
        await transferSpaceItem(task.space_id, task.id, {
          target_space_id: targetSpaceId,
          mode: 'move',
        })
        toast.success('Task moved')
        onChanged?.()
      } catch {
        toast.error('Failed to move task')
      }
    },
    [task.space_id, task.id, onChanged],
  )

  const copyToSpace = useCallback(
    async (targetSpaceId: string) => {
      try {
        await transferSpaceItem(task.space_id, task.id, {
          target_space_id: targetSpaceId,
          mode: 'copy',
        })
        toast.success('Task copied')
        onChanged?.()
      } catch {
        toast.error('Failed to copy task')
      }
    },
    [task.space_id, task.id, onChanged],
  )

  const deleteTask = useCallback(() => {
    onDelete?.()
  }, [onDelete])

  return {
    isDone,
    copyLink,
    copyId,
    openInNewTab,
    openDetail,
    addSubtask,
    toggleDone,
    duplicate,
    moveToSpace,
    copyToSpace,
    deleteTask,
  }
}
