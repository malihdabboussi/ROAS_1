import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { Mission } from '@/lib/missions'
import {
  activeMissionsForAgents,
  computeAgentStatusCounts,
  computeTeamMissionStats,
  type TeamAgentStatusCounts,
  type TeamMissionStats,
} from './agent-team-metrics'

const ACTIVE_MISSION_STATUSES = new Set(['planning', 'in_progress', 'review', 'blocked'])

export interface AgentFocusLine {
  agentKey: string
  agentName: string
  label: string
  kind: 'mission' | 'idle'
  missionId?: string
}

export interface OpsDeskSummary {
  statusCounts: TeamAgentStatusCounts
  missionStats: TeamMissionStats
  liveFocus: AgentFocusLine[]
  idleAgents: Array<{ agentKey: string; agentName: string }>
}

export function resolveAgentFocusLabel(
  agent: MissionAgent,
  missions: Mission[],
): AgentFocusLine {
  const agentMissions = missions
    .filter(
      (m) =>
        (m.current_agent_key === agent.agent_key || m.assigned_agent_key === agent.agent_key) &&
        ACTIVE_MISSION_STATUSES.has(m.status),
    )
    .sort((a, b) => {
      const aCurrent = a.current_agent_key === agent.agent_key ? 1 : 0
      const bCurrent = b.current_agent_key === agent.agent_key ? 1 : 0
      if (bCurrent !== aCurrent) return bCurrent - aCurrent
      return (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
    })

  const focus = agentMissions[0]
  if (focus) {
    return {
      agentKey: agent.agent_key,
      agentName: agent.name,
      label: focus.title,
      kind: 'mission',
      missionId: focus.id,
    }
  }

  return {
    agentKey: agent.agent_key,
    agentName: agent.name,
    label: '',
    kind: 'idle',
  }
}

export function buildOpsDeskSummary(
  agents: MissionAgent[],
  missions: Mission[],
): OpsDeskSummary {
  const floorAgents = agents.filter((a) => a.is_active !== false)
  const keys = new Set(floorAgents.map((a) => a.agent_key))
  const statusCounts = computeAgentStatusCounts(floorAgents)
  const missionStats = computeTeamMissionStats(missions, keys)
  const liveMissions = activeMissionsForAgents(missions, keys)

  const liveFocus: AgentFocusLine[] = []
  const seenAgents = new Set<string>()
  for (const mission of liveMissions) {
    const agentKey = mission.current_agent_key ?? mission.assigned_agent_key
    if (!agentKey || seenAgents.has(agentKey)) continue
    const agent = floorAgents.find((a) => a.agent_key === agentKey)
    if (!agent) continue
    seenAgents.add(agentKey)
    liveFocus.push({
      agentKey,
      agentName: agent.name,
      label: mission.title,
      kind: 'mission',
      missionId: mission.id,
    })
  }

  const idleAgents = floorAgents
    .filter((a) => a.status === 'idle' || (!seenAgents.has(a.agent_key) && a.status !== 'working'))
    .filter((a) => a.agent_key !== 'vibey')
    .map((a) => ({ agentKey: a.agent_key, agentName: a.name }))

  return { statusCounts, missionStats, liveFocus, idleAgents }
}

export function firstNameFromDisplayName(fullName: string, fallback: string): string {
  const trimmed = fullName.trim()
  if (!trimmed) return fallback
  return trimmed.split(/\s+/)[0] ?? fallback
}
