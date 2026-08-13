'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { MEETING_MERGE_MESSAGES } from '../../config/meeting-merge-messages.config'
import { mergeMeetingItems } from '../../services/meeting-merge.service'
import type { SpaceItem } from '../../types'

export function useMergeMeetingsBulk({
  selectedItems,
  closePanel,
  onClearSelection,
  onRefresh,
  setBusy,
}: {
  selectedItems: SpaceItem[]
  closePanel: () => void
  onClearSelection: () => void
  onRefresh: () => Promise<void> | void
  setBusy: (busy: boolean) => void
}) {
  return useCallback(
    async (survivorItemId: string) => {
      const survivor = selectedItems.find((item) => item.id === survivorItemId)
      const duplicateIds = selectedItems
        .filter((item) => item.id !== survivorItemId)
        .map((item) => item.id)
      if (!survivor || duplicateIds.length === 0) return
      closePanel()
      setBusy(true)
      try {
        await mergeMeetingItems(survivor.space_id, {
          survivor_item_id: survivorItemId,
          duplicate_item_ids: duplicateIds,
        })
        toast.success(MEETING_MERGE_MESSAGES.SUCCESS(duplicateIds.length))
        onClearSelection()
        await onRefresh()
      } catch {
        toast.error(MEETING_MERGE_MESSAGES.FAILED)
      } finally {
        setBusy(false)
      }
    },
    [selectedItems, closePanel, onClearSelection, onRefresh, setBusy],
  )
}
