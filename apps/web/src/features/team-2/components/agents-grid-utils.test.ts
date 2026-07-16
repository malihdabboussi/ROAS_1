import { describe, expect, it } from 'vitest'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { agentMatchesStatus } from '../components/agents-grid-utils'

function agent(
  partial: Partial<MissionAgent> & Pick<MissionAgent, 'agent_key' | 'name'>,
): MissionAgent {
  return {
    id: partial.id ?? partial.agent_key,
    user_id: 'u1',
    status: 'idle',
    skills: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    is_active: true,
    role: 'Worker',
    ...partial,
  }
}

describe('agentMatchesStatus', () => {
  it('matches working and idle on agent.status', () => {
    const working = agent({ agent_key: 'a', name: 'A', status: 'working' })
    const idle = agent({ agent_key: 'b', name: 'B', status: 'idle' })
    expect(agentMatchesStatus(working, ['working'])).toBe(true)
    expect(agentMatchesStatus(working, ['idle'])).toBe(false)
    expect(agentMatchesStatus(idle, ['idle'])).toBe(true)
  })

  it('matches deactivated via offline filter', () => {
    const deactivated = agent({
      agent_key: 'c',
      name: 'C',
      status: 'offline',
      is_active: false,
    })
    expect(agentMatchesStatus(deactivated, ['offline'])).toBe(true)
    expect(agentMatchesStatus(deactivated, ['online'])).toBe(false)
    expect(agentMatchesStatus(deactivated, ['working'])).toBe(false)
  })
})
