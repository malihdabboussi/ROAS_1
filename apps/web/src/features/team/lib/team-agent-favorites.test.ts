import { describe, expect, it } from 'vitest'
import type { MissionAgentSidebar } from '@/lib/agents/mission-agents-api'
import { sortAgentsForTeamDmList } from './team-agent-favorites'

function agentFixture(overrides: Partial<MissionAgentSidebar>): MissionAgentSidebar {
  return {
    id: 'agent-1',
    agent_key: 'agent-1',
    name: 'Agent One',
    image_url: null,
    is_active: true,
    status: 'online',
    updated_at: '2026-06-22T10:00:00.000Z',
    level: 'employee',
    team_id: null,
    role: 'Employee',
    sort_order: 0,
    ...overrides,
  }
}

describe('sortAgentsForTeamDmList', () => {
  it('orders favorites first, then active agents, sort order, recency, and name', () => {
    const sorted = sortAgentsForTeamDmList(
      [
        agentFixture({
          id: 'inactive-favorite',
          name: 'Inactive Favorite',
          is_active: false,
          sort_order: 99,
        }),
        agentFixture({ id: 'active-late', name: 'Zara', sort_order: 2 }),
        agentFixture({
          id: 'active-early',
          name: 'Ana',
          sort_order: 1,
          updated_at: '2026-06-22T11:00:00.000Z',
        }),
        agentFixture({
          id: 'inactive',
          name: 'Inactive',
          is_active: false,
          sort_order: 0,
        }),
      ],
      new Set(['inactive-favorite']),
    )

    expect(sorted.map((agent) => agent.id)).toEqual([
      'inactive-favorite',
      'active-early',
      'active-late',
      'inactive',
    ])
  })
})
