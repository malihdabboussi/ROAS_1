import { Profiler, type ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent, MissionAgentSkill, MissionAgentWorkflow } from '@/lib/agents'
import type { AgentChannel } from '@/lib/agents/agent-channels'
import type { Campaign } from '@/lib/campaigns'
import type { LlmModelOption } from '@/lib/chat'
import type { Mission } from '@/lib/missions'
import { useTeamContainerData } from './useTeamContainerData'

const mocks = vi.hoisted(() => ({
  activeOrgId: null as string | null,
  backendGet: vi.fn(),
  backfillBrainScholar: vi.fn(),
  backfillMissingAvatars: vi.fn(),
  cachedAgentsMutate: vi.fn(),
  cachedFetch: vi.fn(),
  channelOn: vi.fn(),
  channelSubscribe: vi.fn(),
  createClient: vi.fn(),
  createNewConversation: vi.fn(),
  fetchAgentCampaignAssignments: vi.fn(),
  fetchAgentSkills: vi.fn(),
  fetchAgentWorkflows: vi.fn(),
  fetchAwarenessPoints: vi.fn(),
  fetchBrainHealth: vi.fn(),
  fetchCampaigns: vi.fn(),
  fetchLlmModels: vi.fn(),
  fetchMissionAgents: vi.fn(),
  fetchMissions: vi.fn(),
  getAgentBrainStatus: vi.fn(),
  getOrCreateAgentConversation: vi.fn(),
  invalidateCachedFetch: vi.fn(),
  listAgentChannels: vi.fn(),
  markAgentOnboardingComplete: vi.fn(),
  markAwarenessPointsReadAll: vi.fn(),
  removeChannel: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(''),
  sendMessageStreaming: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/team',
  useRouter: () => ({
    replace: mocks.replace,
  }),
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/lib/brain', () => ({
  fetchBrainHealth: mocks.fetchBrainHealth,
}))

vi.mock('@/lib/agents/mission-agents-api', () => ({
  backfillBrainScholar: mocks.backfillBrainScholar,
  backfillMissingAvatars: mocks.backfillMissingAvatars,
  fetchAgentSkills: mocks.fetchAgentSkills,
  fetchAgentWorkflows: mocks.fetchAgentWorkflows,
  fetchAwarenessPoints: mocks.fetchAwarenessPoints,
  fetchMissionAgents: mocks.fetchMissionAgents,
  fetchMissions: mocks.fetchMissions,
  markAgentOnboardingComplete: mocks.markAgentOnboardingComplete,
  markAwarenessPointsReadAll: mocks.markAwarenessPointsReadAll,
}))

vi.mock('@/lib/agents/use-mission-agents', () => ({
  cachedAgents: {
    mutate: mocks.cachedAgentsMutate,
  },
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string | null }) => unknown) =>
    selector({ activeOrgId: mocks.activeOrgId }),
}))

vi.mock('@/lib/billing/billing-api', () => ({
  billingApi: {
    getAgentBrainStatus: mocks.getAgentBrainStatus,
  },
}))

vi.mock('@/lib/campaigns', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaigns')>()),
  fetchAgentCampaignAssignments: mocks.fetchAgentCampaignAssignments,
  fetchCampaigns: mocks.fetchCampaigns,
}))

vi.mock('@/lib/missions', () => ({
  fetchMissions: mocks.fetchMissions,
}))

vi.mock('@/lib/chat/llm-models-api', () => ({
  fetchLlmModels: mocks.fetchLlmModels,
}))

vi.mock('@/lib/chat/studio-chat-runtime-adapter', () => ({
  createNewConversation: mocks.createNewConversation,
  getOrCreateAgentConversation: mocks.getOrCreateAgentConversation,
  sendMessageStreaming: mocks.sendMessageStreaming,
}))

vi.mock('@/lib/agents/agent-channels-api', () => ({
  listAgentChannels: mocks.listAgentChannels,
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: mocks.backendGet,
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: mocks.cachedFetch,
  invalidateCachedFetch: mocks.invalidateCachedFetch,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: mocks.createClient,
}))

function agentFixture(overrides: Partial<MissionAgent> = {}): MissionAgent {
  return {
    id: 'vibey-id',
    user_id: 'user-1',
    agent_key: 'vibey',
    name: 'ROAS',
    role: 'Founder',
    status: 'online',
    skills: [],
    level: 'system',
    specialty: null,
    image_url: null,
    is_active: true,
    team_id: null,
    config: { model_id: 'auto' },
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-24T10:00:00.000Z',
    ...overrides,
  }
}

function campaignFixture(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-general',
    user_id: 'user-1',
    name: 'General',
    campaign_type: 'marketing',
    status: 'active',
    config: { system_kind: 'general' },
    metrics: {},
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-24T10:00:00.000Z',
    ...overrides,
  }
}

function missionFixture(overrides: Partial<Mission> = {}): Mission {
  return {
    id: 'mission-1',
    user_id: 'user-1',
    parent_mission_id: null,
    campaign_id: null,
    title: 'Mission',
    brief: null,
    description: null,
    status: 'todo',
    priority: 'medium',
    assigned_agent_key: 'atlas',
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
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-24T10:00:00.000Z',
    started_at: null,
    completed_at: null,
    ...overrides,
  }
}

const modelOption: LlmModelOption = {
  id: 'model-pro',
  provider: 'openrouter',
  modelName: 'model/pro',
  label: 'Model Pro',
  contextWindow: 128000,
  maxOutputTokens: 8192,
  supportsImages: true,
  inputModalities: ['text'],
  outputModalities: ['text'],
  supportedParameters: [],
  contextOptions: [],
  reasoningLevels: [],
  speedModes: ['standard'],
  pricing: {},
  pricingTiers: [],
}

