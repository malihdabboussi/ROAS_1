'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  listCheckpoints,
  updateCheckpointSummary,
  type AgentCheckpointListItem,
} from '../services/agent-checkpoints.service'

export function useAgentCheckpoints(agentKey: string, enabled: boolean, refreshSignal = 0) {
  const [checkpoints, setCheckpoints] = useState<AgentCheckpointListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      setCheckpoints(await listCheckpoints(agentKey))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [agentKey, enabled])

  useEffect(() => {
    void reload()
  }, [reload, refreshSignal])

  const rename = useCallback(
    async (checkpointId: string, summary: string) => {
      const previous = checkpoints
      setCheckpoints((items) =>
        items.map((item) =>
          item.id === checkpointId
            ? { ...item, summary, summary_edited_at: new Date().toISOString() }
            : item,
        ),
      )
      try {
        const updated = await updateCheckpointSummary(agentKey, checkpointId, summary)
        setCheckpoints((items) => items.map((item) => (item.id === checkpointId ? updated : item)))
      } catch (err) {
        setCheckpoints(previous)
        throw err
      }
    },
    [agentKey, checkpoints],
  )

  return { checkpoints, loading, error, reload, rename }
}
