'use client'

import {
  cachedAgents,
  dmUnreadCache,
  teamsCache,
  type AgentTeam,
  type MissionAgentSidebar,
} from '@/lib/agents'
import { backendGet } from '@/lib/api/backend-client'
import { createCachedResource } from '@/lib/cache/cached-resource'
import { channelUnreadCache, channelsCache, type Channel } from '@/lib/channels'
import { peopleCache, type OrgPerson } from '@/lib/org'

interface SidebarTeam2Bootstrap {
  teams: AgentTeam[]
  agents: MissionAgentSidebar[]
  channels: Channel[]
  unread_counts: Record<string, number>
  dm_unread_counts: Record<string, number>
  people: OrgPerson[]
}

const sidebarTeam2Resource = createCachedResource<SidebarTeam2Bootstrap>(
  async () => {
    const data = await backendGet<SidebarTeam2Bootstrap>('/api/sidebar/team2-bootstrap')
    teamsCache.mutate(data.teams)
    cachedAgents.mutate(data.agents)
    channelsCache.mutate(data.channels)
    channelUnreadCache.mutate(data.unread_counts)
    dmUnreadCache.mutate(data.dm_unread_counts)
    peopleCache.mutate(data.people)
    return data
  },
  { ttlMs: 60_000 },
)

export const sidebarTeam2Cache = {
  invalidate: () => sidebarTeam2Resource.invalidate(),
  reload: () => sidebarTeam2Resource.reload(),
  peek: () => sidebarTeam2Resource.peek(),
}

export function useSidebarTeam2Bootstrap(enabled = true) {
  return sidebarTeam2Resource.use({ enabled })
}
