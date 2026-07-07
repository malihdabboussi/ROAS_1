import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { Mission } from '@/lib/missions'

/**
 * Pure helpers that aggregate per-team mission/agent stats. Mirrors the math used
 * by `useTeamContainerDerived` but applied to the whole set of agents in a team.
 */

export interface TeamMissionStats {
  total: number
  todo: number
  active: number
  blocked: number
  completed: number
  failed: number
  successRate: number | null
  avgCompletionRate: number | null
  completedThisWeek: number
  completedThisMonth: number
}

export interface TeamAgentStatusCounts {
  online: number
  working: number
  idle: number
  offline: number
}

export interface TeamAgentMetricsRow {
  agent: MissionAgent
  total: number
  active: number
  blocked: number
  completed: number
  failed: number
  successRate: number | null
  avgCompletionRate: number | null
  completedThisMonth: number
  lastActiveAt: string | null
}

const ACTIVE_STATUSES = new Set(['planning', 'in_progress', 'review'])

export function filterMissionsForAgents(missions: Mission[], agentKeys: Set<string>): Mission[] {
  if (agentKeys.size === 0) return []
  return missions.filter(
    (m) =>
      (m.assigned_agent_key && agentKeys.has(m.assigned_agent_key)) ||
      (m.current_agent_key && agentKeys.has(m.current_agent_key)),
  )
}

export function computeTeamMissionStats(
  missions: Mission[],
  agentKeys: Set<string>,
): TeamMissionStats {
  const teamMissions = filterMissionsForAgents(missions, agentKeys)
  const todo = teamMissions.filter((m) => m.status === 'todo' || m.status === 'inbox').length
  const active = teamMissions.filter((m) => ACTIVE_STATUSES.has(m.status)).length
  const blocked = teamMissions.filter((m) => m.status === 'blocked').length
  const completedMissions = teamMissions.filter((m) => m.status === 'done')
  const failedMissions = teamMissions.filter((m) => m.status === 'failed' || m.status === 'error')
  const completed = completedMissions.length
  const failed = failedMissions.length
  const successRate =
    completed + failed > 0 ? Math.round((completed / (completed + failed)) * 100) : null

  const withSubtasks = teamMissions.filter((m) => m.subtask_total != null && m.subtask_total > 0)
  const avgCompletionRate =
    withSubtasks.length === 0
      ? null
      : Math.round(
          (withSubtasks.reduce((acc, m) => acc + (m.subtask_done ?? 0) / m.subtask_total!, 0) /
            withSubtasks.length) *
            100,
        )

  const now = new Date()
  const monthStartIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const weekStartIso = new Date(now.getTime() - 7 * 86400000).toISOString()
  const completedThisMonth = completedMissions.filter(
    (m) => m.completed_at && m.completed_at >= monthStartIso,
  ).length
  const completedThisWeek = completedMissions.filter(
    (m) => m.completed_at && m.completed_at >= weekStartIso,
  ).length

  return {
    total: teamMissions.length,
    todo,
    active,
    blocked,
    completed,
    failed,
    successRate,
    avgCompletionRate,
    completedThisWeek,
    completedThisMonth,
  }
}

export function computeAgentStatusCounts(agents: MissionAgent[]): TeamAgentStatusCounts {
  const out: TeamAgentStatusCounts = { online: 0, working: 0, idle: 0, offline: 0 }
  for (const a of agents) {
    if (a.status === 'online') out.online += 1
    else if (a.status === 'working') out.working += 1
    else if (a.status === 'idle') out.idle += 1
    else out.offline += 1
  }
  return out
}

export function activeMissionsForAgents(missions: Mission[], agentKeys: Set<string>): Mission[] {
  return filterMissionsForAgents(missions, agentKeys)
    .filter((m) => ACTIVE_STATUSES.has(m.status) || m.status === 'blocked')
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
}

export function recentActivityForAgents(
  missions: Mission[],
  agentKeys: Set<string>,
  windowDays = 7,
): Mission[] {
  const cutoff = new Date(Date.now() - windowDays * 86400000).toISOString()
  return filterMissionsForAgents(missions, agentKeys)
    .filter((m) => {
      const isFinal = m.status === 'done' || m.status === 'failed' || m.status === 'error'
      const ts = m.completed_at ?? m.updated_at
      return isFinal && ts && ts >= cutoff
    })
    .sort((a, b) =>
      (b.completed_at ?? b.updated_at ?? '').localeCompare(a.completed_at ?? a.updated_at ?? ''),
    )
}

export function computePerAgentMetrics(
  agents: MissionAgent[],
  missions: Mission[],
): TeamAgentMetricsRow[] {
  return agents
    .map((agent) => {
      const keys = new Set([agent.agent_key])
      const agentMissions = filterMissionsForAgents(missions, keys)
      const stats = computeTeamMissionStats(missions, keys)
      const lastMissionAt =
        agentMissions
          .map((m) => m.completed_at ?? m.updated_at ?? m.created_at)
          .filter(Boolean)
          .sort((a, b) => b.localeCompare(a))[0] ?? null
      const lastActiveAt =
        (agent.config as Record<string, string> | undefined)?.last_active ??
        agent.stats?.last_scored_at ??
        lastMissionAt ??
        agent.updated_at ??
        null
      return {
        agent,
        total: stats.total,
        active: stats.active,
        blocked: stats.blocked,
        completed: stats.completed,
        failed: stats.failed,
        successRate: stats.successRate,
        avgCompletionRate: stats.avgCompletionRate,
        completedThisMonth: stats.completedThisMonth,
        lastActiveAt,
      }
    })
    .sort((a, b) => b.completedThisMonth - a.completedThisMonth || b.total - a.total)
}
