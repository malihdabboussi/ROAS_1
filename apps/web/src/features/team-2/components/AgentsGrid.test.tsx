import { Profiler } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { AgentsGrid } from './AgentsGrid'

const mocks = vi.hoisted(() => ({
  fetchLlmModels: vi.fn(),
  useTeams: vi.fn(),
  setAgentsContext: vi.fn(),
  canHire: true,
  canEditAgent: vi.fn(() => true),
  canManageSystemPreferences: vi.fn(() => false),
}))

vi.mock('@/lib/chat/llm-models-api', () => ({
  fetchLlmModels: mocks.fetchLlmModels,
}))

vi.mock('@/lib/agents', () => ({
  useTeams: mocks.useTeams,
}))

vi.mock('../hooks/use-team2-perms', () => ({
  useTeam2Perms: () => ({
    canHire: mocks.canHire,
    canEditAgent: mocks.canEditAgent,
    canManageSystemPreferences: mocks.canManageSystemPreferences,
  }),
}))

vi.mock('../store/use-team-focus-store', () => ({
  useTeamFocusStore: (selector: (state: { setAgentsContext: typeof mocks.setAgentsContext }) => unknown) =>
    selector({ setAgentsContext: mocks.setAgentsContext }),
}))

function agent(overrides: Partial<MissionAgent> = {}): MissionAgent {
  return {
    id: 'agent-1',
    user_id: 'user-1',
    agent_key: 'agent-1',
    name: 'Atlas',
    role: 'Research',
    status: 'online',
    skills: [],
    level: 'manager',
    image_url: null,
    is_active: true,
    team_id: 'team-growth',
    config: { model_id: 'auto' },
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-23T00:00:00.000Z',
    ...overrides,
  }
}

function menuContext(overrides: Record<string, unknown> = {}) {
  const noop = vi.fn()
  return {
    menuActions: {
      onCopyId: noop,
      onOpenInNewTab: noop,
      onOpenChat: noop,
      onOpenEdit: noop,
      onOpenSkills: noop,
      onOpenComms: noop,
      onOpenAccess: noop,
      onOpenBrain: noop,
      onSetupBrain: noop,
      onDeactivate: noop,
      onFire: noop,
      onAssignmentsChanged: noop,
    },
    nonGeneralCampaigns: [],
    teams: [],
    onSelectTeam: noop,
    showAccess: true,
    hasBrain: false,
    fireLabel: 'Fire',
    canRename: true,
    canDeactivate: true,
    canMoveTeam: true,
    canFireAgent: true,
    canManageCampaigns: true,
    isFavorite: false,
    onToggleFavorite: noop,
    canFavorite: true,
    isSystemLikeAgent: false,
    ...overrides,
  }
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('AgentsGrid', () => {
  beforeEach(() => {
    mocks.fetchLlmModels.mockResolvedValue([
      {
        id: 'auto',
        label: 'Auto',
      },
      {
        id: 'gpt-4o',
        label: 'GPT-4o',
      },
    ])
    mocks.useTeams.mockReturnValue({
      teams: [
        {
          id: 'team-growth',
          name: 'Growth Team',
          color: 'blue',
          icon: 'users',
        },
        {
          id: 'team-sales',
          name: 'Sales Team',
          color: 'green',
          icon: 'rocket',
        },
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
      create: vi.fn(),
      rename: vi.fn(),
      recolor: vi.fn(),
      reicon: vi.fn(),
      remove: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('renders scoped team groups, publishes context, and stays render-stable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onOpenAgent = vi.fn()
    let commitCount = 0

    try {
      render(
        <Profiler id="agents-grid" onRender={() => commitCount++}>
          <AgentsGrid
            agents={[
              agent(),
              agent({
                id: 'agent-2',
                agent_key: 'agent-2',
                name: 'Blake',
                status: 'offline',
                is_active: false,
                team_id: 'team-sales',
              }),
              agent({
                id: 'agent-3',
                agent_key: 'agent-3',
                name: 'Cora',
                role: 'Ops',
                team_id: null,
                config: { model_id: 'gpt-4o' },
              }),
            ]}
            teamFilterId="team-growth"
            onOpenAgent={onOpenAgent}
            onOpenAgentChat={vi.fn()}
            getAgentMenuContext={() => menuContext() as never}
            onRenameAgent={vi.fn()}
            onChangeAgentModel={vi.fn()}
            onOpenAgentLibrary={vi.fn()}
            onStartAgentFromScratch={vi.fn()}
            selectedAgentKey="agent-1"
            assignedCampaignIdsForSelected={['campaign-1']}
            hasBrainForSelected
          />
        </Profiler>,
      )

      await flushAsyncWork()

      expect(screen.getByText('Growth Team')).toBeTruthy()
      expect(screen.getByText('Atlas')).toBeTruthy()
      expect(screen.queryByText('Blake')).toBeNull()
      expect(screen.queryByText('Cora')).toBeNull()

      fireEvent.click(screen.getByText('Atlas'))
      expect(onOpenAgent).toHaveBeenCalledWith('agent-1')

      await waitFor(() =>
        expect(mocks.setAgentsContext).toHaveBeenCalledWith(
          expect.objectContaining({
            panel: 'agent-list',
            groupBy: 'team',
            totalAgentCount: 1,
            visibleAgentCount: 1,
            visibleAgents: [
              expect.objectContaining({
                agent_key: 'agent-1',
                team_name: 'Growth Team',
                model_label: 'Auto',
              }),
            ],
          }),
        ),
      )

      fireEvent.click(screen.getByRole('button', { name: /Growth Team/i }))
      expect(screen.queryByText('Atlas')).toBeNull()

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commitCount).toBeLessThan(20)
    } finally {
      consoleError.mockRestore()
    }
  })
})
