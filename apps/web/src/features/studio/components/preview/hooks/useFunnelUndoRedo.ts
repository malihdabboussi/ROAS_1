'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FUNNEL_HISTORY_MESSAGES } from '@/features/studio/config/funnel-history.messages.config'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  fetchFunnelHistory,
  fetchFunnelHistoryState,
  redoFunnelChange,
  restoreFunnelVersion,
  undoFunnelChange,
  type FunnelHistoryEntry,
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
  const [entries, setEntries] = useState<FunnelHistoryEntry[]>([])
  const [currentChangeSetId, setCurrentChangeSetId] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [restoringChangeSetId, setRestoringChangeSetId] = useState<string | null>(null)

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

  const loadHistory = useCallback(async () => {
    if (!funnelId) {
      setEntries([])
      setCurrentChangeSetId(null)
      return
    }
    setHistoryLoading(true)
    try {
      const timeline = await fetchFunnelHistory(funnelId, funnelPageId ?? null)
      setEntries(timeline.entries)
      setCurrentChangeSetId(timeline.current_change_set_id)
    } catch (err) {
      console.error('Failed to load funnel history:', err)
      toast.error(STUDIO_INLINE_ERRORS.FUNNEL_HISTORY_LOAD)
    } finally {
      setHistoryLoading(false)
    }
  }, [funnelId, funnelPageId])

  useEffect(() => {
    void refreshState().catch(() => {
      setCanUndo(false)
      setCanRedo(false)
    })
  }, [pageUpdatedAt, refreshState])

  useEffect(() => {
    setEntries([])
    setCurrentChangeSetId(null)
  }, [funnelId, funnelPageId])

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

  const restore = useCallback(
    async (changeSetId: string) => {
      if (!funnelId || pendingAction || restoringChangeSetId) return
      setRestoringChangeSetId(changeSetId)
      try {
        const result = await restoreFunnelVersion(funnelId, changeSetId, funnelPageId ?? null)
        applyState(result)
        if (result.changed) {
          await onRestored?.()
          toast.success(FUNNEL_HISTORY_MESSAGES.RESTORE_SUCCESS)
        }
        await Promise.all([refreshState(), loadHistory()])
      } catch (err) {
        console.error('Failed to restore funnel version:', err)
        toast.error(STUDIO_INLINE_ERRORS.FUNNEL_HISTORY_RESTORE)
      } finally {
        setRestoringChangeSetId(null)
      }
    },
    [
      applyState,
      funnelId,
      funnelPageId,
      loadHistory,
      onRestored,
      pendingAction,
      refreshState,
      restoringChangeSetId,
    ],
  )

  return {
    canUndo,
    canRedo,
    isLoading: pendingAction !== null || restoringChangeSetId !== null,
    pendingAction,
    entries,
    currentChangeSetId,
    historyLoading,
    restoringChangeSetId,
    refreshState,
    loadHistory,
    restore,
    undo: () => requestHistory('undo'),
    redo: () => requestHistory('redo'),
    requestHistory,
  }
}
