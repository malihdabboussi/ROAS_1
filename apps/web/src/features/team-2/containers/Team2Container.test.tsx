import { Profiler } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { Team2Container } from './Team2Container'

const mocks = vi.hoisted(() => ({
  pathname: '/team',
  replace: vi.fn(),
  push: vi.fn(),
  searchParams: new URLSearchParams(''),
  useTeamContainerData: vi.fn(),
  useTeamContainerDerived: vi.fn(),
  useTeamContainerHandlers: vi.fn(),
  useTeams: vi.fn(),
  renameAgent: vi.fn(),
  updateAgentActive: vi.fn(),
  updateAgentCommunication: vi.fn(),
  setFocusedAgent: vi.fn(),
  setAgentsContext: vi.fn(),
  getAgentMenuContext: vi.fn(),
  canEditAgent: vi.fn(() => true),
  canManageSystemPreferences: vi.fn(() => false),
  canAllowExtra: vi.fn(() => true),
  canMoveAgentBetweenTeams: vi.fn(() => true),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
    push: mocks.push,
  }),
  usePathname: () => mocks.pathname,
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text: string }) => <div data-testid="loading-orb">{text}</div>,
}))

vi.mock('@/lib/org', () => ({
  useAccountContextGate: () => ({
    isAccountContextReady: true,
    isPersonalAccountContext: false,
    isOrgAccountContext: true,
  }),
}))

vi.mock('@/features/team/components/chat/AgentInfoPanel', () => ({
  AgentInfoPanel: ({
    selected,
    infoPanelTab,
  }: {
    selected: MissionAgent
    infoPanelTab: string
  }) => (
    <div data-testid="agent-info-panel">
      {selected.name}:{infoPanelTab}
    </div>
  ),
}))

vi.mock('@/features/team/containers/TeamModals', () => ({
  TeamModals: ({
    selected,
    showReadyEmployees,
  }: {
    selected: MissionAgent | null
    showReadyEmployees: boolean
  }) => (
    <div data-testid="team-modals">
      {selected?.name ?? 'none'}:{String(showReadyEmployees)}
    </div>
  ),
}))

vi.mock('@/features/team-2/hooks/use-team2-perms', () => ({
  useTeam2Perms: () => ({
    canEditAgent: mocks.canEditAgent,
    canManageSystemPreferences: mocks.canManageSystemPreferences,
    canAllowExtra: mocks.canAllowExtra,
    canMoveAgentBetweenTeams: mocks.canMoveAgentBetweenTeams,
  }),
}))

vi.mock('@/lib/agents', () => ({
  renameAgent: mocks.renameAgent,
  updateAgentActive: mocks.updateAgentActive,
  updateAgentCommunication: mocks.updateAgentCommunication,
  useTeamContainerData: mocks.useTeamContainerData,
  useAgentMenuActions: () => ({
    getAgentMenuContext: mocks.getAgentMenuContext,
  }),
  useTeamContainerDerived: mocks.useTeamContainerDerived,
  useTeamContainerHandlers: mocks.useTeamContainerHandlers,
  useTeams: mocks.useTeams,
}))

vi.mock('../store/use-team-focus-store', () => ({
  useTeamFocusStore: (
    selector: (state: {
      setFocusedAgent: typeof mocks.setFocusedAgent
      setAgentsContext: typeof mocks.setAgentsContext
    }) => unknown,
  ) =>
    selector({
      setFocusedAgent: mocks.setFocusedAgent,
      setAgentsContext: mocks.setAgentsContext,
    }),
}))

vi.mock('../components/AgentsGrid', () => ({
  AgentsGrid: ({
    agents,
    teamFilterId,
  }: {
    agents: MissionAgent[]
    teamFilterId: string | null
  }) => (
    <div data-testid="agents-grid">
      agents:{agents.length}:team:{teamFilterId ?? 'none'}
    </div>
  ),
}))

vi.mock('../components/Team2DetailView', () => ({
  Team2DetailView: ({
    agent,
    infoPanel,
  }: {
    agent: MissionAgent
    infoPanel: (onRequestCollapse: () => void) => React.ReactNode
  }) => (
    <div data-testid="team2-detail-view">
      detail:{agent.name}
      {infoPanel(() => undefined)}
    </div>
  ),
}))

