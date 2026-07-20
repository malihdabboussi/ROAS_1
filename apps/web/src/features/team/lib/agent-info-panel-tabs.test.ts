import { describe, expect, it } from 'vitest'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { getAgentInfoPanelTabsForDisplay } from './agent-info-panel-tab-meta'
import {
  agentShowsCampaignAssignment,
  isAgentInfoPanelTab,
  showsAgentAccessTab,
} from './agent-info-panel-tabs'

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
    updated_at: '2026-06-22T10:00:00.000Z',
    ...overrides,
  }
}

describe('agent info panel tab helpers', () => {
  it('shows access for non-system agents and extended system agents only', () => {
    expect(showsAgentAccessTab(agentFixture({ level: 'employee' }), false)).toBe(true)
    expect(showsAgentAccessTab(agentFixture({ level: 'system', agent_key: 'vibey' }), true)).toBe(
      true,
    )
    expect(
      showsAgentAccessTab(agentFixture({ level: 'system', agent_key: 'brain_scholar' }), true),
    ).toBe(false)
    expect(showsAgentAccessTab(null, false)).toBe(false)
  })

  it('allows campaign assignment for employee, manager, and c-level non-system agents', () => {
    expect(agentShowsCampaignAssignment(agentFixture({ level: 'manager' }), false)).toBe(true)
    expect(agentShowsCampaignAssignment(agentFixture({ level: 'c_level' }), false)).toBe(true)
    expect(agentShowsCampaignAssignment(agentFixture({ level: 'system' }), false)).toBe(false)
    expect(agentShowsCampaignAssignment(agentFixture({ level: 'employee' }), true)).toBe(false)
  })

  it('supports Work in the detail sidebar without adding it to panels that do not provide work', () => {
    expect(isAgentInfoPanelTab('work')).toBe(true)
    expect(getAgentInfoPanelTabsForDisplay(true, true)).toEqual([
      'info',
      'work',
      'skills',
      'communication',
      'access',
    ])
    expect(getAgentInfoPanelTabsForDisplay(false)).toEqual(['info', 'skills', 'communication'])
  })
})
