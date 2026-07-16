import type { AgentStatus, MissionAgent } from './mission-agents-api'

const AGENT_STATUSES = new Set<AgentStatus>(['online', 'idle', 'working', 'offline'])

function asAgentStatus(value: unknown): AgentStatus | undefined {
  return typeof value === 'string' && AGENT_STATUSES.has(value as AgentStatus)
    ? (value as AgentStatus)
    : undefined
}

/**
 * Apply an agents_registry realtime payload to the in-memory roster without a list refetch.
 * INSERT is not handled here — callers should refetch so new rows are fully hydrated.
 */
export function applyAgentsRegistryRealtimeDelta(
  agents: MissionAgent[],
  eventType: string,
  row: Record<string, unknown> | null | undefined,
): MissionAgent[] {
  if (!row) return agents
  const id = typeof row.id === 'string' ? row.id : null
  const agentKey = typeof row.agent_key === 'string' ? row.agent_key : null
  if (!id && !agentKey) return agents

  if (eventType === 'DELETE') {
    return agents.filter((agent) => agent.id !== id && agent.agent_key !== agentKey)
  }

  const status = asAgentStatus(row.status)
  const name = typeof row.name === 'string' ? row.name : undefined
  const imageUrl = typeof row.image_url === 'string' ? row.image_url : undefined
  const isActive = typeof row.is_active === 'boolean' ? row.is_active : undefined

  let matched = false
  const next = agents.map((agent) => {
    if ((id && agent.id === id) || (agentKey && agent.agent_key === agentKey)) {
      matched = true
      return {
        ...agent,
        ...(status ? { status } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
        ...(isActive !== undefined ? { is_active: isActive } : {}),
      }
    }
    return agent
  })

  return matched ? next : agents
}
