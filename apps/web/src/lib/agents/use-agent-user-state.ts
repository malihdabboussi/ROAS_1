'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { useOrgStore } from '@/lib/org'
import {
  fetchAgentUserState,
  updateAgentUserState,
  type AgentUserState,
  type MissionAgent,
} from './mission-agents-api'

const AGENT_USER_STATE_CACHE_KEY = 'agents:user-state'
const AGENT_USER_STATE_CACHE_TTL_MS = 60_000

export function useAgentUserState() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [userState, setUserState] = useState<AgentUserState[]>([])

  const reload = useCallback(() => {
    return cachedFetch(AGENT_USER_STATE_CACHE_KEY, fetchAgentUserState, {
      ttlMs: AGENT_USER_STATE_CACHE_TTL_MS,
    })
      .then((rows) => {
        setUserState(rows)
        return rows
      })
      .catch(() => {
        setUserState([])
        return [] as AgentUserState[]
      })
  }, [])

  useEffect(() => {
    void reload()
  }, [reload, activeOrgId])

  const favoriteIds = useMemo(
    () => new Set(userState.filter((s) => s.is_favorite).map((s) => s.agent_id)),
    [userState],
  )

  const patchState = useCallback((agentId: string, patch: { is_favorite?: boolean }) => {
    setUserState((prev) => {
      const existing = prev.find((s) => s.agent_id === agentId)
      if (existing) {
        return prev.map((s) => (s.agent_id === agentId ? { ...s, ...patch } : s))
      }
      return [
        ...prev,
        {
          agent_id: agentId,
          is_favorite: patch.is_favorite ?? false,
          updated_at: new Date().toISOString(),
        },
      ]
    })
  }, [])

  const toggleFavorite = useCallback(
    async (agent: MissionAgent) => {
      const next = !favoriteIds.has(agent.id)
      patchState(agent.id, { is_favorite: next })
      try {
        await updateAgentUserState(agent.agent_key, { is_favorite: next })
        invalidateCachedFetch(AGENT_USER_STATE_CACHE_KEY)
      } catch {
        patchState(agent.id, { is_favorite: !next })
        toast.error('Failed to update favorite')
      }
    },
    [favoriteIds, patchState],
  )

  return { favoriteIds, toggleFavorite, reload }
}
