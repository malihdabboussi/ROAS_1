'use client'

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { CompleteSubtasksConfirmDialog } from '../components/CompleteSubtasksConfirmDialog'
import {
  buildParentAndSubtaskStatusUpdates,
  listOpenSubtasks,
  shouldConfirmCompleteOpenSubtasks,
  type SpaceItemUpdateFn,
  type SpaceItemUpdateOptions,
} from '../lib/complete-open-subtasks-on-status'
import { fetchSubtasks } from '../services/spaces.service'
import type { SpaceItem } from '../types'
import type { FieldDef } from '../types/space-schema'

type PendingStatusConfirm = {
  itemId: string
  payload: Partial<SpaceItem>
  openSubtaskIds: string[]
  resolve: () => void
  reject: (error: Error) => void
}

type UseUpdateItemWithSubtaskCompleteConfirmArgs = {
  updateItem: SpaceItemUpdateFn
  updateItemsBatch: (
    updates: Array<{ itemId: string; payload: Partial<SpaceItem> }>,
  ) => Promise<void>
  items: SpaceItem[]
  statusField: FieldDef | undefined
  spaceId: string | null
  /** When set and equal to `spaceId`, trust store emptiness (no fetch). */
  itemsLoadedForSpaceId?: string | null
}

export function useUpdateItemWithSubtaskCompleteConfirm({
  updateItem,
  updateItemsBatch,
  items,
  statusField,
  spaceId,
  itemsLoadedForSpaceId = null,
}: UseUpdateItemWithSubtaskCompleteConfirmArgs): {
  updateItem: SpaceItemUpdateFn
  dialog: ReactNode
} {
  const [pending, setPending] = useState<PendingStatusConfirm | null>(null)
  const pendingRef = useRef<PendingStatusConfirm | null>(null)

  const resolveOpenSubtasks = useCallback(
    async (parentId: string): Promise<SpaceItem[]> => {
      const fromStore = listOpenSubtasks(items, parentId, statusField)
      const hasAnyChildInStore = items.some((item) => item.parent_item_id === parentId)
      if (hasAnyChildInStore) return fromStore
      if (!spaceId) return fromStore
      if (itemsLoadedForSpaceId === spaceId) return fromStore

      try {
        const fetched = await fetchSubtasks(spaceId, parentId)
        return listOpenSubtasks(fetched, parentId, statusField)
      } catch {
        return fromStore
      }
    },
    [items, itemsLoadedForSpaceId, spaceId, statusField],
  )

  const wrappedUpdateItem = useCallback<SpaceItemUpdateFn>(
    async (itemId, payload, options?: SpaceItemUpdateOptions) => {
      const nextStatus = typeof payload.status === 'string' ? payload.status : undefined
      if (!nextStatus || options?.skipSubtaskCompleteConfirm) {
        await updateItem(itemId, payload)
        return
      }

      const parent = items.find((item) => item.id === itemId)
      const openSubtasks = await resolveOpenSubtasks(itemId)
      if (
        !shouldConfirmCompleteOpenSubtasks({
          parent,
          nextStatus,
          openSubtasks,
          statusField,
          skip: options?.skipSubtaskCompleteConfirm,
        })
      ) {
        await updateItem(itemId, payload)
        return
      }

      await new Promise<void>((resolve, reject) => {
        const nextPending: PendingStatusConfirm = {
          itemId,
          payload,
          openSubtaskIds: openSubtasks.map((sub) => sub.id),
          resolve,
          reject,
        }
        pendingRef.current = nextPending
        setPending(nextPending)
      })
    },
    [items, resolveOpenSubtasks, statusField, updateItem],
  )

  const clearPending = useCallback(() => {
    pendingRef.current = null
    setPending(null)
  }, [])

  const applyChoice = useCallback(
    async (alsoCompleteSubtasks: boolean) => {
      const current = pendingRef.current
      if (!current) return
      const { itemId, payload, openSubtaskIds, resolve, reject } = current
      clearPending()
      try {
        const updates = buildParentAndSubtaskStatusUpdates(
          itemId,
          payload,
          openSubtaskIds,
          alsoCompleteSubtasks,
        )
        if (updates.length === 1) {
          await updateItem(itemId, payload, { skipSubtaskCompleteConfirm: true })
        } else {
          await updateItemsBatch(updates)
        }
        resolve()
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to update status'))
      }
    },
    [clearPending, updateItem, updateItemsBatch],
  )

  const handleCancel = useCallback(() => {
    const current = pendingRef.current
    if (!current) return
    clearPending()
    // Resolve without writing — callers that optimistically flipped status should
    // defer status optimism until this promise settles (see TaskDetailModal).
    current.resolve()
  }, [clearPending])

  const dialog = useMemo(
    () => (
      <CompleteSubtasksConfirmDialog
        open={pending != null}
        openCount={pending?.openSubtaskIds.length ?? 0}
        onYes={() => void applyChoice(true)}
        onNo={() => void applyChoice(false)}
        onCancel={handleCancel}
      />
    ),
    [applyChoice, handleCancel, pending],
  )

  return { updateItem: wrappedUpdateItem, dialog }
}
