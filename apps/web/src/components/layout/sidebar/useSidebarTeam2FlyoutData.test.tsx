import { Profiler, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentTeam, MissionAgentSidebar } from '@/lib/agents'
import { useSidebarTeam2FlyoutData } from './useSidebarTeam2FlyoutData'

const mocks = vi.hoisted(() => ({
  cachedFetch: vi.fn(),
  create: vi.fn(),
  createClient: vi.fn(),
  favoriteIds: new Set<string>(),
  getAgentMenuContext: vi.fn(),
  handleRename: vi.fn(),
  hasMinRole: vi.fn(),
  invalidateCachedFetch: vi.fn(),
  listMembers: vi.fn(),
  markDmRead: vi.fn(),
  reicon: vi.fn(),
  recolor: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
  searchParams: new URLSearchParams(''),
  sortAgentsForTeamDmList: vi.fn(),
  useAccountContextGate: vi.fn(),
  useCachedMissionAgents: vi.fn(),
  useDmList: vi.fn(),
  useDmUnread: vi.fn(),
  useOrgPeople: vi.fn(),
  useOrgStore: vi.fn(),
  useSidebarTeam2Bootstrap: vi.fn(),
  useTeam2Perms: vi.fn(),
  useTeams: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/lib/agents', () => ({
  sortAgentsForTeamDmList: mocks.sortAgentsForTeamDmList,
  useAgentMenuActions: () => ({
    favoriteIds: mocks.favoriteIds,
    getAgentMenuContext: mocks.getAgentMenuContext,
    handleRename: mocks.handleRename,
  }),
  useCachedMissionAgents: mocks.useCachedMissionAgents,
  useDmList: mocks.useDmList,
  useDmUnread: mocks.useDmUnread,
  useTeam2Perms: mocks.useTeam2Perms,
  useTeams: mocks.useTeams,
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: mocks.cachedFetch,
  invalidateCachedFetch: mocks.invalidateCachedFetch,
}))

vi.mock('@/lib/org', () => ({
  orgService: {
    listMembers: mocks.listMembers,
  },
  useAccountContextGate: mocks.useAccountContextGate,
  useOrgPeople: mocks.useOrgPeople,
  useOrgStore: mocks.useOrgStore,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: mocks.createClient,
}))

vi.mock('./useSidebarTeam2Bootstrap', () => ({
  useSidebarTeam2Bootstrap: mocks.useSidebarTeam2Bootstrap,
}))