function renderDataHook(onRender?: () => void) {
  return renderHook(() => useTeamContainerData(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Profiler id="team-container-data" onRender={onRender ?? (() => undefined)}>
        {children}
      </Profiler>
    ),
  })
}

function setupSupabase() {
  const channel = {
    on: mocks.channelOn.mockImplementation(() => channel),
    subscribe: mocks.channelSubscribe.mockImplementation(() => channel),
  }
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    channel: vi.fn(() => channel),
    removeChannel: mocks.removeChannel,
    from: vi.fn(),
  }
  mocks.createClient.mockReturnValue(supabase)
  return { channel, supabase }
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useTeamContainerData', () => {
  beforeEach(() => {
    mocks.activeOrgId = null
    mocks.searchParams = new URLSearchParams('agent=atlas&session=session-1')
    window.localStorage.clear()
    window.sessionStorage.clear()
    setupSupabase()

    const agents = [
      agentFixture(),
      agentFixture({
        id: 'atlas-id',
        agent_key: 'atlas',
        name: 'Atlas',
        role: 'Research',
        level: 'manager',
        image_url: '/atlas.png',
        config: { model_id: 'model-pro' },
      }),
    ]
    const campaigns = [
      campaignFixture(),
      campaignFixture({
        id: 'campaign-launch',
        name: 'Launch',
        config: {},
      }),
    ]

    mocks.cachedFetch.mockImplementation((_key: string, fetcher: () => Promise<unknown>) =>
      fetcher(),
    )
    mocks.fetchMissionAgents.mockResolvedValue(agents)
    mocks.fetchMissions.mockResolvedValue([missionFixture()])
    mocks.backfillBrainScholar.mockResolvedValue({ ok: true, created: false })
    mocks.backfillMissingAvatars.mockResolvedValue({ ok: true, triggered: 0 })
    mocks.fetchCampaigns.mockResolvedValue(campaigns)
    mocks.fetchAgentCampaignAssignments.mockResolvedValue(['campaign-launch'])
    mocks.fetchBrainHealth.mockResolvedValue({ total_memories: 4 })
    mocks.getAgentBrainStatus.mockResolvedValue({ hasBrain: true })
    mocks.fetchAgentSkills.mockResolvedValue([
      { id: 'skill-1', name: 'Research', skill_key: 'research' },
    ] as MissionAgentSkill[])
    mocks.fetchAgentWorkflows.mockResolvedValue([
      { id: 'workflow-1', name: 'Discovery', workflow_key: 'discovery' },
    ] as MissionAgentWorkflow[])
    mocks.fetchLlmModels.mockResolvedValue([modelOption])
    mocks.listAgentChannels.mockResolvedValue([
      {
        id: 'channel-1',
        agent_key: 'atlas',
        channel_type: 'telegram',
        is_active: true,
        is_public: false,
      },
    ] as AgentChannel[])
    mocks.backendGet.mockResolvedValue({ public_agent_slug: 'public-user' })
    mocks.fetchAwarenessPoints.mockResolvedValue([])
    mocks.getOrCreateAgentConversation.mockResolvedValue({ id: 'conversation-1' })
    mocks.createNewConversation.mockResolvedValue({ id: 'conversation-2' })
    mocks.sendMessageStreaming.mockResolvedValue('conversation-1')
    mocks.markAgentOnboardingComplete.mockResolvedValue({ config: {} })
    mocks.markAwarenessPointsReadAll.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads selected agent data from URL state and stays render-stable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commitCount = 0

    try {
      const { result } = renderDataHook(() => commitCount++)

      await waitFor(() => expect(result.current.loading).toBe(false))
      await waitFor(() => expect(result.current.assignedCampaigns).toHaveLength(1))
      await flushAsyncWork()

      expect(result.current.selectedAgentKey).toBe('atlas')
      expect(result.current.selected?.name).toBe('Atlas')
      expect(result.current.selectedSessionId).toBe('session-1')
      expect(result.current.missions).toHaveLength(1)
      expect(result.current.nonGeneralCampaigns.map((campaign) => campaign.name)).toEqual([
        'Launch',
      ])
      expect(result.current.generalCampaignId).toBe('campaign-general')
      expect(result.current.assignedCampaigns.map((campaign) => campaign.id)).toEqual([
        'campaign-launch',
      ])
      expect(result.current.hasBrain).toBe(true)
      expect(result.current.agentSkills.map((skill) => skill.name)).toEqual(['Research'])
      expect(result.current.agentWorkflows.map((workflow) => workflow.name)).toEqual(['Discovery'])
      expect(result.current.modelOptions).toEqual([modelOption])
      expect(result.current.selectedModelId).toBe('model-pro')
      expect(result.current.channels.map((channel) => channel.id)).toEqual(['channel-1'])
      expect(result.current.userPublicSlug).toBe('public-user')
      expect(mocks.cachedAgentsMutate).toHaveBeenCalledWith(result.current.agents)
      expect(mocks.channelOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          table: 'agents_registry',
          filter: 'user_id=eq.user-1',
        }),
        expect.any(Function),
      )
      expect(mocks.replace).not.toHaveBeenCalled()

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commitCount).toBeLessThan(35)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('syncs the Team query when selection changes after initial load', async () => {
    mocks.searchParams = new URLSearchParams('')
    const { result } = renderDataHook()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.selectedAgentKey).toBe('vibey')

    await act(async () => {
      result.current.setSelectedId('atlas-id')
    })

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith('/team?agent=atlas', { scroll: false }),
    )
    expect(result.current.selectedSessionId).toBeNull()
  })
})
