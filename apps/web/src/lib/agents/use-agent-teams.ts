'use client'

import { useCallback } from 'react'
import { createCachedResource } from '@/lib/cache/cached-resource'
import * as service from './agent-teams-api'
import type { AgentTeam, AgentTeamKind } from './agent-teams.types'

const teamsResource = createCachedResource<AgentTeam[]>(service.listTeams, {
  ttlMs: 60_000,
})

export const teamsCache = {
  invalidate: () => teamsResource.invalidate(),
  reload: () => teamsResource.reload(),
  peek: () => teamsResource.peek(),
  mutate: (next: AgentTeam[] | ((prev: AgentTeam[] | undefined) => AgentTeam[])) =>
    teamsResource.mutate(next),
}

interface UseTeamsResult {
  teams: AgentTeam[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  create: (payload: {
    name: string
    color?: string
    icon?: string
    team_kind?: AgentTeamKind
  }) => Promise<AgentTeam>
  rename: (teamId: string, name: string) => Promise<AgentTeam>
  recolor: (teamId: string, color: string) => Promise<AgentTeam>
  reicon: (teamId: string, icon: string) => Promise<AgentTeam>
  remove: (teamId: string) => Promise<void>
}

interface UseMyTeamMembershipsResult {
  teamIds: string[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useTeams(enabled = true): UseTeamsResult {
  const { data, loading, error, reload } = teamsResource.use({ enabled })

  const create = useCallback(
    async (payload: { name: string; color?: string; icon?: string; team_kind?: AgentTeamKind }) => {
      const created = await service.createTeam(payload)
      teamsResource.mutate((prev) => [...(prev ?? []), created])
      return created
    },
    [],
  )

  const rename = useCallback(async (teamId: string, name: string) => {
    const next = await service.updateTeam(teamId, { name })
    teamsResource.mutate((prev) =>
      (prev ?? []).map((t) => (t.id === teamId ? { ...t, ...next } : t)),
    )
    return next
  }, [])

  const recolor = useCallback(async (teamId: string, color: string) => {
    const next = await service.updateTeam(teamId, { color })
    teamsResource.mutate((prev) =>
      (prev ?? []).map((t) => (t.id === teamId ? { ...t, ...next } : t)),
    )
    return next
  }, [])

  const reicon = useCallback(async (teamId: string, icon: string) => {
    const next = await service.updateTeam(teamId, { icon })
    teamsResource.mutate((prev) =>
      (prev ?? []).map((t) => (t.id === teamId ? { ...t, ...next } : t)),
    )
    return next
  }, [])

  const remove = useCallback(async (teamId: string) => {
    await service.deleteTeam(teamId)
    teamsResource.mutate((prev) => (prev ?? []).filter((t) => t.id !== teamId))
  }, [])

  return {
    teams: data ?? [],
    loading,
    error,
    reload,
    create,
    rename,
    recolor,
    reicon,
    remove,
  }
}

const myTeamMembershipsResource = createCachedResource<string[]>(
  async () => {
    const res = await service.listMyTeamMemberships()
    return res.team_ids
  },
  {
    ttlMs: 60_000,
  },
)

export const myTeamMembershipsCache = {
  invalidate: () => myTeamMembershipsResource.invalidate(),
  reload: () => myTeamMembershipsResource.reload(),
}

export function useMyTeamMemberships(): UseMyTeamMembershipsResult {
  const { data, loading, error, reload } = myTeamMembershipsResource.use()
  return {
    teamIds: data ?? [],
    loading,
    error,
    reload,
  }
}
