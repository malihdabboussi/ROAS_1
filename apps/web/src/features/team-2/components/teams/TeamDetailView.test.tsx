import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamDetailView } from './TeamDetailView'

const mocks = vi.hoisted(() => ({
  pathname: '/team/teams/team-1',
  replace: vi.fn(),
  push: vi.fn(),
  searchParams: new URLSearchParams(''),
  listTeams: vi.fn(),
  listTeamGrants: vi.fn(),
  fetchMissionAgents: vi.fn(),
  listTeamMembers: vi.fn(),
  listTeamExternalMembers: vi.fn(),
  fetchSlackPeople: vi.fn(),
  fetchMissions: vi.fn(),
  backendGet: vi.fn(),
  fetchCampaigns: vi.fn(),
  fetchSpaces: vi.fn(),
  addTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
  setAgentTeam: vi.fn(),
  setTeamGrants: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  canEditTeam: vi.fn(() => true),
  canManageTeamMembers: vi.fn(() => true),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
    push: mocks.push,
  }),
  usePathname: () => mocks.pathname,
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/features/mission-control/services/missions.service', () => ({
  fetchMissionAgents: mocks.fetchMissionAgents,
  fetchMissions: mocks.fetchMissions,
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

vi.mock('@/features/studio/services/campaign.service', () => ({
  fetchCampaigns: mocks.fetchCampaigns,
}))

vi.mock('@/features/spaces/services/spaces.service', () => ({
  fetchSpaces: mocks.fetchSpaces,
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: mocks.backendGet,
}))

vi.mock('@/lib/agents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agents')>()
  return {
    ...actual,
    addTeamMember: mocks.addTeamMember,
    deleteTeam: mocks.deleteTeam,
    listTeamGrants: mocks.listTeamGrants,
    listTeamMembers: mocks.listTeamMembers,
    listTeamExternalMembers: mocks.listTeamExternalMembers,
    listTeams: mocks.listTeams,
    removeTeamMember: mocks.removeTeamMember,
    setAgentTeam: mocks.setAgentTeam,
    setTeamGrants: mocks.setTeamGrants,
    updateTeam: mocks.updateTeam,
    fetchMissionAgents: mocks.fetchMissionAgents,
  }
})

vi.mock('@/lib/missions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/missions')>()
  return {
    ...actual,
    fetchMissions: mocks.fetchMissions,
  }
})

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

vi.mock('../../services/slack-people.service', () => ({
  fetchSlackPeople: mocks.fetchSlackPeople,
}))

vi.mock('@/lib/campaigns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/campaigns')>()
  return {
    ...actual,
    fetchCampaigns: mocks.fetchCampaigns,
  }
})

vi.mock('@/lib/spaces', () => ({
  fetchSpaces: mocks.fetchSpaces,
}))

vi.mock('../../hooks/use-team2-perms', () => ({
  useTeam2Perms: () => ({
    canEditTeam: mocks.canEditTeam,
    canManageTeamMembers: mocks.canManageTeamMembers,
  }),
}))

vi.mock('./TeamOverviewView', () => ({
  TeamOverviewView: ({ teamId }: { teamId: string }) => (
    <div data-testid="team-overview-view">Overview {teamId}</div>
  ),
}))

vi.mock('./TeamAnalyticsView', () => ({
  TeamAnalyticsView: ({
    teamId,
    members,
    humanMembers,
  }: {
    teamId: string
    members: unknown[]
    humanMembers: unknown[]
  }) => (
    <div data-testid="team-analytics-view">
      Analytics {teamId} agents:{members.length} humans:{humanMembers.length}
    </div>
  ),
}))

vi.mock('./TeamAccessView', () => ({
  TeamAccessView: ({ canEditTeam }: { canEditTeam: boolean }) => (
    <div data-testid="team-access-view">Access {canEditTeam ? 'editable' : 'readonly'}</div>
  ),
}))

function team(overrides: Record<string, unknown> = {}) {
  return {
    id: 'team-1',
    org_id: 'org-1',
    user_id: null,
    parent_team_id: null,
    name: 'Growth Team',
    color: 'blue',
    icon: 'users',
    is_system: false,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-23T00:00:00.000Z',
    ...overrides,
  }
}

function missionAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agent-row-1',
    user_id: 'owner-1',
    agent_key: 'agent-1',
    name: 'Atlas',
    role: 'Research',
    status: 'online',
    skills: [],
    image_url: null,
    team_id: 'team-1',
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-23T00:00:00.000Z',
    ...overrides,
  }
}

