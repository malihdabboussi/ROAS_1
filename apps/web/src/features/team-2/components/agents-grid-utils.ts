import { agentModelId, resolveAgentModelDisplay } from '@/lib/agents/model-strategies'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'
import type { TeamAgentsPageAgentSummary } from '../store/use-team-focus-store'
import type { AgentsListGroup } from './AgentsListView'
import type { Team2GroupBy, Team2GroupSort, Team2Sort, Team2StatusFilter } from './Team2Toolbar'

const LEVEL_RANK: Record<string, number> = {
  c_level: 0,
  manager: 1,
  employee: 2,
  system: 3,
}

const LEVEL_LABEL: Record<string, string> = {
  c_level: 'C-Level',
  manager: 'Managers',
  employee: 'Employees',
  system: 'System',
}

const LEVEL_COLOR: Record<string, string> = {
  c_level: 'violet',
  manager: 'blue',
  employee: 'emerald',
  system: 'muted',
}

export const MAX_VISIBLE_AGENTS_IN_HR_CONTEXT = 30

export type AgentTeamLookup = Map<string, { name: string; color: string; icon: string }>

export type AgentGroup = AgentsListGroup

export function agentMatchesStatus(
  agent: MissionAgent,
  filters: Team2StatusFilter[],
): boolean {
  if (filters.length === 0) return true
  const isDeactivated = agent.is_active === false
  return filters.some((filter) => {
    if (filter === 'working') return !isDeactivated && agent.status === 'working'
    if (filter === 'idle') return !isDeactivated && agent.status === 'idle'
    if (filter === 'offline') return isDeactivated
    if (filter === 'online') return !isDeactivated
    return false
  })
}

export function agentToSummary(
  agent: MissionAgent,
  modelOptions: LlmModelOption[] | ReadonlyArray<{ id: string; label: string }>,
  teamLookup: AgentTeamLookup,
  editable: boolean,
): TeamAgentsPageAgentSummary {
  const modelId = agentModelId(agent)
  const modelDisplay = resolveAgentModelDisplay(modelId, modelOptions)
  const team = agent.team_id ? teamLookup.get(agent.team_id) : null
  const config = (agent.config as Record<string, unknown> | null) ?? {}
  return {
    agent_key: agent.agent_key,
    name: agent.name,
    role: agent.role ?? null,
    level: agent.level ?? null,
    specialty: typeof config.specialty === 'string' ? config.specialty : null,
    status: agent.status ?? null,
    is_active: agent.is_active !== false,
    model_id: modelId,
    model_label: modelDisplay.label,
    team_id: agent.team_id ?? null,
    team_name: team?.name ?? null,
    editable,
  }
}

export function agentMatchesModels(agent: MissionAgent, filters: string[]): boolean {
  if (filters.length === 0) return true
  return filters.includes(agentModelId(agent))
}

export function agentMatchesSearch(agent: MissionAgent, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return (
    agent.name.toLowerCase().includes(q) ||
    (agent.role ?? '').toLowerCase().includes(q) ||
    agent.agent_key.toLowerCase().includes(q)
  )
}

export function sortAgents(list: MissionAgent[], sort: Team2Sort): MissionAgent[] {
  const next = [...list]
  switch (sort) {
    case 'recent':
      return next.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    case 'oldest':
      return next.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
    case 'name_asc':
      return next.sort((a, b) => a.name.localeCompare(b.name))
    case 'name_desc':
      return next.sort((a, b) => b.name.localeCompare(a.name))
    case 'level_top_first':
      return next.sort((a, b) => {
        const ra = LEVEL_RANK[a.level ?? 'employee'] ?? 9
        const rb = LEVEL_RANK[b.level ?? 'employee'] ?? 9
        if (ra !== rb) return ra - rb
        return a.name.localeCompare(b.name)
      })
    default:
      return next
  }
}

export function groupAgents(
  agents: MissionAgent[],
  groupBy: Team2GroupBy,
  groupSort: Team2GroupSort,
  modelOptions: LlmModelOption[],
  teamLookup: AgentTeamLookup,
): AgentGroup[] | null {
  if (groupBy === 'none') return null
  const buckets = new Map<string, AgentGroup>()
  for (const agent of agents) {
    let key: string
    let label: string
    let color: string
    let icon: string | null = null
    let modelChipClass: string | undefined
    if (groupBy === 'team') {
      key = agent.team_id ?? '__no_team__'
      const team = agent.team_id ? teamLookup.get(agent.team_id) : null
      label = team?.name ?? 'No team'
      color = team?.color ?? 'muted'
      icon = team?.icon ?? null
    } else if (groupBy === 'level') {
      const lvl = agent.level ?? 'employee'
      key = lvl
      label = LEVEL_LABEL[lvl] ?? lvl
      color = LEVEL_COLOR[lvl] ?? 'muted'
    } else if (groupBy === 'model') {
      const id = agentModelId(agent)
      const display = resolveAgentModelDisplay(id, modelOptions)
      key = id
      label = display.label
      color = 'muted'
      modelChipClass = display.chipClass
    } else {
      key = '__all__'
      label = 'All'
      color = 'muted'
    }
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { key, label, color, icon, modelChipClass, items: [] }
      buckets.set(key, bucket)
    }
    bucket.items.push(agent)
  }
  const dir = groupSort === 'asc' ? 1 : -1
  return Array.from(buckets.values()).sort((a, b) => {
    if (groupBy === 'level') {
      const ra = LEVEL_RANK[a.key] ?? 9
      const rb = LEVEL_RANK[b.key] ?? 9
      if (ra !== rb) return (ra - rb) * dir
    }
    return a.label.localeCompare(b.label) * dir
  })
}
