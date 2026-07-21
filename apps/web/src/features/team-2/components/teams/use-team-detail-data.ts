'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addTeamExternalMember,
  addTeamMember,
  deleteTeam,
  fetchMissionAgents,
  listTeamExternalMembers,
  listTeamGrants,
  listTeamMembers,
  listTeams,
  removeTeamExternalMember,
  removeTeamMember,
  setAgentTeam,
  setTeamGrants,
  updateTeam,
  type AgentCapabilityKind,
  type AgentTeam,
  type AgentTeamExternalMember,
  type AgentTeamGrant,
  type AgentTeamMember,
  type MissionAgent,
} from '@/lib/agents'
import { backendGet } from '@/lib/api/backend-client'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns'
import { fetchMissions, type Mission } from '@/lib/missions'
import type { ReportingDateRangeInput } from '@/lib/reporting'
import { fetchSpaces } from '@/lib/spaces'
import { fetchSlackPeople, type SlackDiscoveredPerson } from '../../services/slack-people.service'
import { emptyTeamAccessGrants, grantsToToggleSet, toggleSetToGrants } from './team-detail-grants'
import type { TeamDetailOrgMember } from './team-detail-member-types'
import type { TeamAccessGrants } from './TeamAccessView'
import type { TeamDetailToolbarSpaceOption } from './TeamDetailToolbar'

type ToggleSet = TeamAccessGrants

