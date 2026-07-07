import { beforeEach, describe, expect, it } from 'vitest'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { useTeamFocusStore } from './use-team-focus-store'

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

describe('useTeamFocusStore', () => {
  beforeEach(() => {
    useTeamFocusStore.setState({
      focusedAgent: null,
      page: 'agents',
      skillsContext: null,
      agentsContext: null,
    })
  })

  it('maps a mission agent into focus state and marks system agents readonly', () => {
    useTeamFocusStore.getState().setFocusedAgent(
      agentFixture({
        agent_key: 'hr',
        level: 'system',
        specialty: 'People',
        config: { capability_domain: 'hr' },
      }),
      'agents',
    )

    expect(useTeamFocusStore.getState().focusedAgent).toMatchObject({
      agent_key: 'hr',
      level: 'system',
      specialty: 'People',
      capability_domain: 'hr',
      editable: false,
    })
    expect(useTeamFocusStore.getState().page).toBe('agents')
  })

  it('clears agent and context state together', () => {
    useTeamFocusStore.getState().setFocusedAgent(agentFixture({}), 'agents')
    useTeamFocusStore.getState().setAgentsContext({
      panel: 'agent-list',
      view: 'grid',
      searchQuery: '',
      statusFilters: [],
      modelFilters: [],
      sort: 'name',
      groupBy: 'none',
      totalAgentCount: 1,
      visibleAgentCount: 1,
      visibleAgents: [],
      visibleAgentsTruncated: false,
      visibleGroups: [],
      selectedAgentKey: null,
      selectedAgent: null,
      modalState: {
        readyEmployeesOpen: false,
        fireConfirmOpen: false,
        telegramSetupOpen: false,
        slackSetupOpen: false,
        upgradeOpen: false,
      },
    })

    useTeamFocusStore.getState().clearFocus()

    expect(useTeamFocusStore.getState().focusedAgent).toBeNull()
    expect(useTeamFocusStore.getState().skillsContext).toBeNull()
    expect(useTeamFocusStore.getState().agentsContext).toBeNull()
  })
})
