import { useCallback } from 'react'
import { toast } from 'sonner'
import { DELEGATION_TOAST_MESSAGES } from '../../config/delegation-messages.config'
import {
  createDelegationIntake,
  type DelegationDispatchMode,
} from '../../services/delegation-intake.service'
import type { Space, SpaceItem } from '../../types'

export function useDelegationBulkCapture({
  spaces,
  activeSpace,
  selectedItems,
  closePanel,
  onClearSelection,
  setBusy,
}: {
  spaces: Space[]
  activeSpace: Space | null
  selectedItems: SpaceItem[]
  closePanel: () => void
  onClearSelection: () => void
  setBusy: (busy: boolean) => void
}) {
  return useCallback(
    async (mode: DelegationDispatchMode, note: string) => {
      if (!activeSpace) {
        toast.error(DELEGATION_TOAST_MESSAGES.CAPTURE_FAILED)
        return
      }

      setBusy(true)
      try {
        const result = await createDelegationIntake({
          spaces,
          sourceSpaceId: activeSpace.id,
          sourceSpaceTitle: activeSpace.title,
          selectedItems,
          mode,
          note,
        })
        toast.success(
          result.createdDesk
            ? DELEGATION_TOAST_MESSAGES.CAPTURED_AND_CREATED_DESK(selectedItems.length)
            : DELEGATION_TOAST_MESSAGES.CAPTURED(selectedItems.length),
        )
        onClearSelection()
        closePanel()
      } catch (error) {
        console.error('[delegation-intake] Failed to capture selected work', error)
        toast.error(DELEGATION_TOAST_MESSAGES.CAPTURE_FAILED)
      } finally {
        setBusy(false)
      }
    },
    [activeSpace, closePanel, onClearSelection, selectedItems, setBusy, spaces],
  )
}
