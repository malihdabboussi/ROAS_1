'use client'

import { useCallback, useRef, useState } from 'react'
import { CANVAS_VIEW_MESSAGES } from '../canvas-view.messages.config'
import {
  applyCampaignCanvasOperations,
  fetchCampaignWhiteboard,
  undoCampaignCanvasOperation,
} from '../services/whiteboard.service'
import type { CampaignWhiteboardResponse, CanvasOperation } from '../types/whiteboard.types'

interface UseCanvasOperationCommitInput {
  campaignId: string
  boardId: string
  onUndoLoaded: (response: CampaignWhiteboardResponse) => void
}

export function useCanvasOperationCommit({
  campaignId,
  boardId,
  onUndoLoaded,
}: UseCanvasOperationCommitInput) {
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const revisionRef = useRef(0)
  const lastOperationIdRef = useRef<string | null>(null)
  const redoOperationIdRef = useRef<string | null>(null)
  const commitQueueRef = useRef(Promise.resolve())

  const acknowledge = useCallback((operationId: string, revision: number) => {
    revisionRef.current = revision
    lastOperationIdRef.current = operationId
    redoOperationIdRef.current = null
    setCanUndo(true)
    setCanRedo(false)
    setError(null)
  }, [])

  const commit = useCallback(
    (operations: CanvasOperation[]) => {
      setSaveState('saving')
      commitQueueRef.current = commitQueueRef.current
        .then(async () => {
          const result = await applyCampaignCanvasOperations(
            campaignId,
            boardId,
            revisionRef.current,
            operations,
          )
          acknowledge(result.operation_id, result.committed_revision)
        })
        .catch(async (cause: unknown) => {
          const conflict =
            cause instanceof Error && cause.message.includes('CANVAS_REVISION_CONFLICT')
          if (!conflict) {
            setError(CANVAS_VIEW_MESSAGES.saveError)
            return
          }
          const latest = await fetchCampaignWhiteboard(campaignId, boardId)
          const result = await applyCampaignCanvasOperations(
            campaignId,
            boardId,
            latest.board.revision,
            operations,
          )
          acknowledge(result.operation_id, result.committed_revision)
        })
        .finally(() => setSaveState('saved'))
    },
    [acknowledge, boardId, campaignId],
  )

  const undo = useCallback(async () => {
    const operationId = lastOperationIdRef.current
    if (!operationId) return
    setSaveState('saving')
    try {
      const result = await undoCampaignCanvasOperation(campaignId, boardId, operationId)
      const response = await fetchCampaignWhiteboard(campaignId, boardId)
      revisionRef.current = response.board.revision
      lastOperationIdRef.current = null
      redoOperationIdRef.current = result.operation_id
      setCanUndo(false)
      setCanRedo(true)
      onUndoLoaded(response)
      setError(null)
    } catch {
      setError(CANVAS_VIEW_MESSAGES.saveError)
    } finally {
      setSaveState('saved')
    }
  }, [boardId, campaignId, onUndoLoaded])

  const redo = useCallback(async () => {
    const operationId = redoOperationIdRef.current
    if (!operationId) return
    setSaveState('saving')
    try {
      const result = await undoCampaignCanvasOperation(campaignId, boardId, operationId)
      const response = await fetchCampaignWhiteboard(campaignId, boardId)
      revisionRef.current = response.board.revision
      lastOperationIdRef.current = result.operation_id
      redoOperationIdRef.current = null
      setCanUndo(true)
      setCanRedo(false)
      onUndoLoaded(response)
      setError(null)
    } catch {
      setError(CANVAS_VIEW_MESSAGES.saveError)
    } finally {
      setSaveState('saved')
    }
  }, [boardId, campaignId, onUndoLoaded])

  return { canRedo, canUndo, commit, error, redo, revisionRef, saveState, setError, undo }
}