function humanMember(overrides: Record<string, unknown> = {}) {
  return {
    team_id: 'team-1',
    user_id: 'user-1',
    added_at: '2026-06-01T00:00:00.000Z',
    added_by: null,
    role: 'owner',
    full_name: 'Sefy',
    avatar_url: null,
    email: 'sefy@example.com',
    ...overrides,
  }
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('TeamDetailView', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams('')
    mocks.replace.mockClear()
    mocks.push.mockClear()
    mocks.listTeams.mockResolvedValue([team()])
    mocks.listTeamGrants.mockResolvedValue([
      {
        id: 1,
        team_id: 'team-1',
        capability_kind: 'integration',
        capability_id: 'slack',
        mode: 'allow',
        metadata: {},
        created_at: '2026-06-01T00:00:00.000Z',
      },
    ])
    mocks.fetchMissionAgents.mockResolvedValue([
      missionAgent(),
      missionAgent({
        id: 'agent-row-2',
        agent_key: 'agent-2',
        name: 'Nova',
        team_id: null,
      }),
    ])
    mocks.listTeamMembers.mockResolvedValue([humanMember()])
    mocks.listTeamExternalMembers.mockResolvedValue([])
    mocks.fetchSlackPeople.mockResolvedValue({ connected: true, people: [] })
    mocks.fetchMissions.mockResolvedValue([
      {
        id: 'mission-1',
        user_id: 'owner-1',
        parent_mission_id: null,
        campaign_id: 'campaign-1',
        title: 'Launch mission',
        brief: null,
        description: null,
        status: 'done',
        priority: 'medium',
        assigned_agent_key: 'agent-1',
        current_agent_key: null,
        progress_notes: null,
        plan_id: null,
        correlation_id: 'correlation-1',
        idempotency_key: 'idempotency-1',
        retry_count: 0,
        input: {},
        output: {},
        error: null,
        scheduled_at: null,
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
        started_at: null,
        completed_at: '2026-06-23T00:00:00.000Z',
      },
    ])
    mocks.backendGet.mockResolvedValue({
      success: true,
      members: [
        {
          id: 'member-2',
          user_id: 'user-2',
          role: 'creator',
          profiles: {
            full_name: 'Jamie',
            email: 'jamie@example.com',
            avatar_url: null,
          },
        },
      ],
    })
    mocks.fetchCampaigns.mockResolvedValue([
      {
        id: 'campaign-1',
        user_id: 'owner-1',
        name: 'Launch Campaign',
        campaign_type: 'standard',
        status: 'active',
        config: {},
        metrics: {},
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-23T00:00:00.000Z',
      },
    ])
    mocks.fetchSpaces.mockResolvedValue([
      {
        id: 'space-1',
        title: 'Launch Space',
        campaign_id: 'campaign-1',
        schema: { icon: 'layout-grid', icon_color: 'default' },
      },
    ])
    mocks.addTeamMember.mockResolvedValue(humanMember({ user_id: 'user-2' }))
    mocks.removeTeamMember.mockResolvedValue({ deleted: true })
    mocks.setAgentTeam.mockResolvedValue({ agent_key: 'agent-2', team_id: 'team-1' })
    mocks.setTeamGrants.mockResolvedValue([])
    mocks.updateTeam.mockImplementation(async (_teamId: string, patch: Record<string, unknown>) =>
      team(patch),
    )
    mocks.deleteTeam.mockResolvedValue({ deleted: true, reassigned_to_team_id: null })
    mocks.canEditTeam.mockReturnValue(true)
    mocks.canManageTeamMembers.mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('loads team detail data, opens add-member picker, and stays render-stable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let renderCount = 0

    function Harness() {
      renderCount += 1
      return <TeamDetailView teamId="team-1" />
    }

    try {
      render(<Harness />)
      await flushAsyncWork()

      await waitFor(() => expect(screen.getByTestId('team-overview-view')).toBeTruthy())
      expect(screen.getByText('Growth Team')).toBeTruthy()
      expect(screen.getByText('Sefy')).toBeTruthy()
      expect(screen.getByText('Atlas')).toBeTruthy()
      const membersSidebar = screen.getByText('Sefy').closest('aside')
      expect(membersSidebar).toHaveClass('h-spacing-48', 'w-full', 'md:w-72')
      expect(membersSidebar?.parentElement).toHaveClass('flex-col', 'md:flex-row')
      expect(mocks.backendGet).toHaveBeenCalledWith('/api/org/org-1/members')
      expect(mocks.fetchMissions).toHaveBeenCalledWith({ limit: 200 })

      fireEvent.click(screen.getByRole('button', { name: 'Add members' }))
      await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy())
      expect(screen.getByText('Internal people')).toBeTruthy()
      expect(screen.getByText('Jamie')).toBeTruthy()
      expect(screen.getByText('Nova')).toBeTruthy()

      fireEvent.click(screen.getByText('Jamie'))
      await flushAsyncWork()
      expect(mocks.addTeamMember).toHaveBeenCalledWith('team-1', 'user-2')

      fireEvent.click(screen.getByRole('button', { name: 'Analytics' }))
      expect(mocks.replace).toHaveBeenCalledWith('/team/teams/team-1?tab=analytics', {
        scroll: false,
      })

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(renderCount).toBeLessThan(30)
    } finally {
      consoleError.mockRestore()
    }
  })
})
