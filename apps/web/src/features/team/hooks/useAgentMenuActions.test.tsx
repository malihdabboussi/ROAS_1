import { Profiler, type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents'
import { useAgentMenuActions } from './useAgentMenuActions'

const mocks = vi.hoisted(() => ({
  cachedAgentsReload: vi.fn(),
  cachedFetch: vi.fn(),
  fetchCampaigns: vi.fn(),
  getAgentBrainStatusBatch: vi.fn(),
  openInNewTab: vi.fn(),
  push: vi.fn(),
  renameAgent: vi.fn(),
  setAgentTeam: vi.fn(),
  toggleFavorite: vi.fn(),
  updateAgentActive: vi.fn(),
  useAgentUserState: vi.fn(),
  useTeams: vi.fn(),
  writeText: vi.fn(),
  canEditAgent: vi.fn(),
  canFireAgent: vi.fn(),
  canMoveAgentBetweenTeams: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: mocks.cachedFetch,
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

vi.mock('@/lib/campaigns', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaigns')>()),
  fetchCampaigns: mocks.fetchCampaigns,
}))

vi.mock('@/features/mission-control/services/missions.service', () => ({
  renameAgent: mocks.renameAgent,
  updateAgentActive: mocks.updateAgentActive,
}))

vi.mock('@/lib/agents/mission-agents-api', () => ({
  renameAgent: mocks.renameAgent,
  updateAgentActive: mocks.updateAgentActive,
}))

vi.mock('@/features/team-2/hooks/use-team2-perms', () => ({
  useTeam2Perms: () => ({
    isPersonal: false,
    canEditAgent: mocks.canEditAgent,
    canFireAgent: mocks.canFireAgent,
    canMoveAgentBetweenTeams: mocks.canMoveAgentBetweenTeams,
  }),
}))

vi.mock('@/lib/agents/use-agent-team-permissions', () => ({
  useTeam2Perms: () => ({
    isPersonal: false,
    canEditAgent: mocks.canEditAgent,
    canFireAgent: mocks.canFireAgent,
    canMoveAgentBetweenTeams: mocks.canMoveAgentBetweenTeams,
  }),
}))

vi.mock('./use-agent-user-state', () => ({
  useAgentUserState: mocks.useAgentUserState,
}))

vi.mock('@/lib/agents/use-agent-user-state', () => ({
  useAgentUserState: mocks.useAgentUserState,
}))

vi.mock('@/lib/agents', () => ({
  cachedAgents: {
    reload: mocks.cachedAgentsReload,
  },
  setAgentTeam: mocks.setAgentTeam,
  useTeams: mocks.useTeams,
}))

vi.mock('@/lib/agents/use-agent-teams', () => ({
  useTeams: mocks.useTeams,
}))

vi.mock('@/lib/agents/agent-teams-api', () => ({
  setAgentTeam: mocks.setAgentTeam,
}))

vi.mock('@/lib/agents/use-mission-agents', () => ({
  cachedAgents: {
    reload: mocks.cachedAgentsReload,
  },
}))

vi.mock('@/lib/utils/open-in-new-tab', () => ({
  openInNewTab: mocks.openInNewTab,
}))

function agentFixture(overrides: Partial<MissionAgent> = {}): MissionAgent {
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
    config: {},
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

function renderMenuActions(onRender?: () => void) {
  return renderHook(() => useAgentMenuActions(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Profiler id="agent-menu-actions" onRender={onRender ?? (() => undefined)}>
        {children}
      </Profiler>
    ),
  })
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useAgentMenuActions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.cachedAgentsReload.mockResolvedValue(undefined)
    mocks.cachedFetch.mockImplementation((_key, fetcher) => fetcher())
    mocks.fetchCampaigns.mockResolvedValue([
      {
        id: 'general',
        user_id: 'user-1',
        name: 'General',
        campaign_type: 'marketing',
        status: 'active',
        config: { is_general: true },
        metrics: {},
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-24T00:00:00.000Z',
      },
      {
        id: 'campaign-1',
        user_id: 'user-1',
        name: 'Launch',
        campaign_type: 'marketing',
        status: 'active',
        config: {},
        metrics: {},
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-24T00:00:00.000Z',
      },
    ])
    mocks.getAgentBrainStatusBatch.mockResolvedValue([
      { agentId: 'agent-1', hasBrain: true, brainId: 'brain-1' },
    ])
    mocks.renameAgent.mockResolvedValue(agentFixture({ name: 'Renamed' }))
    mocks.setAgentTeam.mockResolvedValue({ agent_key: 'agent-1', team_id: 'team-growth' })
    mocks.toggleFavorite.mockResolvedValue(undefined)
    mocks.updateAgentActive.mockResolvedValue(agentFixture({ is_active: false }))
    mocks.useAgentUserState.mockReturnValue({
      favoriteIds: new Set(['agent-1']),
      toggleFavorite: mocks.toggleFavorite,
    })
    mocks.useTeams.mockReturnValue({
      teams: [{ id: 'team-growth', name: 'Growth' }],
    })
    mocks.canEditAgent.mockReturnValue(true)
    mocks.canFireAgent.mockReturnValue(true)
    mocks.canMoveAgentBetweenTeams.mockReturnValue(true)
    mocks.writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mocks.writeText },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('builds menu actions, loads shared menu data, and stays render-stable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commitCount = 0

    try {
      const { result, rerender } = renderMenuActions(() => commitCount++)
      rerender()
      await flushAsyncWork()

      const agent = agentFixture()
      const ctx = result.current.getAgentMenuContext(agent)

      expect(result.current.nonGeneralCampaigns.map((campaign) => campaign.name)).toEqual([
        'Launch',
      ])
      expect(result.current.teamOptions).toEqual([{ id: 'team-growth', name: 'Growth' }])
      expect(ctx.isFavorite).toBe(true)
      expect(ctx.canRename).toBe(true)
      expect(ctx.canMoveTeam).toBe(true)
      expect(ctx.canFireAgent).toBe(true)
      expect(ctx.fireLabel).toBe('Remove manager')
      expect(ctx.showAccess).toBe(true)
      expect(ctx.hasBrain).toBe(false)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      await flushAsyncWork()

      expect(mocks.getAgentBrainStatusBatch).toHaveBeenCalledWith(['agent-1'])
      expect(result.current.getAgentMenuContext(agent).hasBrain).toBe(true)

      await act(async () => {
        await ctx.onSelectTeam('agent-1', 'team-growth')
      })
      expect(mocks.setAgentTeam).toHaveBeenCalledWith('agent-1', 'team-growth')
      expect(mocks.cachedAgentsReload).toHaveBeenCalledTimes(1)

      await act(async () => {
        await ctx.onToggleFavorite()
      })
      expect(mocks.toggleFavorite).toHaveBeenCalledWith(agent)

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commitCount).toBeLessThan(8)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('preserves command callbacks and brain activation updates', async () => {
    const setupEvents: unknown[] = []
    window.addEventListener('brain-setup-agent', (event) =>
      setupEvents.push((event as CustomEvent).detail),
    )
    const { result } = renderMenuActions()
    await flushAsyncWork()

    const agent = agentFixture({
      id: 'agent-activated',
      agent_key: 'agent-activated',
    })
    const actions = result.current.getMenuActions(agent)

    await act(async () => {
      actions.onCopyId()
      await Promise.resolve()
    })
    expect(mocks.writeText).toHaveBeenCalledWith('agent-activated')

    actions.onOpenInNewTab()
    expect(mocks.openInNewTab).toHaveBeenCalledWith('/team?agent=agent-activated')

    actions.onOpenComms()
    expect(mocks.push).toHaveBeenCalledWith('/team?agent=agent-activated&panel=communication')

    actions.onOpenBrain()
    expect(mocks.openInNewTab).toHaveBeenCalledWith('/brain?scope=agent%3Aagent-activated')

    actions.onSetupBrain()
    expect(setupEvents).toEqual([{ agentKey: 'agent-activated', agentName: 'Atlas' }])

    actions.onDeactivate()
    await flushAsyncWork()
    expect(mocks.updateAgentActive).toHaveBeenCalledWith('agent-activated', false)
    expect(mocks.cachedAgentsReload).toHaveBeenCalledTimes(1)

    expect(result.current.getAgentMenuContext(agent).hasBrain).toBe(false)
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('brain-agent-activated', { detail: { agentKey: 'agent-activated' } }),
      )
    })
    expect(result.current.getAgentMenuContext(agent).hasBrain).toBe(true)
  })

  it('renames agents through the shared reload path', async () => {
    const { result } = renderMenuActions()

    await act(async () => {
      await result.current.handleRename('agent-1', 'Renamed')
    })

    expect(mocks.renameAgent).toHaveBeenCalledWith('agent-1', 'Renamed')
    expect(mocks.cachedAgentsReload).toHaveBeenCalledTimes(1)
  })
})