export function useTeamDetailData({
  teamId,
  initialTeam,
  activeOrgId,
}: {
  teamId: string
  initialTeam?: AgentTeam | null
  activeOrgId: string | null
}) {
  const [team, setTeam] = useState<AgentTeam | null>(initialTeam ?? null)
  const [loading, setLoading] = useState(!initialTeam)
  const [grants, setGrants] = useState<ToggleSet>(emptyTeamAccessGrants())
  const [savingKind, setSavingKind] = useState<AgentCapabilityKind | null>(null)
  const [members, setMembers] = useState<MissionAgent[]>([])
  const [allAgents, setAllAgents] = useState<MissionAgent[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [overviewRangeConfig, setOverviewRangeConfig] = useState<ReportingDateRangeInput>({
    time_range: '7d',
  })
  const [campaignFilterIds, setCampaignFilterIds] = useState<string[]>([])
  const [spaceFilterIds, setSpaceFilterIds] = useState<string[]>([])
  const [spacePickerOptions, setSpacePickerOptions] = useState<TeamDetailToolbarSpaceOption[]>([])
  const [userMembers, setUserMembers] = useState<AgentTeamMember[]>([])
  const [externalMembers, setExternalMembers] = useState<AgentTeamExternalMember[]>([])
  const [externalPeople, setExternalPeople] = useState<SlackDiscoveredPerson[]>([])
  const [orgMembers, setOrgMembers] = useState<TeamDetailOrgMember[]>([])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [
        teams,
        grantRows,
        agents,
        userRows,
        externalRows,
        missionRows,
        orgMembersRes,
        slackPeopleRes,
      ] = await Promise.all([
        listTeams().catch(() => [] as AgentTeam[]),
        listTeamGrants(teamId).catch(() => [] as AgentTeamGrant[]),
        fetchMissionAgents().catch(() => [] as MissionAgent[]),
        listTeamMembers(teamId).catch(() => [] as AgentTeamMember[]),
        listTeamExternalMembers(teamId).catch(() => [] as AgentTeamExternalMember[]),
        fetchMissions({ limit: 200 }).catch(() => [] as Mission[]),
        activeOrgId
          ? backendGet<{ success: boolean; members: TeamDetailOrgMember[] }>(
              `/api/org/${activeOrgId}/members`,
            ).catch(() => ({ success: false, members: [] }))
          : Promise.resolve({ success: false, members: [] }),
        activeOrgId
          ? fetchSlackPeople().catch(() => ({ connected: false, people: [] }))
          : Promise.resolve({ connected: false, people: [] }),
      ])
      const fresh = teams.find((row) => row.id === teamId) ?? null
      if (fresh) setTeam(fresh)
      setGrants(grantsToToggleSet(grantRows))
      setAllAgents(agents)
      setMembers(agents.filter((agent) => agent.team_id === teamId))
      setUserMembers(userRows)
      setExternalMembers(externalRows)
      setExternalPeople(
        slackPeopleRes.people.filter((person) => person.relationship_kind === 'external'),
      )
      setMissions(missionRows)
      setOrgMembers(orgMembersRes.members)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, teamId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const persistGrants = useCallback(
    async (kind: AgentCapabilityKind, next: ToggleSet) => {
      setSavingKind(kind)
      try {
        await setTeamGrants(teamId, toggleSetToGrants(next))
      } finally {
        setSavingKind(null)
      }
    },
    [teamId],
  )

  const toggleGrant = useCallback(
    (kind: keyof ToggleSet, id: string) => {
      setGrants((prev) => {
        const next: ToggleSet = {
          integration: new Set(prev.integration),
          brain_domain: new Set(prev.brain_domain),
          brain_access: new Set(prev.brain_access),
          campaign_context: new Set(prev.campaign_context),
          channel: new Set(prev.channel),
          action_domain: new Set(prev.action_domain),
        }
        if (next[kind].has(id)) next[kind].delete(id)
        else next[kind].add(id)
        void persistGrants(kind as AgentCapabilityKind, next)
        return next
      })
    },
    [persistGrants],
  )

  const updateTeamName = useCallback(
    async (name: string) => {
      if (!team) return null
      const next = await updateTeam(team.id, { name })
      setTeam(next)
      return next
    },
    [team],
  )

  const updateTeamColor = useCallback(
    async (color: string) => {
      if (!team) return null
      const next = await updateTeam(team.id, { color })
      setTeam(next)
      return next
    },
    [team],
  )

  const updateTeamIcon = useCallback(
    async (icon: string) => {
      if (!team) return null
      const next = await updateTeam(team.id, { icon })
      setTeam(next)
      return next
    },
    [team],
  )

  const deleteCurrentTeam = useCallback(async () => {
    if (!team) return
    await deleteTeam(team.id)
  }, [team])

  const addMember = useCallback(
    async (userId: string) => {
      if (!userId) return
      await addTeamMember(teamId, userId)
      setUserMembers(await listTeamMembers(teamId))
    },
    [teamId],
  )

  const assignAgent = useCallback(
    async (agentKey: string) => {
      if (!agentKey) return
      await setAgentTeam(agentKey, teamId)
      setAllAgents((prev) =>
        prev.map((agent) => (agent.agent_key === agentKey ? { ...agent, team_id: teamId } : agent)),
      )
      setMembers((prev) => {
        const next = prev.slice()
        if (next.some((agent) => agent.agent_key === agentKey)) return next
        const justAdded = allAgents.find((agent) => agent.agent_key === agentKey)
        if (justAdded) next.push({ ...justAdded, team_id: teamId })
        return next
      })
    },
    [allAgents, teamId],
  )

  const addExternalMember = useCallback(
    async (personId: string) => {
      if (!personId) return
      await addTeamExternalMember(teamId, personId)
      setExternalMembers(await listTeamExternalMembers(teamId))
    },
    [teamId],
  )

  const deleteMember = useCallback(
    async (userId: string) => {
      await removeTeamMember(teamId, userId)
      setUserMembers(await listTeamMembers(teamId))
    },
    [teamId],
  )

  const removeAgent = useCallback(async (agentKey: string) => {
    await setAgentTeam(agentKey, null)
    setAllAgents((prev) =>
      prev.map((agent) => (agent.agent_key === agentKey ? { ...agent, team_id: null } : agent)),
    )
    setMembers((prev) => prev.filter((agent) => agent.agent_key !== agentKey))
  }, [])

  const deleteExternalMember = useCallback(
    async (personId: string) => {
      await removeTeamExternalMember(teamId, personId)
      setExternalMembers(await listTeamExternalMembers(teamId))
    },
    [teamId],
  )

  useEffect(() => {
    void fetchCampaigns()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
  }, [])

  useEffect(() => {
    if (campaignFilterIds.length === 0) {
      setSpacePickerOptions([])
      setSpaceFilterIds([])
      return
    }
    let cancelled = false
    const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign] as const))
    const isGeneral = (id: string) => {
      const config = campaignById.get(id)?.config as Record<string, unknown> | undefined
      return config?.system_kind === 'general'
    }
    void Promise.all(
      campaignFilterIds.map((id) =>
        isGeneral(id)
          ? fetchSpaces<TeamDetailToolbarSpaceOption>({ general: true, limit: 100 })
          : fetchSpaces<TeamDetailToolbarSpaceOption>({ campaign_id: id, limit: 100 }),
      ),
    )
      .then((arrays) => {
        if (cancelled) return
        const map = new Map<string, TeamDetailToolbarSpaceOption>()
        for (const array of arrays) {
          for (const space of array) map.set(space.id, space)
        }
        const sorted = [...map.values()].sort((a, b) =>
          (a.title ?? '').localeCompare(b.title ?? ''),
        )
        setSpacePickerOptions(sorted)
        setSpaceFilterIds((prev) => {
          const allowed = new Set(sorted.map((space) => space.id))
          return prev.filter((id) => allowed.has(id))
        })
      })
      .catch(() => {
        if (!cancelled) {
          setSpacePickerOptions([])
          setSpaceFilterIds([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [campaignFilterIds, campaigns])

  const missionCampaignById = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const mission of missions) map.set(mission.id, mission.campaign_id ?? null)
    return map
  }, [missions])

  return {
    team,
    loading,
    grants,
    savingKind,
    members,
    allAgents,
    missions,
    campaigns,
    overviewRangeConfig,
    setOverviewRangeConfig,
    campaignFilterIds,
    setCampaignFilterIds,
    spaceFilterIds,
    setSpaceFilterIds,
    spacePickerOptions,
    userMembers,
    externalMembers,
    externalPeople,
    orgMembers,
    missionCampaignById,
    toggleGrant,
    updateTeamName,
    updateTeamColor,
    updateTeamIcon,
    deleteCurrentTeam,
    addMember,
    addExternalMember,
    assignAgent,
    deleteMember,
    deleteExternalMember,
    removeAgent,
  }
}
