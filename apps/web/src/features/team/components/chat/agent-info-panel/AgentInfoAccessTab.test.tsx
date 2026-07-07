import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent, ResolvedAgentPolicyJson } from '@/lib/agents'
import { AgentInfoAccessTab } from './AgentInfoAccessTab'

const mocks = vi.hoisted(() => ({
  backendGet: vi.fn(),
  getAgentPolicy: vi.fn(),
  setAgentOverrides: vi.fn(),
  setAgentTeam: vi.fn(),
  useTeams: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: mocks.backendGet,
}))

vi.mock('@/lib/agents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agents')>()
  return {
    ...actual,
    getAgentPolicy: mocks.getAgentPolicy,
    setAgentOverrides: mocks.setAgentOverrides,
    setAgentTeam: mocks.setAgentTeam,
    useTeams: mocks.useTeams,
  }
})

const selectedAgent: MissionAgent = {
  id: 'agent-row-1',
  user_id: 'user-1',
  agent_key: 'agent-alpha',
  name: 'Agent Alpha',
  role: 'Research',
  status: 'online',
  skills: [],
  level: 'employee',
  image_url: null,
  is_active: true,
  team_id: 'team-growth',
  config: {},
  created_at: '2026-06-23T09:00:00.000Z',
  updated_at: '2026-06-23T09:00:00.000Z',
}

function policy(overrides: Partial<ResolvedAgentPolicyJson> = {}): ResolvedAgentPolicyJson {
  return {
    agent_key: 'agent-alpha',
    team_id: 'team-growth',
    team_name: 'Growth Team',
    role_defaults: [{ kind: 'action_domain', id: 'write_user_memory' }],
    grants: [{ kind: 'action_domain', id: 'read_campaign' }],
    overrides: {
      allow_extra: [],
      deny: [],
    },
    effective: ['read_campaign', 'write_user_memory'],
    ...overrides,
  }
}

function renderAccessTab() {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    return (
      <AgentInfoAccessTab
        selected={selectedAgent}
        selectedAgentKey="agent-alpha"
        setAgents={vi.fn()}
        hasBrain={false}
        brainLoading={false}
        brainError={null}
        handleAddBrain={vi.fn()}
        setShowUpgradeModal={vi.fn()}
        isEnterprise
        canAllowExtra
        canSetTeam
      />
    )
  }

  const view = render(<Harness />)
  return { ...view, getRenderCount: () => renderCount }
}

describe('AgentInfoAccessTab', () => {
  beforeEach(() => {
    mocks.useTeams.mockReturnValue({
      teams: [
        {
          id: 'team-growth',
          org_id: 'org-1',
          user_id: null,
          parent_team_id: null,
          name: 'Growth Team',
          color: 'blue',
          icon: 'users',
          is_system: false,
          created_at: '2026-06-23T09:00:00.000Z',
          updated_at: '2026-06-23T09:00:00.000Z',
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
    mocks.getAgentPolicy.mockResolvedValue(policy())
    mocks.setAgentTeam.mockResolvedValue({ agent_key: 'agent-alpha', team_id: null })
    mocks.setAgentOverrides.mockResolvedValue([])
    mocks.backendGet.mockImplementation((url: string) => {
      if (url === '/api/integrations/overview') {
        return Promise.resolve({
          success: true,
          integrations: [
            {
              integration_id: 'google_drive',
              provider: 'google_drive',
              status: 'connected',
            },
          ],
        })
      }
      if (url === '/api/slack/status') {
        return Promise.resolve({ success: true, connected: false })
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('loads policy, updates team and overrides, and stays render-stable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const { getRenderCount } = renderAccessTab()

      await waitFor(() => {
        expect(screen.getByText('Inherits from')).toBeTruthy()
        expect(screen.getByText('Read campaign data')).toBeTruthy()
        expect(screen.getByText('Google Drive')).toBeTruthy()
      })

      expect(mocks.getAgentPolicy).toHaveBeenCalledWith('agent-alpha')
      expect(mocks.backendGet).toHaveBeenCalledWith('/api/integrations/overview')
      expect(mocks.backendGet).toHaveBeenCalledWith('/api/slack/status')

      fireEvent.click(screen.getByRole('button', { name: /Growth Team/i }))
      fireEvent.click(screen.getByRole('option', { name: 'No team' }))
      await waitFor(() => {
        expect(mocks.setAgentTeam).toHaveBeenCalledWith('agent-alpha', null)
      })

      const marketingRow = screen.getByText('Read marketing artifacts').parentElement?.parentElement
      expect(marketingRow).toBeTruthy()
      fireEvent.click(within(marketingRow as HTMLElement).getByRole('switch'))

      await waitFor(() => {
        expect(mocks.setAgentOverrides).toHaveBeenCalledWith('agent-alpha', [
          {
            kind: 'action_domain',
            id: 'read_marketing_artifacts',
            mode: 'allow_extra',
          },
        ])
      })

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(getRenderCount()).toBeLessThan(50)
    } finally {
      consoleError.mockRestore()
    }
  })
})
