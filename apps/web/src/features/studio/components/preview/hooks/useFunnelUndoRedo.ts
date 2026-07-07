'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  fetchFunnelHistoryState,
  redoFunnelChange,
  undoFunnelChange,
} from '@/features/studio/services/funnel-history.service'

type Direction = 'undo' | 'redo'

interface UseFunnelUndoRedoInput {
  funnelId?: string | null
  funnelPageId?: string | null
  pageUpdatedAt?: string | null
  onRestored?: () => Promise<void> | void
}

export function useFunnelUndoRedo({
  funnelId,
  funnelPageId,
  pageUpdatedAt,
  onRestored,
}: UseFunnelUndoRedoInput) {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [pendingAction, setPendingAction] = useState<Direction | null>(null)

  const applyState = useCallback((state: { can_undo: boolean; can_redo: boolean }) => {
    setCanUndo(Boolean(state.can_undo))
    setCanRedo(Boolean(state.can_redo))
  }, [])

  const refreshState = useCallback(async () => {
    if (!funnelId) {
      setCanUndo(false)
      setCanRedo(false)
      return
    }
    const state = await fetchFunnelHistoryState(funnelId, funnelPageId ?? null)
    applyState(state)
  }, [applyState, funnelId, funnelPageId])

  useEffect(() => {
    void refreshState().catch(() => {
      setCanUndo(false)
      setCanRedo(false)
    })
  }, [pageUpdatedAt, refreshState])

  const requestHistory = useCallback(
    async (direction: Direction) => {
      if (!funnelId || pendingAction) return
      setPendingAction(direction)
      try {
        const result =
          direction === 'undo'
            ? await undoFunnelChange(funnelId, funnelPageId ?? null)
            : await redoFunnelChange(funnelId, funnelPageId ?? null)
        applyState(result)
        if (result.changed) await onRestored?.()
        await refreshState()
      } catch (err) {
        console.error(`Failed to ${direction} funnel change:`, err)
        toast.error(
          direction === 'undo'
            ? STUDIO_INLINE_ERRORS.FUNNEL_UNDO
            : STUDIO_INLINE_ERRORS.FUNNEL_REDO,
        )
      } finally {
        setPendingAction(null)
      }
    },
    [applyState, funnelId, funnelPageId, onRestored, pendingAction, refreshState],
  )

  return {
    canUndo,
    canRedo,
    isLoading: pendingAction !== null,
    pendingAction,
    refreshState,
    undo: () => requestHistory('undo'),
    redo: () => requestHistory('redo'),
    requestHistory,
  }
}
