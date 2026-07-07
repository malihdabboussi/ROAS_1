import { Profiler, type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents'
import type { Campaign } from '@/lib/campaigns'
import { useTeamContainerHandlers } from './useTeamContainerHandlers'

const mocks = vi.hoisted(() => ({
  assignAgentToCampaign: vi.fn(),
  createAgentBrainCheckout: vi.fn(),
  fetchAgentCampaignAssignments: vi.fn(),
  fireEmployee: vi.fn(),
  generateImageStream: vi.fn(),
  renameAgent: vi.fn(),
  reportTeamError: vi.fn(),
  unassignAgentFromCampaign: vi.fn(),
  updateAgentCommunication: vi.fn(),
  updateAgentImage: vi.fn(),
}))

vi.mock('@/features/mission-control/services/missions.service', () => ({
  fireEmployee: mocks.fireEmployee,
  renameAgent: mocks.renameAgent,
  updateAgentCommunication: mocks.updateAgentCommunication,
  updateAgentImage: mocks.updateAgentImage,
}))

vi.mock('@/lib/agents/mission-agents-api', () => ({
  fireEmployee: mocks.fireEmployee,
  renameAgent: mocks.renameAgent,
  updateAgentCommunication: mocks.updateAgentCommunication,
  updateAgentImage: mocks.updateAgentImage,
}))

vi.mock('@/features/settings/services/billing-api', () => ({
  billingApi: {
    createAgentBrainCheckout: mocks.createAgentBrainCheckout,
  },
}))

vi.mock('@/lib/billing/billing-api', () => ({
  billingApi: {
    createAgentBrainCheckout: mocks.createAgentBrainCheckout,
  },
}))

vi.mock('@/features/studio/services/campaign.service', () => ({
  assignAgentToCampaign: mocks.assignAgentToCampaign,
  fetchAgentCampaignAssignments: mocks.fetchAgentCampaignAssignments,
  unassignAgentFromCampaign: mocks.unassignAgentFromCampaign,
}))

vi.mock('@/lib/campaigns', () => ({
  assignAgentToCampaign: mocks.assignAgentToCampaign,
  fetchAgentCampaignAssignments: mocks.fetchAgentCampaignAssignments,
  unassignAgentFromCampaign: mocks.unassignAgentFromCampaign,
}))

vi.mock('@/features/team/lib/report-team-error', () => ({
  reportTeamError: mocks.reportTeamError,
}))

vi.mock('@/lib/agents/report-agent-error', () => ({
  reportTeamError: mocks.reportTeamError,
  teamErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}))

vi.mock('@/lib/services/media-api', () => ({
  generateImageStream: mocks.generateImageStream,
}))

function agentFixture(overrides: Partial<MissionAgent> = {}): MissionAgent {
  return {
    id: 'agent-1',
    user_id: 'user-1',
    agent_key: 'agent-1',
    name: 'Agent One',
    role: 'Research',
    status: 'online',
    skills: [],
    level: 'manager',
    specialty: null,
    image_url: null,
    is_active: true,
    team_id: null,
    config: {},
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-23T10:00:00.000Z',
    ...overrides,
  }
}

function campaignFixture(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-1',
    user_id: 'user-1',
    name: 'Launch',
    campaign_type: 'marketing',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-23T10:00:00.000Z',
    ...overrides,
  }
}

function buildData(overrides: Record<string, unknown> = {}) {
  const selected = agentFixture()
  return {
    selectedAgentKey: selected.agent_key,
    selected,
    agents: [selected],
    nonGeneralCampaigns: [campaignFixture({ id: 'campaign-2', name: 'Launch Two' })],
    assignedCampaigns: [],
    nameValue: selected.name,
    generatingAvatarIds: new Set<string>(),
    fireBrainTotal: null,
    fireHandoff: null,
    carouselRef: { current: null },
    beginTeamSessionUrlDismiss: vi.fn(),
    loadAgents: vi.fn().mockResolvedValue(undefined),
    setAgentInfoOpen: vi.fn(),
    setAgents: vi.fn(),
    setAssignedCampaigns: vi.fn(),
    setBrainError: vi.fn(),
    setCampaignActionLoading: vi.fn(),
    setCampaignError: vi.fn(),
    setCampaignPanelOpen: vi.fn(),
    setCheckoutLoading: vi.fn(),
    setCommunicationError: vi.fn(),
    setCommunicationSaving: vi.fn(),
    setEditingName: vi.fn(),
    setFireError: vi.fn(),
    setFiringEmployee: vi.fn(),
    setGeneratingAvatarIds: vi.fn(),
    setHasBrain: vi.fn(),
    setModelDropdownOpen: vi.fn(),
    setNameValue: vi.fn(),
    setSelectedId: vi.fn(),
    setSelectedSessionId: vi.fn(),
    setShowFireConfirm: vi.fn(),
    setShowUpgradeModal: vi.fn(),
    syncTeamQuery: vi.fn(),
    ...overrides,
  }
}

