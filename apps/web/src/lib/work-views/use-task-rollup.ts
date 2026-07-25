'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchTaskRollup, type TaskRollupItem, type TaskRollupView } from '@/lib/tasks'

interface UseTaskRollupInput {
  scope: TaskRollupView
  programId?: string | null
  campaignId?: string | null
  onError?: () => void
}

export function useTaskRollup({
  scope,
  programId = null,
  campaignId = null,
  onError,
}: UseTaskRollupInput) {
  const [items, setItems] = useState<TaskRollupItem[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setItems(
        await fetchTaskRollup({
          view: scope,
          programId,
          campaignId,
          limit: 200,
        }),
      )
    } catch {
      setItems([])
      onError?.()
    } finally {
      setLoading(false)
    }
  }, [campaignId, onError, programId, scope])

  useEffect(() => {
    void reload()
  }, [reload])

  return { items, loading, reload }
}
