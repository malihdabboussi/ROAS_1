'use client'

import { createCachedResource } from '@/lib/cache/cached-resource'
import { fetchMissionAgentsSlim, type MissionAgentSidebar } from './mission-agents-api'

/**
 * Stale-while-revalidate cache for the workspace agent roster.
 * Used by sidebar menus that re-mount frequently and don't want to refetch
 * on every open. TTL kept generous (90s) since agent list churns slowly.
 */
const agentsResource = createCachedResource<MissionAgentSidebar[]>(fetchMissionAgentsSlim, {
  ttlMs: 90_000,
})

export const cachedAgents = {
  invalidate: () => agentsResource.invalidate(),
  reload: () => agentsResource.reload(),
  peek: () => agentsResource.peek(),
  mutate: (
    next:
      | MissionAgentSidebar[]
      | ((prev: MissionAgentSidebar[] | undefined) => MissionAgentSidebar[]),
  ) => agentsResource.mutate(next),
}

export function useCachedMissionAgents(enabled = true) {
  return agentsResource.use({ enabled })
}
