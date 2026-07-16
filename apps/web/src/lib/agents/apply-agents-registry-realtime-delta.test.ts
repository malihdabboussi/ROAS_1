import { describe, expect, it } from 'vitest'
import { applyAgentsRegistryRealtimeDelta } from './apply-agents-registry-realtime-delta'
import type { MissionAgent } from './mission-agents-api'

function agent(partial: Partial<MissionAgent> & Pick<MissionAgent, 'id' | 'agent_key'>): MissionAgent {
  return {
    user_id: 'u1',
    name: partial.name ?? partial.agent_key,
    role: 'employee',
    status: 'idle',
    skills: [],
    created_at: '',
    updated_at: '',
    ...partial,
  }
}

describe('applyAgentsRegistryRealtimeDelta', () => {
  const roster = [
    agent({ id: 'a1', agent_key: 'lux', status: 'idle', name: 'Lux' }),
    agent({ id: 'a2', agent_key: 'copy', status: 'working', name: 'Copy' }),
  ]

  it('patches status on UPDATE', () => {
    const next = applyAgentsRegistryRealtimeDelta(roster, 'UPDATE', {
      id: 'a1',
      agent_key: 'lux',
      status: 'working',
      name: 'Lux',
    })
    expect(next.find((row) => row.agent_key === 'lux')?.status).toBe('working')
    expect(next.find((row) => row.agent_key === 'copy')?.status).toBe('working')
  })

  it('removes agents on DELETE', () => {
    const next = applyAgentsRegistryRealtimeDelta(roster, 'DELETE', {
      id: 'a2',
      agent_key: 'copy',
    })
    expect(next.map((row) => row.agent_key)).toEqual(['lux'])
  })

  it('leaves roster unchanged when row does not match', () => {
    const next = applyAgentsRegistryRealtimeDelta(roster, 'UPDATE', {
      id: 'missing',
      agent_key: 'ghost',
      status: 'online',
    })
    expect(next).toBe(roster)
  })
})
