'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { lookupAgentTurnFeedback, saveAgentTurnFeedback } from './agent-feedback-api'
import type {
  AgentTurnFeedbackPayload,
  AgentTurnFeedbackRow,
  AgentTurnFeedbackTag,
  AgentTurnFeedbackTargetKind,
} from './types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isPersistableAgentFeedbackTarget(targetId: string | null | undefined): boolean {
  return typeof targetId === 'string' && UUID_RE.test(targetId)
}

export function useAgentTurnFeedback({
  targetKind,
  targetId,
  sourceSurface,
}: {
  targetKind: AgentTurnFeedbackTargetKind
  targetId: string
  sourceSurface: string
}) {
  const [feedback, setFeedback] = useState<AgentTurnFeedbackRow | null>(null)
  const [pendingSaveCount, setPendingSaveCount] = useState(0)
  const canPersist = isPersistableAgentFeedbackTarget(targetId)
  const targetKey = useMemo(() => `${targetKind}:${targetId}`, [targetKind, targetId])
  const feedbackRef = useRef<AgentTurnFeedbackRow | null>(null)
  const activeTargetKeyRef = useRef(targetKey)
  const latestSaveSeqRef = useRef(0)
  const pendingSaveCountRef = useRef(0)
  const saving = pendingSaveCount > 0

  const setCurrentFeedback = useCallback((next: AgentTurnFeedbackRow | null) => {
    if (feedbackRef.current === next) return
    feedbackRef.current = next
    setFeedback(next)
  }, [])

  const incrementPendingSaves = useCallback(() => {
    pendingSaveCountRef.current += 1
    setPendingSaveCount(pendingSaveCountRef.current)
  }, [])

  const decrementPendingSaves = useCallback(() => {
    pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1)
    setPendingSaveCount(pendingSaveCountRef.current)
  }, [])

  useEffect(() => {
    activeTargetKeyRef.current = targetKey
  }, [targetKey])

  useEffect(() => {
    activeTargetKeyRef.current = targetKey
    if (!canPersist) {
      if (feedbackRef.current !== null) setCurrentFeedback(null)
      return
    }
    let cancelled = false
    const lookupTargetKey = targetKey
    const saveSeqAtLookupStart = latestSaveSeqRef.current
    if (feedbackRef.current !== null) setCurrentFeedback(null)
    lookupAgentTurnFeedback([{ target_kind: targetKind, target_id: targetId }])
      .then((result) => {
        if (cancelled) return
        if (
          activeTargetKeyRef.current !== lookupTargetKey ||
          latestSaveSeqRef.current !== saveSeqAtLookupStart
        ) {
          return
        }
        const existing =
          result.feedback.find(
            (row) => row.target_kind === targetKind && row.target_id === targetId,
          ) ?? null
        if (feedbackRef.current !== existing) setCurrentFeedback(existing)
      })
      .catch(() => {
        if (
          !cancelled &&
          activeTargetKeyRef.current === lookupTargetKey &&
          latestSaveSeqRef.current === saveSeqAtLookupStart
        ) {
          if (feedbackRef.current !== null) setCurrentFeedback(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [canPersist, setCurrentFeedback, targetId, targetKind, targetKey])

  const save = useCallback(
    async (input: {
      thumbs_up: boolean
      tags?: AgentTurnFeedbackTag[]
      feedback_text?: string | null
    }) => {
      if (!canPersist) return null
      const requestTargetKey = targetKey
      const requestSeq = latestSaveSeqRef.current + 1
      latestSaveSeqRef.current = requestSeq
      const previous = feedbackRef.current
      const tags = input.tags !== undefined ? input.tags : (previous?.tags ?? [])
      const feedback_text =
        input.feedback_text !== undefined ? input.feedback_text : (previous?.feedback_text ?? null)
      const optimistic: AgentTurnFeedbackRow = {
        id: previous?.id ?? `optimistic-${targetKey}`,
        target_kind: targetKind,
        target_id: targetId,
        thumbs_up: input.thumbs_up,
        tags,
        feedback_text,
        source_surface: sourceSurface,
      }
      setCurrentFeedback(optimistic)
      incrementPendingSaves()
      try {
        const payload: AgentTurnFeedbackPayload = {
          target_kind: targetKind,
          target_id: targetId,
          thumbs_up: input.thumbs_up,
          tags: optimistic.tags,
          feedback_text: optimistic.feedback_text,
          source_surface: sourceSurface,
        }
        const saved = await saveAgentTurnFeedback(payload)
        if (
          activeTargetKeyRef.current === requestTargetKey &&
          latestSaveSeqRef.current === requestSeq
        ) {
          setCurrentFeedback(saved)
        }
        return saved
      } catch (error) {
        throw error
      } finally {
        decrementPendingSaves()
      }
    },
    [
      canPersist,
      decrementPendingSaves,
      incrementPendingSaves,
      setCurrentFeedback,
      sourceSurface,
      targetId,
      targetKind,
      targetKey,
    ],
  )

  return {
    feedback,
    saving,
    canPersist,
    save,
  }
}