function teamFixture(overrides: Partial<AgentTeam> = {}): AgentTeam {
  return {
    id: 'team-growth',
    org_id: 'org-1',
    user_id: null,
    parent_team_id: null,
    name: 'Growth',
    color: 'default',
    icon: 'users',
    is_system: false,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

function agentFixture(overrides: Partial<MissionAgentSidebar> = {}): MissionAgentSidebar {
  return {
    id: 'agent-1',
    agent_key: 'atlas',
    name: 'Atlas',
    image_url: null,
    is_active: true,
    status: 'online',
    updated_at: '2026-06-24T00:00:00.000Z',
    level: 'employee',
    team_id: null,
    role: 'Research',
    sort_order: 1,
    ...overrides,
  }
}

function renderFlyoutData(pathname = '/team?dm=user-2', onRender?: () => void) {
  return renderHook(() => useSidebarTeam2FlyoutData({ pathname }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Profiler id="sidebar-team2-flyout-data" onRender={onRender ?? (() => undefined)}>
        {children}
      </Profiler>
    ),
  })
}

describe('useSidebarTeam2FlyoutData', () => {
  beforeEach(() => {
    mocks.favoriteIds = new Set(['agent-2'])
    mocks.searchParams = new URLSearchParams('agent=atlas')
    mocks.useAccountContextGate.mockReturnValue({
      isAccountContextReady: true,
      isPersonalAccountContext: false,
      isOrgAccountContext: true,
    })
    mocks.useSidebarTeam2Bootstrap.mockReturnValue({ loading: false, error: null })
    mocks.useTeam2Perms.mockReturnValue({
      canEditTeam: vi.fn(() => true),
      canManageTeamMembers: vi.fn(() => true),
    })
    mocks.hasMinRole.mockReturnValue(true)
    mocks.useOrgStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        activeOrgId: 'org-1',
        hasMinRole: mocks.hasMinRole,
      }),
    )
    mocks.useTeams.mockReturnValue({
      teams: [
        teamFixture({ id: 'team-z', name: 'Zeta' }),
        teamFixture({ id: 'team-general', name: 'General', is_system: true }),
        teamFixture({ id: 'team-a', name: 'Alpha' }),
      ],
      loading: false,
      create: mocks.create,
      rename: mocks.rename,
      recolor: mocks.recolor,
      reicon: mocks.reicon,
      remove: mocks.remove,
    })
    mocks.useCachedMissionAgents.mockReturnValue({
      data: [
        agentFixture({ id: 'agent-1', agent_key: 'atlas', name: 'Atlas' }),
        agentFixture({ id: 'agent-2', agent_key: 'beta', name: 'Beta' }),
      ],
      loading: false,
    })
    mocks.sortAgentsForTeamDmList.mockImplementation((agents) => [...agents].reverse())
    mocks.useOrgPeople.mockReturnValue({
      people: [
        {
          user_id: 'user-2',
          display_name: 'Mira',
          avatar_url: null,
          status_emoji: null,
          status_text: null,
          org_role: 'admin',
          last_dm_at: null,
        },
      ],
      loading: false,
    })
    mocks.useDmList.mockReturnValue({
      dms: [
        { conversation_id: 'dm-1', partner: { id: 'user-2' } },
        { conversation_id: 'dm-2', partner: { id: 'user-3' } },
      ],
    })
    mocks.useDmUnread.mockReturnValue({
      counts: { 'dm-1': 3, 'dm-2': 0 },
      markRead: mocks.markDmRead,
    })
    mocks.cachedFetch.mockResolvedValue({
      success: true,
      members: [
        {
          id: 'member-1',
          user_id: 'user-2',
          role: 'admin',
          status: 'active',
          accepted_at: null,
          created_at: '2026-06-24T00:00:00.000Z',
          profiles: null,
        },
      ],
    })
    mocks.createClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'current-user' } } },
        }),
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('keeps org bootstrap cache-only reads until fallback fetch is needed', () => {
    mocks.useSidebarTeam2Bootstrap.mockReturnValue({ loading: true, error: null })

    const { result } = renderFlyoutData()

    expect(result.current.showOrgCollaboration).toBe(true)
    expect(result.current.fallbackFetch).toBe(false)
    expect(result.current.bootstrapLoading).toBe(true)
    expect(mocks.useSidebarTeam2Bootstrap).toHaveBeenCalledWith(true)
    expect(mocks.useTeams).toHaveBeenCalledWith(false)
    expect(mocks.useCachedMissionAgents).toHaveBeenCalledWith(false)
    expect(mocks.useOrgPeople).toHaveBeenCalledWith(false)
    expect(mocks.useDmList).toHaveBeenCalledWith(false)
    expect(mocks.useDmUnread).toHaveBeenCalledWith(false)
  })

  it('enables direct resource fetches when bootstrap errors and derives route data', () => {
    mocks.useSidebarTeam2Bootstrap.mockReturnValue({ loading: false, error: 'failed' })

    const { result } = renderFlyoutData()

    expect(result.current.fallbackFetch).toBe(true)
    expect(result.current.sortedTeams.map((team) => team.id)).toEqual([
      'team-general',
      'team-a',
      'team-z',
    ])
    expect(result.current.sortedAgents.map((agent) => agent.id)).toEqual(['agent-2', 'agent-1'])
    expect(result.current.unreadByPartnerId).toEqual({ 'user-2': 3 })
    expect(result.current.activeAgentKey).toBe('atlas')
    expect(result.current.activeDmUserId).toBe('user-2')
    expect(mocks.sortAgentsForTeamDmList).toHaveBeenCalledWith(
      expect.any(Array),
      mocks.favoriteIds,
    )
    expect(mocks.useTeams).toHaveBeenCalledWith(true)
    expect(mocks.useCachedMissionAgents).toHaveBeenCalledWith(true)
    expect(mocks.useOrgPeople).toHaveBeenCalledWith(true)
    expect(mocks.useDmList).toHaveBeenCalledWith(true)
    expect(mocks.useDmUnread).toHaveBeenCalledWith(true)
  })

  it('loads admin org members through the keyed cache and supports forced reloads', async () => {
    const { result } = renderFlyoutData()

    await waitFor(() => {
      expect(result.current.getMemberByUserId('user-2')?.id).toBe('member-1')
    })

    expect(mocks.cachedFetch).toHaveBeenCalledWith(
      'org-members:org-1',
      expect.any(Function),
      { ttlMs: 60_000 },
    )

    await act(async () => {
      await result.current.loadOrgMembers({ force: true })
    })

    expect(mocks.invalidateCachedFetch).toHaveBeenCalledWith('org-members:org-1')
    expect(mocks.cachedFetch).toHaveBeenCalledTimes(2)
  })

  it('loads current user id and marks the active person DM as read without render churn', async () => {
    let commits = 0
    const { result, rerender } = renderFlyoutData('/team?dm=user-2', () => {
      commits += 1
    })

    await waitFor(() => {
      expect(result.current.currentUserId).toBe('current-user')
    })

    await act(async () => {
      await result.current.markPersonDmRead('user-2')
    })

    rerender()

    expect(mocks.markDmRead).toHaveBeenCalledWith('dm-1')
    expect(commits).toBeLessThan(8)
  })
})