vi.mock('../components/nav/Team2ManageShell', () => ({
  Team2ManageShell: ({
    section,
    selectedTeamId,
    children,
  }: {
    section: string
    selectedTeamId: string | null
    children: React.ReactNode
  }) => (
    <section data-testid="team2-manage-shell">
      section:{section}:team:{selectedTeamId ?? 'none'}
      {children}
    </section>
  ),
}))

vi.mock('../components/teams/TeamDetailView', () => ({
  TeamDetailView: ({ teamId }: { teamId: string }) => (
    <div data-testid="team-detail-view">team:{teamId}</div>
  ),
}))

vi.mock('../components/teams/TeamsIndexView', () => ({
  TeamsIndexView: () => <div data-testid="teams-index-view">teams-index</div>,
}))

vi.mock('./HumanDMContainer', () => ({
  HumanDMContainer: ({ targetUserId }: { targetUserId: string }) => (
    <div data-testid="human-dm-container">dm:{targetUserId}</div>
  ),
}))

vi.mock('./TeamHrSideChatLayout', () => ({
  TeamHrSideChatLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="team-hr-side-chat-layout">{children}</div>
  ),
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

function buildData(overrides: Record<string, unknown> = {}) {
  const agents = [
    agent(),
    agent({
      id: 'agent-2',
      agent_key: 'hr',
      name: 'HR',
      level: 'system',
    }),
  ]
  const noop = vi.fn()
  return {
    agents,
    missions: [],
    selected: agents[0],
    selectedAgentKey: 'agent-1',
    loading: false,
    generatingAvatarIds: new Set<string>(),
    editingName: false,
    setEditingName: noop,
    nameValue: '',
    setNameValue: noop,
    campaigns: [],
    nonGeneralCampaigns: [],
    assignedCampaigns: [],
    campaignLoading: false,
    campaignActionLoading: false,
    campaignError: null,
    skillsLoading: false,
    agentSkills: [],
    agentWorkflows: [],
    skillsError: null,
    showUpgradeModal: false,
    setShowUpgradeModal: noop,
    hasBrain: false,
    brainLoading: false,
    brainError: null,
    selectedModelId: 'auto',
    modelOptions: [{ id: 'auto', label: 'Auto' }],
    communicationSaving: false,
    communicationError: null,
    modelDropdownOpen: false,
    setModelDropdownOpen: noop,
    modelDropdownRef: { current: null },
    modelDropdownBtnRef: { current: null },
    modelDropdownPos: null,
    channelsLoading: false,
    channels: [],
    setChannels: noop,
    channelDisconnecting: null,
    setChannelDisconnecting: noop,
    slackDisconnecting: null,
    setSlackDisconnecting: noop,
    setShowTelegramSetup: noop,
    setShowSlackSetup: noop,
    preferredChannel: null,
    setPreferredChannel: noop,
    channelSaving: false,
    setChannelSaving: noop,
    digestEnabled: false,
    setDigestEnabled: noop,
    digestSaving: false,
    setDigestSaving: noop,
    digestTime: '09:00',
    setDigestTime: noop,
    digestDropdownOpen: false,
    setDigestDropdownOpen: noop,
    digestDropdownBtnRef: { current: null },
    digestDropdownPos: null,
    userPublicSlug: null,
    setUserPublicSlug: noop,
    setAgents: noop,
    setSelectedId: noop,
    setShowFireConfirm: noop,
    setFireError: noop,
    hireFilterRef: { current: null },
    hireFilterParam: null,
    showReadyEmployees: false,
    setShowReadyEmployees: noop,
    showTelegramSetup: false,
    showSlackSetup: false,
    showFireConfirm: false,
    checkoutLoading: false,
    firingEmployee: false,
    fireError: null,
    fireBrainTotal: null,
    fireBrainLoading: false,
    fireHandoff: null,
    setFireHandoff: noop,
    generalCampaignId: 'campaign-general',
    loadAgents: vi.fn().mockResolvedValue(undefined),
    loadChannels: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function buildDerived(overrides: Record<string, unknown> = {}) {
  return {
    statusBadgeText: 'Online',
    bio: 'Research agent',
    blockedCount: 0,
    activeCount: 1,
    todoCount: 2,
    totalCompleted: 3,
    completedThisMonth: 1,
    successRate: 90,
    avgCompletionRate: 80,
    missionsScored: 4,
    lastActiveLabel: 'Today',
    level: 'manager',
    hasStats: true,
    overallColor: 'green',
    overall: 91,
    metrics: [],
    stats: {},
    isSelectedRemovable: true,
    isSelectedManager: true,
    isSystemLikeAgent: false,
    cLevelCount: 0,
    managerCount: 1,
    employeeCount: 0,
    idleMembersCount: 0,
    activeMembersCount: 1,
    ...overrides,
  }
}

function buildHandlers(overrides: Record<string, unknown> = {}) {
  const noop = vi.fn().mockResolvedValue(undefined)
  return {
    handleGeneratePortrait: noop,
    handleNameSave: noop,
    handleNameClick: noop,
    handleAssignCampaign: noop,
    handleUnassignCampaign: noop,
    handleCommunicationStrategyChange: noop,
    handleCommunicationModelChange: noop,
    handleVoiceChange: noop,
    handleCommunicationStyleChange: noop,
    handleAddBrain: noop,
    handleFireEmployee: noop,
    refreshAssignmentsForAgent: noop,
    ...overrides,
  }
}

function mockMenuContext() {
  const noop = vi.fn().mockResolvedValue(undefined)
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
    canMoveTeam: true,
    canRename: true,
    canDeactivate: true,
    canFireAgent: true,
    canManageCampaigns: true,
    canFavorite: true,
    isFavorite: false,
    onToggleFavorite: noop,
    showAccess: true,
    hasBrain: false,
    fireLabel: 'Fire',
    isSystemLikeAgent: false,
  }
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('Team2Container', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams('')
    mocks.useTeamContainerData.mockReturnValue(buildData())
    mocks.useTeamContainerDerived.mockReturnValue(buildDerived())
    mocks.useTeamContainerHandlers.mockReturnValue(buildHandlers())
    mocks.getAgentMenuContext.mockReturnValue(mockMenuContext())
    mocks.renameAgent.mockResolvedValue(agent())
    mocks.updateAgentActive.mockResolvedValue(agent())
    mocks.updateAgentCommunication.mockResolvedValue(agent())
    mocks.useTeams.mockReturnValue({
      teams: [
        {
          id: 'team-growth',
          name: 'Growth Team',
          color: 'blue',
          icon: 'users',
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

  it('renders the agents grid branch and keeps modal wiring stable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commitCount = 0

    try {
      render(
        <Profiler id="team2-container-grid" onRender={() => commitCount++}>
          <Team2Container />
        </Profiler>,
      )

      expect(screen.getByTestId('team2-manage-shell').textContent).toContain('section:agents')
      expect(screen.getByTestId('agents-grid').textContent).toContain('agents:2:team:none')
      expect(screen.getByTestId('team-modals').textContent).toContain('Atlas:false')

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commitCount).toBeLessThan(12)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('renders selected agent detail, publishes detail context, and handles fire intent once', async () => {
    const data = buildData()
    mocks.useTeamContainerData.mockReturnValue(data)
    mocks.searchParams = new URLSearchParams('agent=agent-1&panel=communication&fire=1')
    let commitCount = 0

    render(
      <Profiler id="team2-container-detail" onRender={() => commitCount++}>
        <Team2Container />
      </Profiler>,
    )

    await flushAsyncWork()

    expect(screen.getByTestId('team2-detail-view').textContent).toContain('detail:Atlas')
    expect(screen.getByTestId('agent-info-panel').textContent).toContain('Atlas:communication')
    await waitFor(() =>
      expect(mocks.setAgentsContext).toHaveBeenCalledWith(
        expect.objectContaining({
          panel: 'agent-communication',
          view: 'detail',
          selectedAgentKey: 'agent-1',
          selectedAgent: expect.objectContaining({
            agent_key: 'agent-1',
            showAccessTab: true,
          }),
        }),
      ),
    )
    expect(data.setSelectedId).toHaveBeenCalledWith('agent-1')
    expect(data.setShowFireConfirm).toHaveBeenCalledWith(true)
    expect(mocks.replace).toHaveBeenCalledWith('/team?agent=agent-1&panel=communication', {
      scroll: false,
    })
    expect(commitCount).toBeLessThan(18)
  })

  it('renders the org team detail branch from the teams section route', () => {
    mocks.searchParams = new URLSearchParams('section=teams&team=team-growth')

    render(<Team2Container />)

    expect(screen.getByTestId('team2-manage-shell').textContent).toContain('section:teams')
    expect(screen.getByTestId('team-detail-view').textContent).toContain('team:team-growth')
    expect(screen.queryByTestId('agents-grid')).toBeNull()
  })
})