function renderHandlers(data: ReturnType<typeof buildData>, onRender?: () => void) {
  return renderHook(() => useTeamContainerHandlers(data as never), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Profiler id="team-container-handlers" onRender={onRender ?? (() => undefined)}>
        {children}
      </Profiler>
    ),
  })
}

describe('useTeamContainerHandlers', () => {
  beforeEach(() => {
    mocks.assignAgentToCampaign.mockResolvedValue(undefined)
    mocks.createAgentBrainCheckout.mockResolvedValue({})
    mocks.fetchAgentCampaignAssignments.mockResolvedValue([])
    mocks.fireEmployee.mockResolvedValue({ deleted: true })
    mocks.generateImageStream.mockResolvedValue(null)
    mocks.renameAgent.mockResolvedValue(agentFixture())
    mocks.unassignAgentFromCampaign.mockResolvedValue(undefined)
    mocks.updateAgentCommunication.mockResolvedValue(
      agentFixture({ config: { model_id: 'model-pro' } }),
    )
    mocks.updateAgentImage.mockResolvedValue(agentFixture())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('updates communication settings and stays render-stable', async () => {
    const data = buildData()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commitCount = 0

    try {
      const { result, rerender } = renderHandlers(data, () => commitCount++)
      rerender()

      await act(async () => {
        await result.current.handleCommunicationModelChange('model-pro')
      })

      expect(mocks.updateAgentCommunication).toHaveBeenCalledWith('agent-1', {
        model_id: 'model-pro',
      })
      expect(data.setCommunicationSaving).toHaveBeenNthCalledWith(1, true)
      expect(data.setCommunicationSaving).toHaveBeenLastCalledWith(false)
      expect(data.setCommunicationError).toHaveBeenCalledWith(null)
      expect(data.setAgents).toHaveBeenCalledTimes(1)

      const updateAgents = data.setAgents.mock.calls[0]?.[0] as (
        agents: MissionAgent[],
      ) => MissionAgent[]
      expect(updateAgents([agentFixture({ config: { model_id: 'old-model' } })])[0]?.config).toEqual(
        {
          model_id: 'model-pro',
        },
      )
      expect(
        consoleError.mock.calls.filter((call) =>
          call.some((part) => String(part).includes('Maximum update depth')),
        ),
      ).toHaveLength(0)
      expect(commitCount).toBeLessThan(5)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('assigns campaigns and preserves the core-agent unassign guard', async () => {
    const launchTwo = campaignFixture({ id: 'campaign-2', name: 'Launch Two' })
    const data = buildData({ nonGeneralCampaigns: [launchTwo] })
    mocks.fetchAgentCampaignAssignments.mockResolvedValue(['campaign-2'])
    const { result } = renderHandlers(data)

    await act(async () => {
      await result.current.handleAssignCampaign('campaign-2')
    })

    expect(mocks.assignAgentToCampaign).toHaveBeenCalledWith('campaign-2', 'agent-1')
    expect(mocks.fetchAgentCampaignAssignments).toHaveBeenCalledWith('agent-1')
    expect(data.setAssignedCampaigns).toHaveBeenCalledWith([launchTwo])
    expect(data.setCampaignActionLoading).toHaveBeenNthCalledWith(1, true)
    expect(data.setCampaignActionLoading).toHaveBeenLastCalledWith(false)

    const coreData = buildData({
      selectedAgentKey: 'vibey',
      selected: agentFixture({ agent_key: 'vibey' }),
    })
    const core = renderHandlers(coreData)

    await act(async () => {
      await core.result.current.handleUnassignCampaign('campaign-2')
    })

    expect(mocks.unassignAgentFromCampaign).not.toHaveBeenCalled()
    expect(coreData.setCampaignError).toHaveBeenCalledWith(
      'Vibey and Atlas are always assigned to every campaign.',
    )
  })

  it('fires removable employees with handoff data and ignores system-like agents', async () => {
    const handoff = { scope: 'default' as const }
    const data = buildData({ fireBrainTotal: 3, fireHandoff: handoff })
    const { result } = renderHandlers(data)

    await act(async () => {
      await result.current.handleFireEmployee()
    })

    expect(mocks.fireEmployee).toHaveBeenCalledWith('agent-1', handoff)
    expect(data.setFiringEmployee).toHaveBeenNthCalledWith(1, true)
    expect(data.setFiringEmployee).toHaveBeenLastCalledWith(false)
    expect(data.setShowFireConfirm).toHaveBeenCalledWith(false)
    expect(data.loadAgents).toHaveBeenCalledTimes(1)

    mocks.fireEmployee.mockClear()
    const systemData = buildData({
      selected: agentFixture({ agent_key: 'vibey', level: 'manager' }),
      selectedAgentKey: 'vibey',
    })
    const system = renderHandlers(systemData)

    await act(async () => {
      await system.result.current.handleFireEmployee()
    })

    expect(mocks.fireEmployee).not.toHaveBeenCalled()
    expect(systemData.setFiringEmployee).not.toHaveBeenCalled()
  })
})
