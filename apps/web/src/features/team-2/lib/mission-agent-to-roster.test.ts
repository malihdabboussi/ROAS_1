import { describe, expect, it } from 'vitest'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { missionAgentToRosterEntry } from './mission-agent-to-roster'

function agentFixture(overrides: Partial<MissionAgent>): MissionAgent {
  return {
    id: 'agent-1',
    user_id: 'user-1',
    agent_key: 'agent-1',
    name: 'Agent One',
    role: 'Employee',
    status: 'online',
    skills: [],
    level: 'employee',
    specialty: null,
    image_url: null,
    is_active: true,
    team_id: null,
    config: {},
    created_at: '2026-06-22T10:00:00.000Z',
    updated_at: '2026-06-22T10:05:00.000Z',
    ...overrides,
  }
}

describe('missionAgentToRosterEntry', () => {
  it('converts a mission agent into an assignable roster entry', () => {
    expect(
      missionAgentToRosterEntry(
        agentFixture({
          agent_key: 'atlas',
          name: 'Atlas',
          role: 'Research Lead',
          specialty: 'Research',
          image_url: 'https://example.com/atlas.png',
          level: 'manager',
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        participant_id: 'agent:atlas',
        kind: 'agent',
        agent_key: 'atlas',
        display_name: 'Atlas',
        avatar_url: 'https://example.com/atlas.png',
        role_label: 'Research Lead',
        specialties: ['Research'],
        accepts_assignments: true,
        is_ready: true,
        agent_level: 'manager',
      }),
    )
  })
})
