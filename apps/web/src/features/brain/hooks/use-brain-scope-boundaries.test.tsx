import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBrainScopeMenuActions } from './use-brain-scope-menu-actions'
import { cachedBrainScopeNav, useBrainScopeNavOptions } from './use-brain-scope-nav-options'
import { useTrainableBrains } from './use-trainable-brains'

const mocks = vi.hoisted(() => {
  const orgState = {
    activeOrgId: null as string | null,
    memberships: [],
    myRole: null as string | null,
    isOrgContext: () => false,
  }
  const useOrgStore = Object.assign(
    vi.fn((selector: (state: typeof orgState) => unknown) => selector(orgState)),
    { getState: () => orgState },
  )
  const atlasAgent = {
    id: 'agent-atlas',
    user_id: 'user-1',
    agent_key: 'atlas',
    name: 'Atlas',
    role: 'Brain scholar',
    status: 'online',
    skills: [],
    level: 'system',
    image_url: null,
    is_active: true,
    team_id: null,
    config: {},
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  }
  const mayaAgent = {
    id: 'agent-maya',
    user_id: 'user-1',
    agent_key: 'maya',
    name: 'Maya',
    role: 'Researcher',
    status: 'online',
    skills: [],
    level: 'team',
    image_url: 'https://example.com/maya.png',
    is_active: true,
    team_id: 'team-1',
    config: {},
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  }
  return {
    orgState,
    useOrgStore,
    atlasAgent,
    mayaAgent,
    fetchMissionAgents: vi.fn(),
    fetchCampaigns: vi.fn(),
    fetchCustomerBrainStatus: vi.fn(),
    fetchCompanyCortexStatus: vi.fn(),
    getAgentBrainStatusBatch: vi.fn(),
    listMembers: vi.fn(),
    routerPush: vi.fn(),
    routerReplace: vi.fn(),
  }
})

function createSupabaseMock() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'rina@example.com',
            user_metadata: {},
          },
        },
      }),
    },
    from: vi.fn((table: string) => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        in: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => {
          if (table === 'ns_brains') return { data: { id: 'brain-user' }, error: null }
          if (table === 'profiles') {
            return {
              data: {
                full_name: 'Rina Person',
                avatar_url: 'https://example.com/rina.png',
              },
              error: null,
            }
          }
          return { data: null, error: null }
        }),
        then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      }
      return builder
    }),
  }
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    replace: mocks.routerReplace,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createSupabaseMock(),
}))

vi.mock('@/lib/utils/impersonation-storage', () => ({
  getImpersonationFromStorage: () => null,
}))

vi.mock('@/features/brain/services/brain.service', () => ({
  fetchCustomerBrainStatus: mocks.fetchCustomerBrainStatus,
  fetchCompanyCortexStatus: mocks.fetchCompanyCortexStatus,
  setCustomerBrainEnabled: vi.fn(),
}))

vi.mock('@/features/mission-control/services/missions.service', () => ({
  fetchMissionAgents: mocks.fetchMissionAgents,
}))

vi.mock('@/lib/agents', () => ({
  fetchMissionAgents: mocks.fetchMissionAgents,
  useTeam2Perms: () => ({
    isAdmin: true,
    canEditAgent: () => true,
  }),
}))

vi.mock('@/features/org/services/org.service', () => ({
  orgService: {
    listMembers: mocks.listMembers,
  },
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: mocks.useOrgStore,
}))

vi.mock('@/lib/org', () => ({
  orgService: {
    listMembers: mocks.listMembers,
  },
  useOrgStore: mocks.useOrgStore,
}))

vi.mock('@/features/settings/services/billing-api', () => ({
  billingApi: {
    getAgentBrainStatusBatch: mocks.getAgentBrainStatusBatch,
  },
}))

vi.mock('@/lib/billing/billing-api', () => ({
  billingApi: {
    getAgentBrainStatusBatch: mocks.getAgentBrainStatusBatch,
  },
}))

vi.mock('@/features/studio/services/campaign.service', () => ({
  fetchCampaigns: mocks.fetchCampaigns,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaigns: mocks.fetchCampaigns,
}))

vi.mock('@/features/team-2/hooks/use-team2-perms', () => ({
  useTeam2Perms: () => ({
    isAdmin: true,
    canEditAgent: () => true,
  }),
}))

function BrainScopeHookHarness() {
  const { scopeOptions, agentsWithoutBrain, loading } = useBrainScopeNavOptions()
  const { trainable, loading: trainableLoading } = useTrainableBrains()
  const { getMenuContext } = useBrainScopeMenuActions()
  const agentOption = scopeOptions.find((option) => option.scopeType === 'agent') ?? null
  const agentMenuContext = getMenuContext(agentOption)

  return (
    <div
      data-testid="brain-scope-hook-harness"
      data-loading={String(loading || trainableLoading)}
      data-scope-labels={scopeOptions.map((option) => option.label).join('|')}
      data-agents-without-brain={agentsWithoutBrain.map((agent) => agent.name).join('|')}
      data-trainable-labels={trainable.map((target) => target.label).join('|')}
      data-can-manage-agent={String(agentMenuContext.canManageAgent)}
    >
      <button type="button" onClick={agentMenuContext.onOpenAgentChat}>
        Open agent chat
      </button>
    </div>
  )
}

describe('Brain scope shared boundaries', () => {
  beforeEach(() => {
    cachedBrainScopeNav.invalidate()
    mocks.fetchMissionAgents.mockResolvedValue([mocks.atlasAgent, mocks.mayaAgent])
    mocks.fetchCampaigns.mockResolvedValue([])
    mocks.fetchCustomerBrainStatus.mockResolvedValue({ enabled: false, brain_id: null })
    mocks.fetchCompanyCortexStatus.mockResolvedValue(null)
    mocks.getAgentBrainStatusBatch.mockResolvedValue([
      { agentId: 'maya', hasBrain: true, brainId: 'brain-agent-maya' },
    ])
    mocks.listMembers.mockResolvedValue({ members: [] })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads Brain scope options and agent menu permissions without render churn', async () => {
    render(<BrainScopeHookHarness />)

    await waitFor(() => {
      expect(screen.getByTestId('brain-scope-hook-harness').dataset.scopeLabels).toContain(
        'Rina Person',
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('brain-scope-hook-harness').dataset.scopeLabels).toContain('Maya')
    })
    await waitFor(() => {
      expect(screen.getByTestId('brain-scope-hook-harness').dataset.canManageAgent).toBe('true')
    })

    expect(screen.getByTestId('brain-scope-hook-harness').dataset.trainableLabels).toContain(
      'Maya',
    )
    expect(mocks.getAgentBrainStatusBatch).toHaveBeenCalledWith(['maya'])

    screen.getByText('Open agent chat').click()
    expect(mocks.routerPush).toHaveBeenCalledWith('/team?agent=maya&tab=chat')
  })
})
