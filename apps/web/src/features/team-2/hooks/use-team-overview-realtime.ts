import {
  type TeamOverviewAgent,
  type TeamOverviewLiveDelegation,
  type TeamOverviewLiveMission,
  type TeamOverviewLiveTask,
  type TeamOverviewLiveTrace,
  type TeamOverviewPayload,
  type TeamOverviewRecentMission,
} from '../services/team-overview.service'

const LIVE_LIMIT = 50
const RECENT_LIMIT = 30

const ACTIVE_MISSION_STATUSES = new Set(['planning', 'in_progress', 'review', 'blocked'])
const FINAL_MISSION_STATUSES = new Set(['done', 'failed', 'error'])

export type RealtimeRow = Record<string, unknown>

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function asStatus(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function sortByHappenedAtDesc<T extends { happened_at: string }>(rows: T[], limit: number): T[] {
  return rows
    .slice()
    .sort((a, b) => b.happened_at.localeCompare(a.happened_at))
    .slice(0, limit)
}

function upsertById<T extends { id: string }>(rows: T[], next: T, limit: number): T[] {
  const out = rows.filter((r) => r.id !== next.id)
  out.push(next)
  return sortByHappenedAtDesc(out as Array<T & { happened_at: string }>, limit) as T[]
}

function removeById<T extends { id: string }>(rows: T[], id: string | null): T[] {
  if (!id) return rows
  return rows.filter((r) => r.id !== id)
}

function upsertAgent(rows: TeamOverviewAgent[], next: TeamOverviewAgent): TeamOverviewAgent[] {
  return [...rows.filter((r) => r.id !== next.id), next].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
}

function agentKeys(data: TeamOverviewPayload): Set<string> {
  return new Set(data.agents.map((a) => a.agent_key))
}

function isTeamAgentKey(keys: Set<string>, key: string | null): boolean {
  return !!key && keys.has(key)
}

function isTeamMission(row: RealtimeRow, keys: Set<string>): boolean {
  return (
    isTeamAgentKey(keys, asString(row.current_agent_key)) ||
    isTeamAgentKey(keys, asString(row.assigned_agent_key))
  )
}

function missionLiveRow(row: RealtimeRow): TeamOverviewLiveMission {
  return {
    kind: 'mission',
    id: String(row.id),
    title: String(row.title ?? 'Untitled mission'),
    status: asStatus(row.status),
    current_agent_key: asString(row.current_agent_key),
    assigned_agent_key: asString(row.assigned_agent_key),
    happened_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  }
}

function missionRecentRow(row: RealtimeRow): TeamOverviewRecentMission {
  return {
    kind: 'mission',
    id: String(row.id),
    title: String(row.title ?? 'Untitled mission'),
    status: asStatus(row.status),
    current_agent_key: asString(row.current_agent_key),
    assigned_agent_key: asString(row.assigned_agent_key),
    happened_at: String(
      row.completed_at ?? row.updated_at ?? row.created_at ?? new Date().toISOString(),
    ),
  }
}

function taskLiveRow(row: RealtimeRow): TeamOverviewLiveTask {
  return {
    kind: 'task',
    id: String(row.id),
    space_id: String(row.space_id ?? ''),
    space_title: null,
    title: String(row.title ?? 'Untitled task'),
    status: 'running',
    agent_key: row.assignee_type === 'agent' ? asString(row.assignee_id) : null,
    happened_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  }
}

function traceLiveRow(row: RealtimeRow): TeamOverviewLiveTrace {
  return {
    kind: 'trace',
    id: String(row.id),
    conversation_id: String(row.conversation_id ?? ''),
    conversation_title: null,
    agent_key: asString(row.agent_key),
    channel: asString(row.channel),
    happened_at: String(row.created_at ?? new Date().toISOString()),
  }
}

function delegationLiveRow(row: RealtimeRow): TeamOverviewLiveDelegation {
  return {
    kind: 'delegation',
    id: String(row.id),
    conversation_id: asString(row.conversation_id),
    caller_agent_key: String(row.caller_agent_key ?? ''),
    target_agent_key: String(row.target_agent_key ?? ''),
    status: row.status === 'running' ? 'running' : 'pending',
    type: String(row.type ?? 'delegation'),
    prompt_preview:
      typeof row.prompt === 'string' ? row.prompt.slice(0, 220) : asString(row.prompt_preview),
    happened_at: String(row.completed_at ?? row.created_at ?? new Date().toISOString()),
  }
}

function agentFromRow(row: RealtimeRow): TeamOverviewAgent {
  return {
    id: String(row.id),
    agent_key: String(row.agent_key),
    name: String(row.name ?? row.agent_key ?? 'Agent'),
    role: String(row.role ?? ''),
    status:
      row.status === 'online' ||
      row.status === 'working' ||
      row.status === 'idle' ||
      row.status === 'offline'
        ? row.status
        : 'offline',
    image_url: asString(row.image_url),
    updated_at: asString(row.updated_at),
  }
}

function recomputeAgentStatus(
  agents: TeamOverviewAgent[],
): TeamOverviewPayload['kpis']['agents_by_status'] {
  return agents.reduce<TeamOverviewPayload['kpis']['agents_by_status']>((acc, agent) => {
    acc[agent.status] = (acc[agent.status] ?? 0) + 1
    return acc
  }, {})
}

export function updateMissionDelta(
  data: TeamOverviewPayload,
  row: RealtimeRow,
): TeamOverviewPayload {
  const keys = agentKeys(data)
  const id = asString(row.id)
  if (!id) return data
  const isTeam = isTeamMission(row, keys)
  const status = asStatus(row.status)

  return {
    ...data,
    live: {
      ...data.live,
      missions:
        isTeam && ACTIVE_MISSION_STATUSES.has(status)
          ? upsertById(data.live.missions, missionLiveRow(row), LIVE_LIMIT)
          : removeById(data.live.missions, id),
    },
    recent: {
      ...data.recent,
      missions:
        isTeam && FINAL_MISSION_STATUSES.has(status)
          ? upsertById(data.recent.missions, missionRecentRow(row), RECENT_LIMIT)
          : data.recent.missions,
    },
  }
}

export function updateTaskDelta(data: TeamOverviewPayload, row: RealtimeRow): TeamOverviewPayload {
  const id = asString(row.id)
  if (!id) return data
  const keys = agentKeys(data)
  const agentKey = row.assignee_type === 'agent' ? asString(row.assignee_id) : null
  const isRunning = row.task_execution_status === 'running'

  return {
    ...data,
    live: {
      ...data.live,
      tasks:
        isRunning && isTeamAgentKey(keys, agentKey)
          ? upsertById(data.live.tasks, taskLiveRow(row), LIVE_LIMIT)
          : removeById(data.live.tasks, id),
    },
  }
}

export function updateTraceDelta(
  data: TeamOverviewPayload,
  row: RealtimeRow,
): TeamOverviewPayload {
  const id = asString(row.id)
  if (!id) return data
  const keys = agentKeys(data)
  const isStreaming = row.status === 'streaming'

  return {
    ...data,
    live: {
      ...data.live,
      traces:
        isStreaming && isTeamAgentKey(keys, asString(row.agent_key))
          ? upsertById(data.live.traces, traceLiveRow(row), LIVE_LIMIT)
          : removeById(data.live.traces, id),
    },
  }
}

export function updateDelegationDelta(
  data: TeamOverviewPayload,
  row: RealtimeRow,
): TeamOverviewPayload {
  const id = asString(row.id)
  if (!id) return data
  const keys = agentKeys(data)
  const isLive = row.status === 'pending' || row.status === 'running'
  const isTeam =
    isTeamAgentKey(keys, asString(row.caller_agent_key)) ||
    isTeamAgentKey(keys, asString(row.target_agent_key))

  return {
    ...data,
    live: {
      ...data.live,
      delegations:
        isLive && isTeam
          ? upsertById(data.live.delegations, delegationLiveRow(row), LIVE_LIMIT)
          : removeById(data.live.delegations, id),
    },
  }
}

export function updateAgentDelta(
  data: TeamOverviewPayload,
  row: RealtimeRow,
  teamId: string,
): TeamOverviewPayload {
  const id = asString(row.id)
  const rowTeamId = asString(row.team_id)
  if (!id) return data
  const nextAgents =
    rowTeamId === teamId
      ? upsertAgent(data.agents, agentFromRow(row))
      : data.agents.filter((agent) => agent.id !== id)

  return {
    ...data,
    agents: nextAgents,
    kpis: {
      ...data.kpis,
      agents_by_status: recomputeAgentStatus(nextAgents),
    },
  }
}
